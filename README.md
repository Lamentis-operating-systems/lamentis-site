# Lamentis Site

Lamentis ist eine statisch gerenderte Next.js-Plattform mit lokalisierten
englischen und deutschen Routen sowie einer kleinen globalen Aktionsfläche.
Der Anwendungscode liegt im Verzeichnis `frontend`.

## Lokal entwickeln

Voraussetzung sind Node.js 24 und npm 11.6.4. Beide Versionen sind im
Repository und in CI festgelegt.

```bash
cd frontend
npm ci
npm run dev
```

Die Anwendung ist anschließend unter `http://127.0.0.1:3000` erreichbar.

## Qualität prüfen

```bash
cd frontend
npm run verify
npm run test:e2e
```

`verify` führt Linting, CSS-Regeln, Typprüfung, Dead-Code-Prüfung, Unit-Tests
und den Produktions-Build aus. Die Browser-Suite prüft Routing,
Interaktionen, Accessibility und visuelle Baselines.

Weitere Verträge sind in der Dokumentation festgehalten:

- [Architektur](docs/architecture.md)
- [Designsystem](docs/design-system.md)
- [Tests](docs/testing.md)

## Deployment

Die einzige getrackte Vercel-Konfiguration liegt im Repository-Root. Ein
Deployment wird bewusst separat von normalen Refactors ausgelöst.
