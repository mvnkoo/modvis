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

export const DEFAULT_REPO_SEEDS: RepoSpec[] = [
  // claeis/models = offizielles INTERLIS-Modell-Repo von C. Eisenhut.
  // models.interlis.ch ist nur ein DNS-Alias darauf; via jsDelivr umgehen wir CORS.
  {
    id: 'interlis-ch',
    baseUrl: 'https://models.interlis.ch',
    label: 'INTERLIS.ch (offiziell)',
    github: { repo: 'claeis/models', branch: 'master' },
  },
  { id: 'geo-admin',   baseUrl: 'https://models.geo.admin.ch', label: 'Bund (geo.admin.ch)' },
  { id: 'kgk-cgc',     baseUrl: 'https://models.kgk-cgc.ch',   label: 'KGK CGC' },
  { id: 'so',          baseUrl: 'https://models.geo.so.ch',    label: 'Kanton Solothurn' },
  { id: 'zh',          baseUrl: 'https://models.geo.zh.ch',    label: 'Kanton Zürich' },
  { id: 'be',          baseUrl: 'https://models.geo.be.ch',    label: 'Kanton Bern' },
  { id: 'bl',          baseUrl: 'https://models.geo.bl.ch',    label: 'Kanton Basel-Landschaft' },
  { id: 'bs',          baseUrl: 'https://models.geo.bs.ch',    label: 'Kanton Basel-Stadt' },
  { id: 'sg',          baseUrl: 'https://models.geo.sg.ch',    label: 'Kanton St. Gallen' },
  { id: 'tg',          baseUrl: 'https://models.geo.tg.ch',    label: 'Kanton Thurgau' },
  { id: 'ag',          baseUrl: 'https://models.geo.ag.ch',    label: 'Kanton Aargau' },
  { id: 'lu',          baseUrl: 'https://models.geo.lu.ch',    label: 'Kanton Luzern' },
  { id: 'gr',          baseUrl: 'https://models.geo.gr.ch',    label: 'Kanton Graubünden' },
  { id: 'vd',          baseUrl: 'https://models.geo.vd.ch',    label: 'Canton de Vaud' },
  { id: 'ge',          baseUrl: 'https://models.ge.ch',        label: 'République de Genève' },
  { id: 'ne',          baseUrl: 'https://models.ne.ch',        label: 'République de Neuchâtel' },
  { id: 'fr',          baseUrl: 'https://models.geo.fr.ch',    label: 'Canton de Fribourg' },
  { id: 'vs',          baseUrl: 'https://models.geo.vs.ch',    label: 'Canton du Valais' },
  { id: 'ti',          baseUrl: 'https://models.geo.ti.ch',    label: 'Cantone Ticino' },
  { id: 'vsa',         baseUrl: 'https://models.vsa.ch',       label: 'VSA' },
  { id: 'lisag',       baseUrl: 'https://models.lisag.ch',     label: 'Lisag' },
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
