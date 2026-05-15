# Parser-Fixtures

Conformance-Korpus für den modvis-Parser. Die Files hier werden direkt von
Vitest geladen — kein Netzzugriff im CI, deterministisch.

## Provenienz

| Datei                          | Quelle                                              | Stand        | Lizenz                          |
| ------------------------------ | --------------------------------------------------- | ------------ | ------------------------------- |
| Conformance_Synthetic_V1.ili   | Eigenentwicklung (modvis)                           | 2026-05-15   | MIT (siehe Header)              |
| CoordSys.ili                   | https://models.interlis.ch/refhb24/CoordSys.ili     | 2015-11-24   | Public (eCH-0031, swisstopo)    |
| Units.ili                      | https://models.interlis.ch/refhb24/Units.ili        | 2014-07-09   | Public (eCH-0031, swisstopo)    |

Die `Release`/`VERSION`-Strings in den Header-Kommentaren der Files
dokumentieren die jeweilige Upstream-Version.

## Refresh-Policy

Snapshot-basiert, bewusst nicht auto-synced:

1. Falls Upstream eine neue Version veröffentlicht: Datei manuell neu
   herunterladen, in diesen Ordner schreiben (gleicher Dateiname).
2. Tests laufen — Diff-Review prüft, ob das neue Upstream-File parser-
   konform ist. Falls nicht: Grammar-Lücke fixen oder Test anpassen.
3. Tabelle oben aktualisieren (Stand).

So sehen wir Parser-Regressionen bewusst (beim Refresh), statt sie
unbemerkt in einen automatisch aktualisierten Test einzufangen.

## Verwendung

Tests unter `../__tests__/conformance.test.ts` laden diese Fixtures.
Wenn W3 (Standard-Library inline mitliefern) umgesetzt wird, ziehen
diese Files in ein Production-Asset um — die Snapshot-Disziplin bleibt
gleich.
