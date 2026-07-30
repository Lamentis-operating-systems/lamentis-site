# Tests

## Standard-Gates

Alle Befehle werden in `frontend` ausgeführt:

```bash
npm ci
npm run verify
npm run test:e2e
npm run test:e2e:cross-browser
npm audit --audit-level=high
git diff --check
```

`npm run verify` bündelt ESLint, Stylelint, TypeScript, Knip, Vitest und den
Produktions-Build. Die CI verwendet Node.js 24, npm 11.6.4 und dieselben
npm-Skripte. Abhängigkeiten werden ausschließlich mit `npm ci` aus dem
getrackten Lockfile installiert; Versionsbereiche im Manifest sind nicht
erlaubt.

### Offener Upstream-Audit-Blocker

Stand 30. Juli 2026 bleibt der Dependency-Audit trotz des unterstützten
Next.js-Patchstands 16.2.12 rot:

- Next.js 16.2.12 pinnt `postcss@8.4.31`; die High-Advisories
  [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q)
  und
  [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849)
  sind erst ab PostCSS 8.5.12 beziehungsweise 8.5.18 behoben.
- Next.js 16.2.12 erlaubt ausschließlich `sharp@^0.34.5`; die High-Advisory
  [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)
  ist erst ab Sharp 0.35.0 behoben.
- Der vollständige Audit meldet zusätzlich transitive Development-Funde in
  `brace-expansion` über ESLint beziehungsweise TypeScript-ESLint und in
  `fast-uri` über Stylelint/Ajv.

Die Anwendung nimmt weder fremdes CSS noch fremde Bilder entgegen. Das
reduziert die aktuell belegte Erreichbarkeit der beiden Production-Funde,
ersetzt aber keinen grünen Audit. Die CI-Auswertung bleibt deshalb absichtlich
ein Hard-Fail. Es gibt weder eine Advisory-Allowlist noch erzwungene Overrides
außerhalb der von Next.js unterstützten Versionsbereiche.

Der Blocker wird erst mit offiziell kompatiblen Upstream-Versionen aktualisiert.
Danach müssen beide Audit-Befehle, `npm run verify`, die vollständige
Chromium-Suite und die Firefox-/WebKit-Smokes erneut grün laufen. Bis dahin ist
der Stand lokal regressionsgeprüft, aber nicht als vollständig
produktionsfreigegeben zu bezeichnen.

`npm run test:e2e` baut die Anwendung und prüft standardmäßig den
Production-Server. Für eine schnelle lokale Diagnose gegen den Dev-Server
existiert separat:

```bash
npm run test:e2e:dev
```

`npm run test:e2e:cross-browser` baut denselben Production-Stand und führt nur
die mit `@cross-browser-smoke` markierten Dialog-, Fokus-, Cross-Tab- und
Download-Strecken in Firefox und WebKit aus. Visuelle Baselines bleiben
absichtlich auf Chromium begrenzt, weil Engine- und Plattformunterschiede dort
keine Produktregression belegen.

Die CI installiert, auditiert, typisiert und baut auf Ubuntu. Browser- und
Screenshot-Prüfungen laufen dagegen auf der ausdrücklich kanonischen
macOS-Plattform. Der Snapshot-Pfad enthält die Plattform, damit lokal erzeugte
macOS-Baselines niemals still als Linux-Evidenz verwendet oder überschrieben
werden. Ein grüner lokaler macOS-Lauf belegt noch keinen grünen GitHub-Runner;
dieser Nachweis entsteht erst durch den tatsächlich ausgeführten CI-Job.
Chromium und Firefox/WebKit verwenden denselben einmaligen Production-Build,
aber getrennte Report- und Result-Verzeichnisse. Die Cross-Browser-Smokes
laufen nach einem Chromium-Fehler weiter, sofern der gemeinsame Build
erfolgreich war, damit beide Diagnoseflächen erhalten bleiben.

