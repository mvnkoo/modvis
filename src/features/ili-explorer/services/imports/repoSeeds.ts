export interface GithubMirror {
  /** GitHub `<org>/<repo>` */
  repo: string;
  /** Branch oder Tag; Default 'master' */
  branch?: string;
  /** Optionaler Sub-Pfad innerhalb des Repos, falls die Modelle in einem Unterordner liegen */
  subPath?: string;
}

export interface RepoSpec {
  id: string;
  baseUrl: string;
  label: string;
  /** Optionaler GitHub-Mirror → wird via jsDelivr CDN gefetcht (umgeht CORS) */
  github?: GithubMirror;
  /** Optional manuelle Kennzeichnung; bei custom-Repos durch User true */
  custom?: boolean;
}

export const JSDELIVR_GH_BASE = 'https://cdn.jsdelivr.net/gh';

/** Wenn ein GitHub-Mirror existiert, liefert diese Funktion die jsDelivr-URL. */
export function jsdelivrUrl(mirror: GithubMirror, relPath: string): string {
  const branch = mirror.branch ?? 'master';
  const sub = mirror.subPath ? `${mirror.subPath.replace(/^\/|\/$/g, '')}/` : '';
  const rel = relPath.replace(/^\//, '');
  return `${JSDELIVR_GH_BASE}/${mirror.repo}@${branch}/${sub}${rel}`;
}

/*
 * Standard-Repo-Liste — bewusst minimal gehalten.
 *
 */
export const DEFAULT_REPO_SEEDS: RepoSpec[] = [
  {
    id: 'geo-admin',
    baseUrl: 'https://models.geo.admin.ch',
    label: 'Bund (geo.admin.ch)',
  },
];

const CUSTOM_REPOS_KEY = 'modvis.customRepos.v1';

export function loadCustomRepos(): RepoSpec[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOM_REPOS_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r: any): r is RepoSpec =>
        r && typeof r.id === 'string' && typeof r.baseUrl === 'string' && typeof r.label === 'string'
      )
      .map((r: RepoSpec) => ({ ...r, custom: true }));
  } catch {
    return [];
  }
}

export function saveCustomRepos(repos: RepoSpec[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const serializable = repos.map(r => ({
      id: r.id,
      baseUrl: r.baseUrl,
      label: r.label,
      github: r.github,
      custom: true,
    }));
    localStorage.setItem(CUSTOM_REPOS_KEY, JSON.stringify(serializable));
  } catch {
    /* quota / private-mode: ignore */
  }
}

export function getAllRepos(): RepoSpec[] {
  return [...loadCustomRepos(), ...DEFAULT_REPO_SEEDS];
}
