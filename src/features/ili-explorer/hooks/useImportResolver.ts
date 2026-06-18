import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWithDependencies, type ImportLoadResult, type ImportSummary } from '../services/imports/importLoader';
import { fetchAllIndexes, clearRepositoryCache, type RepositoryIndex } from '../services/imports/repositoryIndex';
import { getAllRepos, type RepoSpec } from '../services/imports/repoSeeds';
import { loadOverrides, saveOverride, removeOverride as removeOverrideStore, type OverrideEntry } from '../services/imports/userOverrides';
import { resolveModel, type ResolutionResult } from '../services/imports/modelResolver';
import { readFileAsText } from '../../../common/utils/readFileAsText';

const AUTO_ENABLED_KEY = 'modvis.autoImportEnabled';

function readAutoEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(AUTO_ENABLED_KEY);
  return raw === null ? false : raw === 'true';
}

function writeAutoEnabled(v: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(AUTO_ENABLED_KEY, v ? 'true' : 'false'); } catch { /* ignore */ }
}

export interface UseImportResolverReturn {
  isResolving: boolean;
  lastResult: ImportLoadResult | null;
  lastSummary: ImportSummary | null;
  overrides: Map<string, OverrideEntry>;
  singleFetched: Map<string, ResolutionResult>;
  hiddenImports: Set<string>;
  autoImportEnabled: boolean;
  setAutoImportEnabled: (v: boolean) => void;
  repos: RepoSpec[];
  indexes: RepositoryIndex[];
  resolveAll: (primary: { name: string; content: string }) => Promise<ImportLoadResult>;
  fetchSingleModel: (modelName: string) => Promise<ResolutionResult>;
  removeSingleFetched: (modelName: string) => void;
  toggleHidden: (modelName: string) => void;
  uploadOverride: (modelName: string, file: File) => Promise<void>;
  uploadOverrideContent: (modelName: string, fileName: string, content: string) => void;
  removeOverride: (modelName: string) => void;
  refreshRepoIndex: () => Promise<void>;
  setRepos: (repos: RepoSpec[]) => void;
}

