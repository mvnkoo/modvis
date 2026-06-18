export type SchemaLanguage = 'ili2_3' | 'ili2_4' | 'ili1';

export interface ModelEntry {
  name: string;
  version?: string;
  file: string;
  md5?: string;
  precursorVersion?: string;
  dependsOnModel?: string[];
  schemaLanguage?: SchemaLanguage;
  publishingDate?: string;
  issuer?: string;
  technicalContact?: string;
  modelKind?: string;
}

const MODEL_OPEN_RE = /<(?:[\w]+:)?(?:[\w.]*\.)?ModelMetadata\b([^>]*)>([\s\S]*?)<\/(?:[\w]+:)?(?:[\w.]*\.)?ModelMetadata\s*>/gi;
const FLAT_MODEL_RE = /<(?:[\w]+:)?Model\s+([^>/]+)\/?\s*>/gi;

export function parseIlimodelsXml(xml: string): ModelEntry[] {
  if (!xml || typeof xml !== 'string') return [];
  if (!/<\?xml|<TRANSFER|<repository|<Model|<\w+:Model/i.test(xml)) return [];

  const stripped = xml.replace(/<!--[\s\S]*?-->/g, '');
  const entries: ModelEntry[] = [];
  const seen = new Set<string>();

  MODEL_OPEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MODEL_OPEN_RE.exec(stripped)) !== null) {
    const inner = m[2];
    const entry = readEntryFromInner(inner);
    if (!entry) continue;
    const key = `${entry.name}|${entry.version ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  if (entries.length === 0) {
    FLAT_MODEL_RE.lastIndex = 0;
    while ((m = FLAT_MODEL_RE.exec(stripped)) !== null) {
      const attrs = parseAttrs(m[1]);
      const name = attrs['Name'] ?? attrs['name'];
      if (!name) continue;
      const entry: ModelEntry = {
        name,
        version: attrs['Version'] ?? attrs['version'],
        file: attrs['File'] ?? attrs['file'] ?? `${name}.ili`,
        md5: attrs['md5'],
      };
      const sl = (attrs['SchemaLanguage'] ?? '').toLowerCase();
      if (sl.includes('2_3') || sl.includes('23')) entry.schemaLanguage = 'ili2_3';
      else if (sl.includes('2_4') || sl.includes('24')) entry.schemaLanguage = 'ili2_4';
      else if (sl === 'ili1') entry.schemaLanguage = 'ili1';
      const key = `${entry.name}|${entry.version ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
  }

  return entries;
}

function readEntryFromInner(inner: string): ModelEntry | null {
  const name = extractElement(inner, 'Name');
  if (!name) return null;
  const file = extractElement(inner, 'File') ?? extractElement(inner, 'FileName') ?? `${name}.ili`;
  const version = extractElement(inner, 'Version');
  const md5 = extractElement(inner, 'md5');
  const precursorVersion = extractElement(inner, 'precursorVersion');
  const publishingDate = extractElement(inner, 'publishingDate');
  const issuer = extractElement(inner, 'Issuer');
  const technicalContact = extractElement(inner, 'technicalContact');
  const modelKind = extractElement(inner, 'ModelKind');

  const entry: ModelEntry = {
    name,
    file,
    version,
    md5,
    precursorVersion,
    publishingDate,
    issuer,
    technicalContact,
    modelKind,
  };

  const sl = extractElement(inner, 'SchemaLanguage')?.toLowerCase();
  if (sl) {
    if (sl.includes('2_3') || sl.includes('23')) entry.schemaLanguage = 'ili2_3';
    else if (sl.includes('2_4') || sl.includes('24')) entry.schemaLanguage = 'ili2_4';
    else if (sl === 'ili1') entry.schemaLanguage = 'ili1';
  }

  const depsBlock = extractElementBlock(inner, 'dependsOnModel');
  if (depsBlock) {
    const valueMatches = depsBlock.match(/<value>\s*([^<]+)\s*<\/value>/gi);
    if (valueMatches) {
      const deps = valueMatches
        .map(v => v.replace(/<\/?value>/gi, '').trim())
        .filter(v => v.length > 0);
      if (deps.length > 0) entry.dependsOnModel = deps;
    } else {
      const refs = depsBlock.match(/REF\s*=\s*"([^"]+)"/gi);
      if (refs) {
        const deps = refs
          .map(r => r.replace(/REF\s*=\s*"/i, '').replace(/"$/, ''))
          .filter(v => v.length > 0);
        if (deps.length > 0) entry.dependsOnModel = deps;
      }
    }
  }

  return entry;
}

function extractElement(scope: string, localName: string): string | undefined {
  const re = new RegExp(`<(?:[\\w]+:)?${escapeRe(localName)}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</(?:[\\w]+:)?${escapeRe(localName)}\\s*>`, 'i');
  const m = scope.match(re);
  if (!m) return undefined;
  const text = m[1].trim();
  return text.length > 0 ? decodeXmlEntities(text) : undefined;
}

function extractElementBlock(scope: string, localName: string): string | undefined {
  const re = new RegExp(`<(?:[\\w]+:)?${escapeRe(localName)}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${escapeRe(localName)}\\s*>`, 'i');
  const m = scope.match(re);
  return m ? m[1] : undefined;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out[m[1]] = decodeXmlEntities(m[2]);
  }
  return out;
}

export function pickLatestVersion(entries: ModelEntry[], name: string): ModelEntry | undefined {
  const matches = entries.filter(e => e.name === name);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  const sorted = [...matches].sort((a, b) => {
    const av = a.publishingDate ?? a.version ?? '';
    const bv = b.publishingDate ?? b.version ?? '';
    return bv.localeCompare(av);
  });
  return sorted[0];
}
