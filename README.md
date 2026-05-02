# modvis – Model Visualisation

> **Hinweis:** Diese Anwendung hiess früher **Wizzbo** und wurde in **modvis** (kurz für *Model Visualisation*) umbenannt. Bestehende Verweise auf „Wizzbo" in Code, Manifesten oder Dokumentation beziehen sich auf dasselbe Projekt.

> **Hinweis:** Teile dieses Projekts wurden mit Unterstützung von Large Language Models entwickelt.

Web-Anwendung zur Darstellung von **INTERLIS**- und **EXPRESS**-Schemas als interaktiver Graph.

## Verfügbarkeit

- **Beta / Staging:** [dev.modvis.ch](https://dev.modvis.ch) und [dev.iliexplorer.ch](https://dev.iliexplorer.ch) — laufender Stand für Beta-Tester.
- **Stabile Version (geplant):** [www.modvis.ch](https://www.modvis.ch) und [www.iliexplorer.ch](https://www.iliexplorer.ch) — wird verfügbar, sobald eine stabile Version vorliegt.

Welche Branch wohin deployt, siehe [Branch-Strategie](#branch-strategie).

## Funktionen

### ILI Explorer

- Parst INTERLIS-Schema-Dateien (`.ili`) in eine Graph-Repräsentation.
- Stellt Klassen, Aufzählungen und deren Beziehungen mittels [@xyflow/react](https://reactflow.dev/) dar.
- Unterstützt Domain Enumerations: einfach, verschachtelt, `EXTENDS`, `ALL OF`.
- Visualisiert Vererbung und Assoziationen zwischen Klassen.
- Zeigt Attribut-Details: Datentyp, Kardinalität, Kommentar, Pflicht-/Optionalstatus.
- Verarbeitet Umlaute (ä, ö, ü) in Schema-Definitionen.
- Export als PNG und SVG (über `html-to-image`).

### EXP Explorer

- Stellt EXPRESS-Schemas (z. B. aus IFC-Definitionen) als interaktiven Graph dar.
- Unterstützt Entitäten, Aufzählungen, abgeleitete Typen und deren Beziehungen.

## Technischer Stack

- React 18, TypeScript 5
- Material UI (MUI) v5, Emotion
- [@xyflow/react](https://www.xyflow.com/) v12 (Nachfolger von React Flow)
- Vite 6 (Build-Tool und Dev-Server)
- Hosting: Cloudflare Pages via GitHub-Integration

## Projektstruktur

```
modvis/
├── src/
│   ├── App.tsx                # App-Einstieg, Tab-Navigation
│   ├── index.tsx
│   ├── vite-env.d.ts          # Vite/Build-Constants Type-Deklarationen
│   ├── common/                # Theme und gemeinsame Komponenten
│   ├── context/               # globaler State (AppContext)
│   ├── types/                 # globale TypeScript-Deklarationen
│   └── features/
│       ├── ili-explorer/      # INTERLIS-Parser und -Visualisierung
│       └── exp-explorer/      # EXPRESS-Schema-Visualisierung
├── public/
│   ├── _headers               # Cloudflare Pages: Security-Header
│   ├── _redirects             # Cloudflare Pages: SPA-Fallback
│   ├── favicon/
│   └── site.webmanifest
├── index.html                 # Vite-Einstieg (Root, nicht public/)
├── vite.config.ts
├── tsconfig.json              # Project References
├── tsconfig.app.json
├── tsconfig.node.json
└── package.json
```

## Kernkomponenten

### `IliParserService`

Parst INTERLIS-Schemas:

- Domain Enumerations inkl. verschachtelter Strukturen
- Klassenvererbung
- Assoziationen zwischen Klassen
- Dokumentation und Kommentare

### Typsystem

TypeScript-Typen für INTERLIS-Elemente (zentral in `src/features/ili-explorer/services/types/`):

- `IliBaseNode` – Basistyp
- `IliClassNode` – Klasse
- `IliEnumDefinition` – Aufzählung
- `IliAttribute` – Attribut
- `IliRelation` – Beziehung
- `IliNode` – xyflow-Node-Typ-Alias (`Node<IliFlowNodeData>`)

## Versionsverwaltung

Die App-Version wird zentral in [`package.json`](package.json) gepflegt. [`vite.config.ts`](vite.config.ts) liest sie ein und injiziert sie zur Build-Zeit als globale Konstante `__APP_VERSION__`, die in der UI ([src/App.tsx](src/App.tsx)) angezeigt wird. Für einen Versions-Bump genügt also `package.json` zu ändern.

## Setup

```bash
npm install        # Abhängigkeiten installieren
npm run dev        # Entwicklungsserver starten (alias: npm start)
npm run build      # Produktions-Build erstellen (inkl. tsc-Typecheck)
npm run preview    # Lokale Vorschau des Production-Builds
npm run typecheck  # Nur Typecheck, ohne Build
```

`npm run build` führt zuerst `tsc -b` (Type-Check) aus und bricht den Build ab, falls Type-Errors auftreten. Damit landen keine Type-Probleme unbemerkt im Deployment.

## Deployment (Cloudflare Pages)

Das Deployment erfolgt über die GitHub-Integration von Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `build`
- Node-Version: 20 oder höher (z. B. via `NODE_VERSION=20` als Env Var im Cloudflare-Dashboard)

[public/_redirects](public/_redirects) und [public/_headers](public/_headers) werden bei `npm run build` nach `build/` kopiert:

- `_redirects`: SPA-Fallback (alle Routen → `/index.html`).
- `_headers`: Security-Header (CSP, X-Frame-Options, weitere).

## Branch-Strategie

Code fliesst grundsätzlich `feature/* → staging → main`. Releases und Hotfixes laufen über kurzlebige Sonder-Branches.

| Branch          | Deployment                                          | Zweck                                                 |
| --------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `main`          | [www.modvis.ch](https://www.modvis.ch) (Produktion) | Stabile, freigegebene Version                         |
| `staging`       | [dev.modvis.ch](https://dev.modvis.ch) (Beta)       | Integration aller Features, Beta-Test vor Release     |
| `feature/<xyz>` | –                                                   | Feature-Entwicklung; PR gegen `staging`               |
| `release/x.x.x` | –                                                   | Release-Vorbereitung; aus `staging` gecuttet          |
| `hotfix/<xyz>`  | –                                                   | Kritische Fixes; aus `main` gecuttet                  |

## Mitwirken

### Normaler Feature-Flow

1. Repository forken (oder Feature-Branch direkt anlegen, falls Schreibrechte vorhanden).
2. Branch `feature/<beschreibender-name>` von `staging` cutten.
3. Änderungen vornehmen, lokal testen: `npm run dev`, `npm run typecheck`.
4. Pull Request einreichen — **Ziel: `staging`**.

Nach Merge wird `staging` automatisch auf [dev.modvis.ch](https://dev.modvis.ch) deployed und steht Beta-Testern zur Verfügung.

### Kritische Hotfixes

1. Branch `hotfix/<kurze-beschreibung>` von `main` cutten.
2. Fix einbauen und lokal verifizieren.
3. Pull Request gegen `main` einreichen (Priorität: schnelles Review).
4. Nach Merge in `main`: zweiten PR mit demselben Fix gegen `staging` öffnen, damit der Hotfix beim nächsten Release nicht wieder verloren geht.

### Release-Vorbereitung (Maintainer)

Releases werden aus `staging` heraus gecuttet: `release/x.x.x`. In dieser Phase werden nur noch Bugfixes und Polish akzeptiert, keine neuen Features. Bei Merge in `main` wird automatisch [www.modvis.ch](https://www.modvis.ch) deployed und das Tag `vx.x.x` gesetzt.

## Lizenz

[MIT License](LICENSE) — Copyright (c) 2026 Martin Vanek.

Du darfst den Code frei nutzen, modifizieren, weitergeben und auch kommerziell verwenden, einschliesslich in Closed-Source-Projekten. Einzige Bedingung: Copyright-Vermerk und Lizenztext müssen erhalten bleiben. Keine Garantie.