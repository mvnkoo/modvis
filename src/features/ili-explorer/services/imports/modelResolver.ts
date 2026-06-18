import type { RepositoryIndex } from './repositoryIndex';
import { isStdLib, getStdLibContent } from './standardLibraries';
import { pickLatestVersion } from './ilimodelsXml';
import { jsdelivrUrl } from './repoSeeds';

export type ResolutionStatus = 'auto' | 'manual' | 'missing' | 'stdlib';

export interface ResolutionResult {
  modelName: string;
  status: ResolutionStatus;
  repoId?: string;
  repoLabel?: string;
  repoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  content?: string;
  error?: string;
  /** Modellnamen, die das gefundene Modell wiederum importiert */
  dependsOn?: string[];
}

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

export interface ResolveContext {
  overrides: Map<string, { fileName: string; content: string }>;
  /** Vom User per Knopfdruck einzeln auto-aufgelöste Modelle — bleibt für die Session erhalten. */
  singleFetched?: Map<string, ResolutionResult>;
  indexes: RepositoryIndex[];
}

export async function resolveModel(
  modelName: string,
  ctx: ResolveContext,
): Promise<ResolutionResult> {
  const override = ctx.overrides.get(modelName);
  if (override) {
    return {
      modelName,
      status: 'manual',
      fileName: override.fileName,
      content: override.content,
      dependsOn: extractImportsLight(override.content),
    };
  }

  const single = ctx.singleFetched?.get(modelName);
  if (single && single.content) {
    return single;
  }

  if (isStdLib(modelName)) {
    const content = getStdLibContent(modelName) ?? '';
    return {
      modelName,
      status: 'stdlib',
      content,
      dependsOn: content ? extractImportsLight(content) : [],
    };
  }

  for (const idx of ctx.indexes) {
    if (idx.status !== 'ok') continue;
    const entry = pickLatestVersion(idx.entries, modelName);
    if (!entry) continue;

    const baseUrl = idx.repo.baseUrl.replace(/\/$/, '');
    const filePath = entry.file.replace(/^\//, '');
    const isAbsolute = /^https?:\/\//i.test(filePath);

    // Wenn das Repo einen GitHub-Mirror hat, fetchen wir über jsDelivr —
    // CORS-frei, global gecached. Sonst die direkte Repo-URL.
    const candidates: string[] = [];
    if (idx.repo.github && !isAbsolute) {
      candidates.push(jsdelivrUrl(idx.repo.github, filePath));
    }
    candidates.push(isAbsolute ? filePath : `${baseUrl}/${filePath}`);

    let content: string | undefined;
    let usedUrl: string | undefined;
    for (const url of candidates) {
      try {
        const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
        if (!res.ok) continue;
        const text = await res.text();
        if (!text || text.length < 10) continue;
        content = text;
        usedUrl = url;
        break;
      } catch {
        continue;
      }
    }

    if (!content || !usedUrl) continue;

    return {
      modelName,
      status: 'auto',
      repoId: idx.repo.id,
      repoLabel: idx.repo.label,
      repoUrl: idx.repo.baseUrl,
      fileUrl: usedUrl,
      fileName: filePath.split('/').pop() ?? `${modelName}.ili`,
      content,
      dependsOn: extractImportsLight(content),
    };
  }

  return { modelName, status: 'missing' };
}

const IMPORTS_RE = /\bIMPORTS\b\s+(?:UNQUALIFIED\s+)?([\w\s,.]+?)\s*;/gi;

export function extractImportsLight(content: string): string[] {
  if (!content) return [];
  const stripped = content
    .replace(/!![^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Set<string>();
  IMPORTS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORTS_RE.exec(stripped)) !== null) {
    const list = m[1];
    list.split(',').forEach(part => {
      const name = part.trim().split(/\s+/)[0];
      if (name && name.length > 0) out.add(name);
    });
  }
  return Array.from(out);
}
