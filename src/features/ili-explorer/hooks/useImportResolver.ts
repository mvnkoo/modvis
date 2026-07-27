import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWithDependencies, type ImportLoadResult, type ImportSummary } from '../services/imports/importLoader';
import { fetchAllIndexes, fetchRepositoryIndex, clearRepositoryCache, readCachedIndex, type RepositoryIndex } from '../services/imports/repositoryIndex';
import { getAllRepos, type RepoSpec } from '../services/imports/repoSeeds';
import { loadOverrides, saveOverride, removeOverride as removeOverrideStore, type OverrideEntry } from '../services/imports/userOverrides';
import { resolveModel, type ResolutionResult } from '../services/imports/modelResolver';
import { readFileAsText } from '../../../common/utils/readFileAsText';

const AUTO_ENABLED_KEY = 'modvis.autoImportEnabled';
const IMPORTS_ENABLED_KEY = 'modvis.importsEnabled';

function readBool(key: string, fallback: boolean): boolean {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

function writeBool(key: string, v: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(key, v ? 'true' : 'false'); } catch { /* ignore */ }
}

export interface UseImportResolverReturn {
  isResolving: boolean;
  lastResult: ImportLoadResult | null;
  lastSummary: ImportSummary | null;
  overrides: Map<string, OverrideEntry>;
  singleFetched: Map<string, ResolutionResult>;
  hiddenImports: Set<string>;
  importsEnabled: boolean;
  setImportsEnabled: (v: boolean) => void;
  autoImportEnabled: boolean;
  setAutoImportEnabled: (v: boolean) => void;
  repos: RepoSpec[];
  indexes: RepositoryIndex[];
  resolveAll: (primary: { name: string; content: string }) => Promise<ImportLoadResult>;
  fetchSingleModel: (modelName: string, preferredRepoId?: string) => Promise<ResolutionResult>;
  /** Cached: in welchen Repos liegt das Modell laut Index? Kein Netz-Verkehr. */
  availabilityFor: (modelName: string) => RepoSpec[];
  removeSingleFetched: (modelName: string) => void;
  toggleHidden: (modelName: string) => void;
  getHiddenImports: () => Set<string>;
  uploadOverride: (modelName: string, file: File) => Promise<void>;
  uploadOverrideContent: (modelName: string, fileName: string, content: string) => void;
  removeOverride: (modelName: string) => void;
  refreshRepoIndex: () => Promise<void>;
  ensureIndexes: () => Promise<void>;
  probeSingleRepo: (repo: RepoSpec) => Promise<RepositoryIndex>;
  setRepos: (repos: RepoSpec[]) => void;
}

