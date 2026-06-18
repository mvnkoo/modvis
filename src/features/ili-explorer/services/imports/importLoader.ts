import { fetchAllIndexes, type RepositoryIndex } from './repositoryIndex';
import { resolveModel, extractImportsLight, type ResolutionResult } from './modelResolver';
import { getAllRepos, type RepoSpec } from './repoSeeds';

export interface ImportLoadResult {
  primary: { name: string; content: string };
  resolved: ResolutionResult[];
  missing: string[];
  summary: ImportSummary;
}

export interface ImportSummary {
  autoCount: number;
  manualCount: number;
  stdlibCount: number;
  missingCount: number;
  sourceRepos: string[];
  resolvedNames: string[];
  missingNames: string[];
}

export interface ImportLoaderOptions {
  overrides: Map<string, { fileName: string; content: string }>;
  singleFetched?: Map<string, ResolutionResult>;
  forceRefresh?: boolean;
  maxDepth?: number;
  repos?: RepoSpec[];
}

const DEFAULT_MAX_DEPTH = 5;

export async function loadWithDependencies(
  primary: { name: string; content: string },
  options: ImportLoaderOptions,
): Promise<ImportLoadResult> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const repos = options.repos ?? getAllRepos();
  const indexes = await fetchAllIndexes(repos, options.forceRefresh ?? false);

  const ctx = { overrides: options.overrides, singleFetched: options.singleFetched, indexes };

  const resolved: ResolutionResult[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  let queue: { name: string; depth: number }[] = extractImportsLight(primary.content)
    .map(name => ({ name, depth: 0 }));

  while (queue.length > 0) {
    const batch = queue;
    queue = [];
    const results = await Promise.all(
      batch
        .filter(b => {
          if (seen.has(b.name)) return false;
          seen.add(b.name);
          return true;
        })
        .map(async (b) => ({ depth: b.depth, res: await resolveModel(b.name, ctx) })),
    );

    for (const { depth, res } of results) {
      if (res.status === 'missing') {
        missing.push(res.modelName);
        continue;
      }
      resolved.push(res);
      if (depth + 1 >= maxDepth) continue;
      const deps = res.dependsOn ?? [];
      for (const dep of deps) {
        if (!seen.has(dep)) queue.push({ name: dep, depth: depth + 1 });
      }
    }
  }

  const summary: ImportSummary = {
    autoCount: resolved.filter(r => r.status === 'auto').length,
    manualCount: resolved.filter(r => r.status === 'manual').length,
    stdlibCount: resolved.filter(r => r.status === 'stdlib').length,
    missingCount: missing.length,
    sourceRepos: dedupe(resolved.map(r => r.repoLabel).filter((v): v is string => !!v)),
    resolvedNames: resolved.map(r => r.modelName),
    missingNames: [...missing],
  };

  return { primary, resolved, missing, summary };
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function indexesFromCache(repos?: RepoSpec[]): RepositoryIndex[] {
  // Synchron alle Caches lesen; nützlich für UI-Anzeigen ohne Refetch.
  // Implementiert via Re-Use von readCachedIndex in einer parallel-Schleife.
  const list = (repos ?? getAllRepos());
  const out: RepositoryIndex[] = [];
  for (const repo of list) {
    if (typeof localStorage === 'undefined') {
      out.push({ repo, entries: [], fetchedAt: 0, status: 'pending' });
      continue;
    }
    try {
      const raw = localStorage.getItem(`modvis.repoIndex.v1.${repo.id}`);
      if (!raw) {
        out.push({ repo, entries: [], fetchedAt: 0, status: 'pending' });
        continue;
      }
      out.push(JSON.parse(raw) as RepositoryIndex);
    } catch {
      out.push({ repo, entries: [], fetchedAt: 0, status: 'error' });
    }
  }
  return out;
}
