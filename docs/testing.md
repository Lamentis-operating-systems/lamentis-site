# Tests

## Standard-Gates

Alle Befehle werden in `frontend` ausgeführt:

```bash
npm ci
npm run verify
npm run test:e2e
npm audit --audit-level=high
git diff --check
```

`npm run verify` bündelt ESLint, Stylelint, TypeScript, Knip, Vitest und den
Produktions-Build. Die CI verwendet Node.js 24 und dieselben npm-Skripte.

## Testebenen

- Modelltests prüfen eindeutige Pfade, vollständige EN-/DE-Inhalte, Links und
  konsistente Navigation-, Footer-, SEO- und Sitemap-Projektionen.
- Komponententests prüfen Menü-Zustände, Fokus und semantische Links.
- Routingtests prüfen Locale-Verhandlung, alle zehn öffentlichen URLs,
  negative URLs, `lang`, Canonicals, Alternates, Robots und Sitemap.
- Interaktionstests prüfen Dialog-Escape, Fokus-Rückgabe, Scroll-Lock-Cleanup,
  Route-Reset und den semantischen Locale-Wechsel.
- Accessibility-Tests prüfen die zehn Routen mit Axe sowie 320, 768 und 1024 px,
  200 % Textgröße, Reduced Motion und Forced Colors.

## Visuelle Baselines

Die Suite enthält 40 Chromium-Baselines: zehn Routen, zwei Viewports und
Light/Dark. Ein normaler Testlauf darf sie nicht verändern.

```bash
npm run test:e2e
```

Eine bewusste visuelle Änderung wird lokal geprüft und anschließend explizit
aktualisiert:

```bash
npm run test:e2e:update
```

Baseline-Änderungen werden gemeinsam mit der auslösenden Designänderung
reviewt. Ein grüner Snapshot allein ersetzt weder Interaktions- noch
Accessibility-Prüfungen.
