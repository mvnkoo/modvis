# Mitwirken an modvis

Danke fürs Interesse! modvis ist eine Open-Source-Visualisierung für INTERLIS-
und EXPRESS-Schemas. Beiträge sind willkommen — Bug Reports, Modell-Samples,
Grammar-Fixes, UI-Polish, Doku.

Dieses Dokument beschreibt den Setup-Pfad, die Branch-Strategie und die
Erwartungen an Pull Requests.

## Vorab: Code of Conduct

Wir folgen dem [Contributor Covenant](CODE_OF_CONDUCT.md). Kurz: respektvoll
bleiben, technisch fokussiert, persönliche Angriffe gehen nicht.

## Setup

```bash
git clone https://github.com/mvnkoo/modvis.git
cd modvis
npm install
npm run dev        # http://localhost:3000
```

Node 20+ wird empfohlen (CI testet auf 20).

Lokale Checks vor jedem PR:

```bash
npm run lint       # ESLint — keine Errors, Warnings nur als Hinweis
npm run typecheck  # tsc -b --noEmit
npm test           # vitest — alle Tests müssen grün sein
npm run build      # tsc + vite build
```

CI lässt das gleiche Quartett laufen (`.github/workflows/ci.yml`). Wenn lokal
grün, ist CI mit hoher Wahrscheinlichkeit auch grün.

## Wie lade ich eine .ili-Datei?

In der laufenden App: Reiter "ILI Explorer" → "Load from file" → eine
INTERLIS-2.x-Datei auswählen. Beispiele finden sich in
[`src/features/ili-explorer/services/parser/__fixtures__/`](src/features/ili-explorer/services/parser/__fixtures__/)
(CoordSys.ili, Units.ili, Conformance_Synthetic_V1.ili).

Größere Modell-Korpora liegen unter [`testfiles/`](testfiles/) (gitignoriert).
Wenn dein Modell ein Parser-Problem zeigt, häng es bitte an das GitHub-Issue
an oder reduziere es auf ein minimales Repro.

## Branch-Strategie

```
feature/<thema>  →  staging  →  main
hotfix/<thema>   →  main     →  staging (Cherry-Pick)
release/x.x.x   →  main
```

- **`main`** — produktiv ([www.modvis.ch](https://www.modvis.ch)). Nur via
  Release- oder Hotfix-Branch.
- **`staging`** — Beta ([dev.modvis.ch](https://dev.modvis.ch)). PRs von
  Feature-Branches landen hier.
- **`feature/<thema>`** — von `staging` cutten, PR gegen `staging` öffnen.
- **`hotfix/<thema>`** — von `main` cutten, PR gegen `main`. Danach einen
  zweiten PR mit demselben Fix gegen `staging` öffnen, damit der Hotfix beim
  nächsten Release nicht verloren geht.

## Parser-Beiträge

Der INTERLIS-Parser ist Chevrotain-basiert
([`src/features/ili-explorer/services/parser/`](src/features/ili-explorer/services/parser/)).
Pipeline:

```
.ili text  →  IliLexer (tokens.ts)  →  IliCstParser (cstParser.ts + grammar/)
            →  IliAstBuilder (astBuilder.ts)  →  IliParser (IliParser.ts)
            →  { nodes, relations, errors, warnings }
```

**Pflicht-Einstieg vor jedem Grammar-PR:** Die Conformance-Suite muss grün
bleiben:

```bash
npm test -- src/features/ili-explorer/services/parser/__tests__/conformance.test.ts
```

Sie prüft das synthetische Fixture (`Conformance_Synthetic_V1.ili`) und die
Standard-Library (`CoordSys.ili`, `Units.ili`).

**Neue Grammar-Regel?** Ein zusätzliches Synthetic-Fragment im Fixture +
ein zugehöriger Test im Conformance-File sind erwünscht. Die Provenienz von
Snapshot-Files ist in [`__fixtures__/README.md`](src/features/ili-explorer/services/parser/__fixtures__/README.md)
dokumentiert.

**Tokens, die innerhalb von Bodies (FUNCTION / VIEW / Constraints) skipped
werden sollen,** brauchen die `SkipBody`-Kategorie — siehe `tokens.ts`. Sonst
wird der Token in der Skip-Rule nicht erkannt.

## Pull Request Checkliste

- [ ] Branch von `staging` (Feature) bzw. `main` (Hotfix) gecuttet.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` lokal grün.
- [ ] Neue Funktion → Test im passenden `__tests__/`-Ordner.
- [ ] Grammar-Änderung → Conformance-Test ergänzt.
- [ ] Commit-Messages: Conventional-Style (`feat:`, `fix:`, `refactor:`, …),
      Imperativ, ≤ 72 Zeichen pro Subject.
- [ ] PR-Beschreibung erklärt **warum**, nicht nur **was**.

## Issue-Templates

Für Bug Reports, Feature Requests und Parser-Probleme stehen Templates unter
[`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) bereit. Bei Parser-Bugs
hilft ein minimales Repro-`.ili`-Snippet enorm.

## Lizenz

Beiträge werden unter [AGPL-3.0-or-later](LICENSE) lizenziert — derselben
Lizenz wie das Projekt selbst. Mit dem Öffnen eines PRs bestätigst du, dass
deine Beiträge unter dieser Lizenz veröffentlicht werden dürfen.
