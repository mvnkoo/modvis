# modvis – Model Visualisation

> **Hinweis:** Diese Anwendung hiess früher **Wizzbo** und wurde in **modvis** (kurz für *Model Visualisation*) umbenannt. Bestehende Verweise auf „Wizzbo" in Code, Manifesten oder Dokumentation beziehen sich auf dasselbe Projekt.

Web-Anwendung zur Darstellung von **INTERLIS**- und **EXPRESS**-Schemas als interaktiver Graph.

## Verfügbarkeit

- **Entwicklungs-Branch (`dev`):** [dev.modvis.ch](https://dev.modvis.ch) und [dev.iliexplorer.ch](https://dev.iliexplorer.ch)
- **Stabile Version (geplant):** [www.modvis.ch](https://www.modvis.ch) und [www.iliexplorer.ch](https://www.iliexplorer.ch) — wird verfügbar, sobald eine stabile Version vorliegt.

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

## Mitwirken

1. Repository forken
2. Feature-Branch erstellen
3. Änderungen vornehmen
4. Pull Request einreichen

## Lizenz

[Lizenzinformationen ergänzen]

## Kontakt

[Kontaktinformationen ergänzen]