export function useImportResolver(): UseImportResolverReturn {
  const [isResolving, setIsResolving] = useState(false);
  const [lastResult, setLastResult] = useState<ImportLoadResult | null>(null);
  const [overrides, setOverrides] = useState<Map<string, OverrideEntry>>(() => loadOverrides());
  const [autoEnabled, setAutoEnabledState] = useState<boolean>(() => readAutoEnabled());
  const [repos, setReposState] = useState<RepoSpec[]>(() => getAllRepos());
  const [indexes, setIndexes] = useState<RepositoryIndex[]>([]);
  const [singleFetched, setSingleFetched] = useState<Map<string, ResolutionResult>>(() => new Map());
  const [hiddenImports, setHiddenImports] = useState<Set<string>>(() => new Set());

  const overridesRef = useRef(overrides);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);

  const singleFetchedRef = useRef(singleFetched);
  useEffect(() => { singleFetchedRef.current = singleFetched; }, [singleFetched]);

  const hiddenImportsRef = useRef(hiddenImports);
  useEffect(() => { hiddenImportsRef.current = hiddenImports; }, [hiddenImports]);

  const reposRef = useRef(repos);
  useEffect(() => { reposRef.current = repos; }, [repos]);

  const setAutoImportEnabled = useCallback((v: boolean) => {
    setAutoEnabledState(v);
    writeAutoEnabled(v);
  }, []);

  const setRepos = useCallback((next: RepoSpec[]) => {
    setReposState(next);
  }, []);

  const resolveAll = useCallback(async (primary: { name: string; content: string }) => {
    setIsResolving(true);
    try {
      const ovMap = new Map<string, { fileName: string; content: string }>();
      for (const [k, v] of overridesRef.current) {
        ovMap.set(k, { fileName: v.fileName, content: v.content });
      }
      // Wenn Auto-Import aus ist: keine Remote-Repos durchsuchen. Manual-Uploads
      // (Overrides) und eingebettete Standard-Libraries werden trotzdem aufgelöst.
      const result = await loadWithDependencies(primary, {
        overrides: ovMap,
        singleFetched: singleFetchedRef.current,
        repos: autoEnabled ? reposRef.current : [],
      });
      setLastResult(result);
      return result;
    } finally {
      setIsResolving(false);
    }
  }, [autoEnabled]);

  const fetchSingleModel = useCallback(async (modelName: string): Promise<ResolutionResult> => {
    setIsResolving(true);
    try {
      // Indexe sicherstellen — wenn der globale Auto-Import aus ist, sind sie
      // beim Open noch nicht gefetcht worden.
      const fresh = await fetchAllIndexes(reposRef.current, false);
      setIndexes(fresh);
      // Auto-Fetch hat Vorrang vor einem ggf. existierenden Manual-Upload:
      // wir entfernen den Override, damit die per-model Auto-Quelle gewinnt.
      const ovMap = new Map<string, { fileName: string; content: string }>();
      for (const [k, v] of overridesRef.current) {
        if (k === modelName) continue;
        ovMap.set(k, { fileName: v.fileName, content: v.content });
      }
      const result = await resolveModel(modelName, {
        overrides: ovMap,
        singleFetched: singleFetchedRef.current,
        indexes: fresh,
      });
      if (result.status === 'auto' || result.status === 'stdlib') {
        // Mutex: Override entfernen, falls vorhanden — sync (Ref) und persistent
        if (overridesRef.current.has(modelName)) {
          removeOverrideStore(modelName);
          const nextOv = new Map(overridesRef.current);
          nextOv.delete(modelName);
          overridesRef.current = nextOv;
          setOverrides(nextOv);
        }
        // singleFetched aktualisieren — Ref synchron, damit ein sofortiger
        // onReload() den neuen Eintrag direkt sieht.
        const nextSingle = new Map(singleFetchedRef.current);
        nextSingle.set(modelName, result);
        singleFetchedRef.current = nextSingle;
        setSingleFetched(nextSingle);
      }
      return result;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const removeSingleFetched = useCallback((modelName: string) => {
    const next = new Map(singleFetchedRef.current);
    next.delete(modelName);
    singleFetchedRef.current = next;
    setSingleFetched(next);
  }, []);

  const toggleHidden = useCallback((modelName: string) => {
    const next = new Set(hiddenImportsRef.current);
    if (next.has(modelName)) next.delete(modelName);
    else next.add(modelName);
    hiddenImportsRef.current = next;
    setHiddenImports(next);
  }, []);

  const uploadOverrideContent = useCallback((modelName: string, fileName: string, content: string) => {
    const entry: OverrideEntry = { fileName, content, uploadedAt: Date.now() };
    saveOverride(modelName, entry);
    const nextOv = new Map(overridesRef.current);
    nextOv.set(modelName, entry);
    overridesRef.current = nextOv;
    setOverrides(nextOv);
    // Mutex: ein per-model Auto-Fetch wird durch das manuelle Hochladen ersetzt.
    if (singleFetchedRef.current.has(modelName)) {
      const nextSingle = new Map(singleFetchedRef.current);
      nextSingle.delete(modelName);
      singleFetchedRef.current = nextSingle;
      setSingleFetched(nextSingle);
    }
  }, []);

  const uploadOverride = useCallback(async (modelName: string, file: File) => {
    const content = await readFileAsText(file);
    uploadOverrideContent(modelName, file.name, content);
  }, [uploadOverrideContent]);

  const removeOverride = useCallback((modelName: string) => {
    removeOverrideStore(modelName);
    const next = new Map(overridesRef.current);
    next.delete(modelName);
    overridesRef.current = next;
    setOverrides(next);
  }, []);

  const refreshRepoIndex = useCallback(async () => {
    clearRepositoryCache();
    setIsResolving(true);
    try {
      const fresh = await fetchAllIndexes(reposRef.current, true);
      setIndexes(fresh);
    } finally {
      setIsResolving(false);
    }
  }, []);

  return {
    isResolving,
    lastResult,
    lastSummary: lastResult?.summary ?? null,
    overrides,
    singleFetched,
    hiddenImports,
    autoImportEnabled: autoEnabled,
    setAutoImportEnabled,
    repos,
    indexes,
    resolveAll,
    fetchSingleModel,
    removeSingleFetched,
    toggleHidden,
    uploadOverride,
    uploadOverrideContent,
    removeOverride,
    refreshRepoIndex,
    setRepos,
  };
}
