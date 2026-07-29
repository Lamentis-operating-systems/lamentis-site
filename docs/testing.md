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
Produktions-Build. Die CI verwendet Node.js 24, npm 11.6.4 und dieselben
npm-Skripte. Abhängigkeiten werden ausschließlich mit `npm ci` aus dem
getrackten Lockfile installiert; Versionsbereiche im Manifest sind nicht
erlaubt.

`npm run test:e2e` baut die Anwendung und prüft standardmäßig den
Production-Server. Für eine schnelle lokale Diagnose gegen den Dev-Server
existiert separat:

```bash
npm run test:e2e:dev
```

## Testebenen

- Modelltests prüfen eindeutige Pfade, vollständige EN-/DE-Inhalte, Links und
  konsistente Navigation-, Footer-, SEO- und Sitemap-Projektionen.
- Komponententests prüfen Menü-Zustände, Fokus und semantische Links.
- Genau ein Golden-Test friert die 13 öffentlichen URL-Pfade explizit ein.
  Alle weiteren Routing-, Axe- und SEO-Fälle werden aus den
  Produktionsvarianten des Routenkatalogs erzeugt.
- Routingtests prüfen Locale-Verhandlung, vollständige lokalisierte Chrome- und
  Metadata-Projektionen, negative URLs, `lang`, absolute Canonicals,
  Alternates, Robots und Sitemap.
- Interaktionstests prüfen Dialog-Escape, Fokus-Rückgabe, Scroll-Lock-Cleanup,
  Route-Reset, den semantischen Locale-Wechsel und die Sprachkontinuität auf
  der globalen Add-site-Route.
- Accessibility-Tests prüfen die 13 Routen mit Axe sowie 320, 390, 768, 1024
  und 1440 px, 200 % Textgröße, Touchziele, Headerüberlappung, Textachsen,
  Reduced Motion und Forced Colors.

## Visuelle Baselines

Die Suite enthält 20 risikobasierte Chromium-Baselines:

- Home, Search, Platzhalter und lokalisierte 404-Seite jeweils bei 390 und
  1440 px in Light und Dark;
- geöffneter mobiler Navigationsdialog in Light und Dark;
- geöffnetes Locale-Menü in Light und Dark.

Funktionale Tests decken weiterhin jede öffentliche URL ab. Ein normaler
Testlauf darf die Baselines nicht verändern.

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
