import type { ExpressAttribute, ExpressAggregate } from '../types/ExpressBaseTypes';

const AGGREGATE_RE = /^(LIST|SET|BAG|ARRAY)\b(?:\s*(\[[^\]]+\]))?\s+OF\s+(?:UNIQUE\s+|OPTIONAL\s+)*(.+)$/i;

/**
 * Zerlegt einen rohen EXPRESS-Typ-Ausdruck (z.B. `LIST [1:?] OF IfcRoot`,
 * `OPTIONAL IfcLabel`, `IfcOwnerHistory`) in seine Bestandteile.
 */
function decomposeType(rawType: string): {
  baseType: string;
  aggregate: ExpressAggregate;
  cardinality?: string;
} {
  const type = rawType.trim();
  const m = type.match(AGGREGATE_RE);
  if (m) {
    const [, agg, card, inner] = m;
    const inferred = decomposeType(inner);
    return {
      baseType: inferred.baseType,
      aggregate: agg.toUpperCase() as ExpressAggregate,
      cardinality: card,
    };
  }
  return {
    baseType: type.replace(/[;\s]+$/g, ''),
    aggregate: null,
  };
}

/**
 * Liest direkte und INVERSE-Attribute aus einem ENTITY-Body. Erwartet den
 * Body *ohne* Header (ENTITY name ...;) und ohne `END_ENTITY;`.
 */
export function parseAttributes(entityBody: string): ExpressAttribute[] {
  const attrs: ExpressAttribute[] = [];

  // Schneide ggf. SUBTYPE-Header weg, bis zum ersten Semikolon nach SUBTYPE OF.
  const headerEnd = entityBody.indexOf(';');
  const afterHeader = headerEnd >= 0 ? entityBody.slice(headerEnd + 1) : entityBody;

  // Stop-Bereich: WHERE / UNIQUE / DERIVE / INVERSE sind Sektionen — wir
  // betrachten sie der Reihe nach.
  const sections = splitSections(afterHeader);

  pushSection(sections.directAndDerived, attrs, { isInverse: false });
  pushSection(sections.inverse, attrs, { isInverse: true });

  return attrs;
}

function splitSections(body: string): {
  directAndDerived: string;
  inverse: string;
} {
  // Reihenfolge in EXPRESS: direct attrs → DERIVE → INVERSE → UNIQUE → WHERE
  const inverseIdx = caseInsensitiveIndex(body, /\bINVERSE\b/);
  const uniqueIdx = caseInsensitiveIndex(body, /\bUNIQUE\b/);
  const whereIdx = caseInsensitiveIndex(body, /\bWHERE\b/);
  const endIdx = minIdx([uniqueIdx, whereIdx]);

  if (inverseIdx >= 0) {
    return {
      directAndDerived: body.slice(0, inverseIdx),
      inverse: endIdx > inverseIdx ? body.slice(inverseIdx, endIdx) : body.slice(inverseIdx),
    };
  }
  return {
    directAndDerived: endIdx >= 0 ? body.slice(0, endIdx) : body,
    inverse: '',
  };
}

function pushSection(
  raw: string,
  attrs: ExpressAttribute[],
  flags: { isInverse: boolean },
): void {
  if (!raw.trim()) return;
  // INVERSE-Section trägt ein vorangestelltes `INVERSE` Keyword
  const cleaned = raw.replace(/^\s*INVERSE\s*/i, '');

  // DERIVE-Section, gleicher Trick
  const deriveIdx = caseInsensitiveIndex(cleaned, /\bDERIVE\b/);
  const direct = deriveIdx >= 0 ? cleaned.slice(0, deriveIdx) : cleaned;
  const derive = deriveIdx >= 0 ? cleaned.slice(deriveIdx).replace(/^\s*DERIVE\s*/i, '') : '';

  pushAttrLines(direct, attrs, { ...flags, isDerived: false });
  pushAttrLines(derive, attrs, { ...flags, isDerived: true });
}

const ATTR_LINE_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(OPTIONAL\s+)?([^;]+);/;

function pushAttrLines(
  section: string,
  attrs: ExpressAttribute[],
  flags: { isInverse: boolean; isDerived: boolean },
): void {
  // Jede Zeile, die wie `name : type ;` aussieht — Multi-Line-Typen werden
  // bis zum Semikolon vereinigt (z.B. SELECT-Aliase mit Klammern).
  const statements = splitStatements(section);
  for (const stmt of statements) {
    const m = stmt.match(ATTR_LINE_RE);
    if (!m) continue;
    const [, name, optional, rawType] = m;
    const decomposed = decomposeType(rawType);
    attrs.push({
      name,
      type: rawType.trim().replace(/[;\s]+$/g, ''),
      baseType: decomposed.baseType,
      isOptional: !!optional,
      isInverse: flags.isInverse,
      isDerived: flags.isDerived,
      aggregate: decomposed.aggregate,
      cardinality: decomposed.cardinality,
    });
  }
}

function splitStatements(section: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of section) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      out.push(buf + ch);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function caseInsensitiveIndex(s: string, re: RegExp): number {
  const m = re.exec(s);
  return m ? m.index : -1;
}

function minIdx(arr: number[]): number {
  const filtered = arr.filter((i) => i >= 0);
  return filtered.length === 0 ? -1 : Math.min(...filtered);
}
