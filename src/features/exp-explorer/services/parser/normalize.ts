/**
 * Bereitet EXPRESS-Quelltext für die Block-Extraktion auf:
 *   - BOM raus
 *   - Zeilenenden normalisieren (\r\n und \r → \n)
 *   - Block-Kommentare (* ... *) sowie Zeilenkommentare -- ... ignorieren,
 *     dabei aber die Position der Zeichen erhalten (mit Spaces ersetzen),
 *     damit Zeilenangaben in Fehlermeldungen stabil bleiben
 *   - Leerzeichen kollabieren NICHT (Whitespace bleibt erhalten, damit
 *     Zeilen-Tracking funktioniert)
 */
export function normalizeExpress(raw: string): string {
  let s = raw;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Block-Kommentare (* ... *) durch gleichlange Whitespace-Runs ersetzen.
  s = s.replace(/\(\*[\s\S]*?\*\)/g, (m) => m.replace(/[^\n]/g, ' '));

  // Zeilenkommentare -- ... bis Zeilenende
  s = s.replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));

  return s;
}
