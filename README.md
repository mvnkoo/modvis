# modvis - Model Visualisation

> **Hinweis:** Diese Anwendung hiess früher **Wizzbo** und wurde in **modvis** (kurz für *Model Visualisation*) umbenannt. Bestehende Verweise auf „Wizzbo" in Code, Manifesten oder Dokumentation beziehen sich auf dasselbe Projekt.

A modern web application for visualizing and exploring model and schema files. modvis helps users understand complex INTERLIS schemas, EXPRESS schemas and IFC models through interactive visualization and exploration.

## Features

- **Schema Parsing**: Parses INTERLIS schema files into a structured graph representation
- **Interactive Visualization**: Displays classes, enumerations, and their relationships in an interactive graph
- **Domain Enumeration Support**: Full support for INTERLIS domain enumerations including:
  - Basic enumerations
  - Nested enumerations
  - Extended enumerations (EXTENDS)
  - ALL OF enumerations
- **Class Relationships**: Visualizes inheritance and associations between classes
- **Attribute Details**: Shows detailed information about class attributes including:
  - Data types
  - Cardinality
  - Comments and documentation
  - Mandatory/Optional status
- **Multi-language Support**: Handles special characters and umlauts (ä, ö, ü) in schema definitions

## Technical Stack

- **Frontend**: TypeScript/JavaScript with modern web technologies
- **Backend**: Node.js
- **Container Support**: Docker configuration included
- **Web Server**: Nginx for production deployment

## Project Structure

```
modvis/
├── src/                      # Source code
│   └── features/
│       └── ili-explorer/     # INTERLIS explorer feature
│           ├── services/     # Core services
│           └── types/        # TypeScript type definitions
├── public/                   # Static assets
├── Dockerfile               # Docker configuration
├── nginx.conf              # Nginx configuration
├── package.json            # Project dependencies
└── tsconfig.json          # TypeScript configuration
```

## Core Components

### IliParserService

The heart of the application, responsible for parsing INTERLIS schema files. Key features:

- Parses domain enumerations
- Handles class inheritance
- Processes associations between classes
- Extracts documentation and comments
- Supports nested enumeration structures

### Type System

Comprehensive TypeScript type definitions for INTERLIS elements:

- `IliBaseNode`: Base type for all schema elements
- `IliClassNode`: Class representation
- `IliEnumDefinition`: Enumeration definitions
- `IliAttribute`: Class attributes
- `IliRelation`: Relationships between elements

## Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Docker Deployment

Build and run with Docker:

```bash
docker build -t modvis .
docker run -p 80:80 modvis
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add your license information here]

## Contact

[Add your contact information here]
