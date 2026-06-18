import type { RepoSpec } from './repoSeeds';
import { jsdelivrUrl } from './repoSeeds';
import { parseIlimodelsXml, type ModelEntry } from './ilimodelsXml';

/**
 * Status eines Repo-Index-Fetches.
 * - `unreachable`: TypeError vom Browser → kann CORS, DNS-Fail, TLS-Fehler,
 *   Mixed-Content oder Connection-Refused bedeuten; der Browser sagt's nicht
 *   genauer, also benennen wir's nicht genauer.
 */
export type RepoStatus = 'ok' | 'unreachable' | 'not-found' | 'error' | 'pending';

export interface RepositoryIndex {
  repo: RepoSpec;
  entries: ModelEntry[];
  fetchedAt: number;
  status: RepoStatus;
  error?: string;
}

const CACHE_KEY = 'modvis.repoIndex.v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

function cacheKeyFor(repoId: string): string {
  return `${CACHE_KEY}.${repoId}`;
}

function readCache(repo: RepoSpec): RepositoryIndex | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKeyFor(repo.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RepositoryIndex;
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(idx: RepositoryIndex): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(cacheKeyFor(idx.repo.id), JSON.stringify(idx));
  } catch {
    /* quota: ignore */
  }
}

function isFresh(idx: RepositoryIndex | null): boolean {
  if (!idx) return false;
  if (idx.status !== 'ok') return false;
  return (Date.now() - idx.fetchedAt) < CACHE_TTL_MS;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

interface SingleFetchResult {
  ok: boolean;
  text?: string;
  status?: number;
  err?: unknown;
}

async function fetchXml(url: string): Promise<SingleFetchResult> {
  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    return { ok: true, text };
  } catch (err) {
    return { ok: false, err };
  }
}

export async function fetchRepositoryIndex(
  repo: RepoSpec,
  forceRefresh = false,
): Promise<RepositoryIndex> {
  if (!forceRefresh) {
    const cached = readCache(repo);
    if (isFresh(cached)) return cached!;
  }

  const candidates: { url: string; via: 'jsdelivr' | 'direct' }[] = [];
  if (repo.github) {
    candidates.push({ url: jsdelivrUrl(repo.github, 'ilimodels.xml'), via: 'jsdelivr' });
  }
  candidates.push({ url: `${repo.baseUrl.replace(/\/$/, '')}/ilimodels.xml`, via: 'direct' });

  let lastErr: unknown;
  let lastStatus: number | undefined;
  for (const cand of candidates) {
    const r = await fetchXml(cand.url);
    if (!r.ok) {
      lastErr = r.err;
      lastStatus = r.status;
      continue;
    }
    const entries = parseIlimodelsXml(r.text ?? '');
    const ok: RepositoryIndex = {
      repo,
      entries,
      fetchedAt: Date.now(),
      status: entries.length > 0 ? 'ok' : 'error',
      error: entries.length === 0 ? 'Leerer oder unbekannter ilimodels.xml-Inhalt' : undefined,
    };
    writeCache(ok);
    return ok;
  }

  const isCors = lastErr instanceof TypeError;
  const idx: RepositoryIndex = {
    repo,
    entries: [],
    fetchedAt: Date.now(),
    status: isCors
      ? 'unreachable'
      : lastStatus === 404
        ? 'not-found'
        : 'error',
    error:
      lastErr instanceof Error
        ? lastErr.message
        : lastStatus
          ? `HTTP ${lastStatus}`
          : 'Unbekannter Fehler',
  };
  writeCache(idx);
  return idx;
}

export async function fetchAllIndexes(
  repos: RepoSpec[],
  forceRefresh = false,
): Promise<RepositoryIndex[]> {
  return Promise.all(repos.map(r => fetchRepositoryIndex(r, forceRefresh)));
}

export function clearRepositoryCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_KEY}.`)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function readCachedIndex(repo: RepoSpec): RepositoryIndex | null {
  return readCache(repo);
}
