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

### Transitive Security-Pins

Next.js 16.2.12 pinnt noch verwundbare Versionen von PostCSS und Sharp. Weitere
High-Advisories stammen aus transitiven Development-Abhängigkeiten von ESLint,
TypeScript-ESLint und Stylelint. Das Manifest überschreibt deshalb ausschließlich
die konkret betroffenen Versionen:

- `postcss@8.4.31` wird durch `8.5.25` ersetzt.
- `sharp@0.34.5` wird durch `0.35.3` ersetzt.
- Verwundbare `brace-expansion`-Hauptlinien werden durch die sichere
  Upstream-Version `5.0.8` ersetzt. Ein versiongesichertes `postinstall`-Skript
  ergänzt ausschließlich deren CommonJS-Export um die von alten
  `minimatch`-Verbrauchern erwartete Funktionsform; der benannte `expand`-Export
  bleibt erhalten. Das Skript schlägt bei einer unerwarteten Upstream-Version
  hart fehl.
- `fast-uri@3.1.3` wird durch `3.1.4` ersetzt.

Der Sharp-Pin liegt bewusst außerhalb des derzeit von Next.js deklarierten
Bereichs `^0.34.5`. Er ist daher eine zeitlich begrenzte
Kompatibilitätsüberbrückung und muss entfernt werden, sobald Next.js eine sichere
Sharp-Version deklariert. Ein Next.js-Downgrade über `npm audit fix --force`
ist ausgeschlossen.

`@axe-core/playwright` erlaubt einen offenen `playwright-core`-Bereich. Der
Override hält ihn auf `1.61.1` und damit exakt auf dem Stand des getrackten
`@playwright/test`, damit keine inkompatiblen `Page`-Typen parallel installiert
werden.

Die CI-Audits bleiben unveränderte Hard-Fails; es gibt weder Advisory-Allowlist
noch `continue-on-error`. Jede Änderung an den Pins muss beide Audit-Befehle,
`npm run verify`, die vollständige Chromium-Suite und die
Firefox-/WebKit-Smokes erneut grün durchlaufen.

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
