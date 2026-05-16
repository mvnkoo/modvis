const SCHEMA_RE = /\bSCHEMA\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/i;

export function extractSchemaName(content: string): string | undefined {
  const m = content.match(SCHEMA_RE);
  return m ? m[1] : undefined;
}