## Testebenen

- Modelltests prüfen eindeutige Pfade, vollständige EN-/DE-Inhalte, Links und
  konsistente Navigation-, Footer-, SEO- und Sitemap-Projektionen. Eigene
  Domain-Tests prüfen außerdem API-Pfadparser, Response-Schema,
  LocalStorage-Schema und den deterministischen Contract-Export.
- Komponententests prüfen Menü-Zustände, Fokus, semantische Links, die passive
  Search-Fläche sowie API-Creator-Eingabe, Response-Overlay, erfolgreichen
  LocalStorage-Roundtrip und Download-Projektion. Sie prüfen außerdem
  Overlay-Replacement und Reentrancy mit exakt einmaliger Dismissal-Semantik
  sowie die aus CSS abgeleitete Exit-Absicherung.
- Genau ein Golden-Test friert die 15 öffentlichen URL-Pfade explizit ein.
  Alle weiteren Routing-, Axe- und SEO-Fälle werden aus den
  Produktionsvarianten des Routenkatalogs erzeugt.
- Routingtests prüfen Locale-Verhandlung, vollständige lokalisierte Chrome- und
  Metadata-Projektionen, negative URLs, `lang`, absolute Canonicals,
  Alternates, Robots und Sitemap.
- Interaktionstests prüfen Dialog-Escape, Fokus-Rückgabe, Scroll-Lock-Cleanup,
  das Schließen der mobilen Navigation beim Route-Wechsel, den semantischen
  Locale-Wechsel, die Sprachkontinuität auf der globalen Add-site-Route und das
  absichtlich inerte Search-Feld. Eigene Studio-Browsertests prüfen Route
  hinzufügen, Overlay-Escape mit Fokus-Rückgabe, persistierten Reload, echten
  Markdown-Download sowie blockierte Downloads bei ungültigem oder nicht
  verfügbarem LocalStorage. Ein eigener Konfliktfall belegt, dass inkompatible
  Response-Schemas mit demselben TypeScript-Typnamen nicht gespeichert werden.
  Vier risikobasierte Smoke-Fälle wiederholen native Dialog-, Fokus-,
  Cross-Tab- und
  Download-Semantik zusätzlich in Firefox und WebKit.
- Request-Tests prüfen die Anwendungssicherheitsheader sowohl auf einer
  lokalisierten Route als auch auf der globalen `/add-site`-Route.
- Accessibility-Tests prüfen den Default-Zustand aller 15 öffentlichen Routen
  mit Axe. Reflow, Overflow, Touchziele, Headerüberlappung, Textachsen, Reduced
  Motion und Forced Colors werden risikobasiert auf ausgewählten
  Seitenarchetypen und Viewports von 320 bis 1440 px geprüft.

## Visuelle Baselines

Die Suite enthält 24 risikobasierte Chromium-Baselines:

- Home, Search, Platzhalter und lokalisierte 404-Seite jeweils bei 390 und
  1440 px in Light und Dark;
- geöffneter mobiler Navigationsdialog in Light und Dark;
- geöffnetes Locale-Menü in Light und Dark;
- gefülltes API Creator Studio und geöffnetes Response-Overlay in Light und
  Dark.

Routing- und Default-Axe-Prüfungen decken jede öffentliche URL ab. Das API
Creator Studio besitzt eine fokussierte Playwright-Interaktionsstrecke und
eigene visuelle Baselines. Die sichtbare `volatile`-Warnung und der
Overlay-Unmount beim Browser-Route-Wechsel sind ebenfalls belegt; eine eigene
Zwei-Seiten-Strecke belegt außerdem die bidirektionale
Cross-Tab-Synchronisation für Hinzufügen, Methodenwechsel und Löschen sowie den
Vorrang ungesicherter `volatile`-Daten vor einem Peer-Write.

Ein normaler Testlauf darf die bestehenden Baselines nicht verändern.

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