export function useImportResolver(): UseImportResolverReturn {
  const [isResolving, setIsResolving] = useState(false);
  const [lastResult, setLastResult] = useState<ImportLoadResult | null>(null);
  const [overrides, setOverrides] = useState<Map<string, OverrideEntry>>(() => loadOverrides());
  const [autoEnabled, setAutoEnabledState] = useState<boolean>(() => readBool(AUTO_ENABLED_KEY, false));
  const [importsEnabled, setImportsEnabledState] = useState<boolean>(() => readBool(IMPORTS_ENABLED_KEY, false));
  const [repos, setReposState] = useState<RepoSpec[]>(() => getAllRepos());
  const [indexes, setIndexes] = useState<RepositoryIndex[]>([]);
  const [singleFetched, setSingleFetched] = useState<Map<string, ResolutionResult>>(() => new Map());
  const [hiddenImports, setHiddenImports] = useState<Set<string>>(() => new Set());
  const [userUnloaded, setUserUnloaded] = useState<Set<string>>(() => new Set());

  const overridesRef = useRef(overrides);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);

  const singleFetchedRef = useRef(singleFetched);
  useEffect(() => { singleFetchedRef.current = singleFetched; }, [singleFetched]);

  const hiddenImportsRef = useRef(hiddenImports);
  useEffect(() => { hiddenImportsRef.current = hiddenImports; }, [hiddenImports]);

  const userUnloadedRef = useRef(userUnloaded);
  useEffect(() => { userUnloadedRef.current = userUnloaded; }, [userUnloaded]);

  const reposRef = useRef(repos);
  useEffect(() => { reposRef.current = repos; }, [repos]);

  const setAutoImportEnabled = useCallback((v: boolean) => {
    setAutoEnabledState(v);
    writeBool(AUTO_ENABLED_KEY, v);
  }, []);

  const setImportsEnabled = useCallback((v: boolean) => {
    setImportsEnabledState(v);
    writeBool(IMPORTS_ENABLED_KEY, v);
  }, []);

  const importsEnabledRef = useRef(importsEnabled);
  useEffect(() => { importsEnabledRef.current = importsEnabled; }, [importsEnabled]);

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
      const reposActive = importsEnabledRef.current && autoEnabled;
      const result = await loadWithDependencies(primary, {
        overrides: ovMap,
        singleFetched: singleFetchedRef.current,
        repos: reposActive ? reposRef.current : [],
        skipNames: userUnloadedRef.current,
      });
      setLastResult(result);
      return result;
    } finally {
      setIsResolving(false);
    }
  }, [autoEnabled]);

  const fetchSingleModel = useCallback(async (modelName: string, preferredRepoId?: string): Promise<ResolutionResult> => {
    if (!importsEnabledRef.current) {
      return { modelName, status: 'missing' };
    }
    setIsResolving(true);
    try {
      const fresh = await fetchAllIndexes(reposRef.current, false);
      setIndexes(fresh);
      // Auto-Fetch hat Vorrang vor einem ggf. existierenden Manual-Upload:
      // wir entfernen den Override, damit die per-model Auto-Quelle gewinnt.
      const ovMap = new Map<string, { fileName: string; content: string }>();
      for (const [k, v] of overridesRef.current) {
        if (k === modelName) continue;
        ovMap.set(k, { fileName: v.fileName, content: v.content });
      }
      // Wenn der User einen Repo bevorzugt → nur dessen Index durchsuchen.
      const indexesToUse = preferredRepoId
        ? fresh.filter(i => i.repo.id === preferredRepoId)
        : fresh;
      const result = await resolveModel(modelName, {
        overrides: ovMap,
        singleFetched: singleFetchedRef.current,
        indexes: indexesToUse,
      });
      if (result.status === 'auto' || result.status === 'stdlib') {
        if (overridesRef.current.has(modelName)) {
          removeOverrideStore(modelName);
          const nextOv = new Map(overridesRef.current);
          nextOv.delete(modelName);
          overridesRef.current = nextOv;
          setOverrides(nextOv);
        }
        if (userUnloadedRef.current.has(modelName)) {
          const nextU = new Set(userUnloadedRef.current);
          nextU.delete(modelName);
          userUnloadedRef.current = nextU;
          setUserUnloaded(nextU);
        }
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
    const nextU = new Set(userUnloadedRef.current);
    nextU.add(modelName);
    userUnloadedRef.current = nextU;
    setUserUnloaded(nextU);
  }, []);

  const toggleHidden = useCallback((modelName: string) => {
    const next = new Set(hiddenImportsRef.current);
    if (next.has(modelName)) next.delete(modelName);
    else next.add(modelName);
    hiddenImportsRef.current = next;
    setHiddenImports(next);
  }, []);

  const getHiddenImports = useCallback(() => hiddenImportsRef.current, []);

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

  const ensureIndexes = useCallback(async () => {
    if (!importsEnabledRef.current) return;
    const fresh = await fetchAllIndexes(reposRef.current, false);
    setIndexes(fresh);
  }, []);

  const probeSingleRepo = useCallback(async (repo: RepoSpec): Promise<RepositoryIndex> => {
    const fresh = await fetchRepositoryIndex(repo, true);
    setIndexes(prev => {
      const others = prev.filter(i => i.repo.id !== repo.id);
      return [...others, fresh];
    });
    return fresh;
  }, []);

  const availabilityFor = useCallback((modelName: string): RepoSpec[] => {
    const matches: RepoSpec[] = [];
    for (const repo of reposRef.current) {
      // Erst frischen State, dann fallback auf Disk-Cache.
      const fromState = indexes.find(i => i.repo.id === repo.id);
      const idx = fromState ?? readCachedIndex(repo);
      if (!idx || idx.status !== 'ok') continue;
      if (idx.entries.some(e => e.name === modelName)) matches.push(repo);
    }
    return matches;
  }, [indexes]);

  return {
    isResolving,
    lastResult,
    lastSummary: lastResult?.summary ?? null,
    overrides,
    singleFetched,
    hiddenImports,
    importsEnabled,
    setImportsEnabled,
    autoImportEnabled: autoEnabled,
    setAutoImportEnabled,
    repos,
    indexes,
    resolveAll,
    fetchSingleModel,
    removeSingleFetched,
    toggleHidden,
    getHiddenImports,
    uploadOverride,
    uploadOverrideContent,
    removeOverride,
    refreshRepoIndex,
    ensureIndexes,
    probeSingleRepo,
    availabilityFor,
    setRepos,
  };
}
