# modvis – Model Visualisation

> Hinweis: Diese Anwendung hiess früher **Wizzbo** und wurde in **modvis** (kurz für *Model Visualisation*) umbenannt.

Web-Anwendung zur Darstellung von **INTERLIS**- und **EXPRESS**-Schemas als interaktiver Graph.

## Funktionen

### ILI Explorer

- Parst INTERLIS-Schema-Dateien (`.ili`) in eine Graph-Repräsentation.
- Stellt Klassen, Aufzählungen und deren Beziehungen mittels [React Flow](https://reactflow.dev/) dar.
- Unterstützt Domain Enumerations: einfach, verschachtelt, `EXTENDS`, `ALL OF`.
- Visualisiert Vererbung und Assoziationen zwischen Klassen.
- Zeigt Attribut-Details: Datentyp, Kardinalität, Kommentar, Pflicht-/Optionalstatus.
- Verarbeitet Umlaute (ä, ö, ü) in Schema-Definitionen.
- Export als PNG, SVG und PDF (`html-to-image`, `jsPDF`).

### EXP Explorer

- Stellt EXPRESS-Schemas (z. B. aus IFC-Definitionen) als interaktiven Graph dar.
- Unterstützt Entitäten, Aufzählungen, abgeleitete Typen und deren Beziehungen.

## Technischer Stack

- React 18, TypeScript
- Material UI (MUI) v5, Emotion
- React Flow v11
- react-scripts (Create React App)
- Hosting: Cloudflare Pages via GitHub-Integration

## Projektstruktur

```
modvis/
├── src/
│   ├── App.tsx                # App-Einstieg, Tab-Navigation
│   ├── index.tsx
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
│   ├── index.html
│   └── site.webmanifest
├── package.json
└── tsconfig.json
```

## Kernkomponenten

### `IliParserService`

Parst INTERLIS-Schemas:

- Domain Enumerations inkl. verschachtelter Strukturen
- Klassenvererbung
- Assoziationen zwischen Klassen
- Dokumentation und Kommentare

### Typsystem

TypeScript-Typen für INTERLIS-Elemente:

- `IliBaseNode` – Basistyp
- `IliClassNode` – Klasse
- `IliEnumDefinition` – Aufzählung
- `IliAttribute` – Attribut
- `IliRelation` – Beziehung

## Setup

```bash
npm install      # Abhängigkeiten installieren
npm start        # Entwicklungsserver starten
npm run build    # Produktions-Build erstellen
```

## Deployment (Cloudflare Pages)

Das Deployment erfolgt über die GitHub-Integration von Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `build`
- Node-Version: 18 oder höher

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
