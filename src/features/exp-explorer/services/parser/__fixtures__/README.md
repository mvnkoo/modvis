# Parser-Fixtures (exp-explorer)

EXPRESS-Korpus für den modvis-Parser. Die Files hier werden direkt von
Vitest geladen — kein Netzzugriff im CI, deterministisch.

## Provenienz

| Datei            | Quelle                                         | Stand       | Lizenz             |
| ---------------- | ---------------------------------------------- | ----------- | ------------------ |
| Minimal_IFC.exp  | Eigenentwicklung (modvis), IFC-Stil-Fragment   | 2026-05-15  | MIT (siehe Header) |

Für die offizielle IFC4.3-Schema-Datei
(`https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/IFC4X3_ADD2.exp`)
wird der Parser im Laufzeit-Upload getestet. Sie wird *nicht* committed —
~3 MB Schema sind zu gross für CI, die Lizenz ist BSD-konform (Bsi-Public-
Domain), aber der Aufwand des Refresh-Reviews zahlt sich erst aus, wenn
echte Bugs auftauchen.

## Refresh-Policy

Analog zum ili-explorer: Snapshot, manueller Refresh.
