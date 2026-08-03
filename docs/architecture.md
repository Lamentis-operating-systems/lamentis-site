# Architektur

## Zielbild

Die Website besitzt eine gerichtete Datenflussgrenze:

```text
URL + Routenkatalog + lokalisierte Inhalte
  -> Navigation
  -> Footer
  -> Metadata
  -> Sitemap
  -> Seiten
```

`frontend/domain/site/routes.ts` ist die einzige Quelle für öffentliche
Segmente, Routenscope, geordnete Navigation-/Footer-Platzierungen und
SEO-Policies. Inhalte liegen in `frontend/domain/site/content.ts` als flache,
benannte englische und deutsche Route-Dictionaries. Der frameworkfreie
Assetkatalog in `frontend/domain/site/assets.ts` ist die einzige Quelle für
Markenzeichen, Social Image, Favicons, Apple Icons und Profilportrait.
`localeCatalog` bündelt Locale-Anzeigenamen und Open-Graph-Locale;
`siteConfig` enthält ausschließlich Markenname, Origin und externe Links.
SEO-Projektionen entstehen ausschließlich aus diesen Katalogen.

## Routingvertrag

| Route | Rendering | Indexierung |
| --- | --- | --- |
| `/` | 307 nach `/en` oder `/de` | keine Seite |
| `/en`, `/de` | statische Homepage | indexiert |
| `/{locale}/today` | statische leere Plattformseite | `noindex` |
| `/{locale}/trending` | statische leere Plattformseite | `noindex` |
| `/{locale}/search` | statische Search-Fläche ohne aktive Suche | `noindex` |
| `/{locale}/api-creator-studio` | statische Route mit lokaler API-Creator-Client-Insel | `noindex` |
| `/add-site` | globale leere Plattformseite mit ausgehandelter Inhaltssprache | `noindex` |
| `/{locale}/legal-notice` | statischer Platzhalter | `noindex` |
| `/{locale}/about/elias-papavlassopoulos` | statischer Platzhalter | `noindex` |
| unbekannte Locale oder Route | 404 | `noindex` |

Den Locale-Prefix für `/` verhandelt ausschließlich `frontend/proxy.ts`.
Alle lokalisierten Seiten validieren `Locale`. Die globale Route `/add-site`
besitzt bewusst keinen Locale-Prefix, keine lokalisierten Aliase und keine
hreflang-Alternativen. Der Wechsel zwischen dem globalen und dem lokalisierten
Root-Layout verursacht deshalb bewusst einen vollständigen Browser-Reload.
Beim Wechsel speichert die Add-site-Aktion die validierte Quell-Locale in einem
First-Party-Präferenz-Cookie. Die globale Server-Route verwendet diesen Wert und
fällt bei einem Direkteinstieg auf `Accept-Language` zurück. URL-Identität und
Canonical bleiben dabei unverändert global.
Alle anderen unpräfixierten Unterseiten bleiben 404.

Explizite App-Router-Dateien bleiben die Authority für die konkrete
Seitenkomponente. Der Routenkatalog modelliert deshalb keinen zweiten
Seitentyp. Die diskriminierte `RouteRef` unterscheidet lokalisierte und
globale Routen. Die öffentlichen Helfer `routePath`, `routeUrl`, `matchRoute`,
`switchLocalePath`, `routeAlternates`, `routeVariants` und `metadataForRoute`
verhindern freie Pfad- und SEO-Entscheidungen in Komponenten und Tests. Alle
Canonicals sind absolute URLs.

## Komponenten- und State-Grenzen

Server Components sind der Standard. Navigation, Locale-Umschalter und API
Creator Studio sind begrenzte Client-Inseln:

- Die Navigation besitzt ausschließlich lokalen Zustand für den mobilen Dialog.
- Der Locale-Umschalter besitzt ausschließlich lokalen Zustand für sein Menü.
- Auf lokalisierten Routen werden Locale und aktive Route aus der URL
  abgeleitet. Die globale Route besitzt keine URL-Locale und verwendet nur für
  ihre Inhaltssprache die validierte Präferenz mit `Accept-Language`-Fallback.
- Navigation und Footer erhalten getrennte Projektionen im gemeinsamen
  `SiteChromeModel` aus demselben Routenkatalog. Der Locale-Switcher ist darin
  entweder vollständig modelliert oder `null`; ein paralleles Boolean-Flag
  existiert nicht.
- Die primäre Navigation und die globale Add-site-Aktion werden mit ihren
  lokalisierten Titeln aus derselben Authority abgeleitet.
- `SearchPage` bleibt eine Server Component. Überschrift, Label und Placeholder
  stammen aus dem Locale-Dictionary. Das unkontrollierte Suchfeld besitzt weder
  Client-State noch Form-Action. Die gemeinsame, zustandsfreie
  `SearchSurface` stellt nur die visuelle und semantische Hülle bereit.
- `ApiCreatorStudio` ist eine eigene Client Component und verwendet dieselbe
  `SearchSurface`, ohne die passive Search-Route in seine Client-, Overlay- oder
  LocalStorage-Grenze einzubeziehen.
- Der `OverlayProvider` gehört ausschließlich zur
  `/{locale}/api-creator-studio`-Seite. Er umschließt weder Navigation noch
  Footer oder andere Seiten und wird bei einem Route-Wechsel zusammen mit der
  Studio-Seite entfernt.
- API-Routen liegen im Browser unter dem versionierten, schema-validierten
  LocalStorage-Eintrag `lamentis:api-creator-routes:v1`. Studio und Download
  lesen denselben `useSyncExternalStore`-Snapshot. Erfolgreiche Writes werden
  als gespeichert markiert; bei einem Write-Fehler bleibt der aktuelle Wert
  ausdrücklich nur als `volatile` im Tab verfügbar und die Oberfläche warnt vor
  einem Reload. Storage-Events synchronisieren andere Tabs.
- `METHOD + path` ist die kanonische Routenidentität. Der Editor verhindert
  neue doppelte Identitäten sowohl an der Eingabe als auch beim Methodenwechsel;
  numerische IDs bleiben ausschließlich stabile lokale Listenschlüssel.
- Response-Schemas werden im Domain-Layer kanonisch nach Feldnamen geordnet.
  Derselbe TypeScript-Typname darf auf mehreren Routen nur ein äquivalentes
  Schema bezeichnen. Der Editor verhindert neue inkompatible Definitionen und
  prüft beim tatsächlichen Write nochmals den aktuellen Routen-Snapshot.
  Bestehende v1-Konflikte bleiben lesbar und werden im Export weiterhin
  ausdrücklich als `BLOCKED` markiert, statt Daten still zu verwerfen.
- Die Navigation projiziert eine serialisierbare Action-Union. Der globale
  Add-site-Link ist die Default-Action; die API-Creator-Route überschreibt sie
  deklarativ mit dem Contract-Download. Desktop und Mobile rendern denselben
  Action-Vertrag. Der API-spezifische Download-/Storage-Client wird als eigener
  dynamischer Chunk nur auf der Studio-Route geladen.
- Gemeinsame Menüsemantik liegt in `SelectMenu`, `options-menu` und
  `useDismissiblePopover`. Icon-only Controls verwenden `IconButton` mit
  verpflichtendem zugänglichem Namen; visuell verborgene Beschriftungen
  verwenden `VisuallyHidden`. Kontextabhängige Farben, aktive Zustände und
  Layoutvarianten bleiben lokal.
- Jede Overlay-Anfrage besitzt intern einen eindeutigen Owner. Replacement,
  Cancel-Reentrancy, Animationsende und Timeout-Fallback können deshalb nur den
  zugehörigen Request schließen; `onDismiss` läuft höchstens einmal. Die
  Fallback-Dauer wird aus der berechneten CSS-Animationsdauer abgeleitet.
- Die Routentabelle baut pro Snapshot einmal einen
  `Map<path, Set<method>>`-Index. Deaktivierte Methoden werden daraus in
  konstanter Lookup-Zeit abgeleitet, statt die gesamte Liste je Tabellenzeile
  erneut zu durchsuchen.
- Interne Links verwenden `next/link`; externe Links bleiben explizit typisiert.

LocalStorage ist dabei weder Server-Authority noch Konto-, Geräte- oder
Cloud-Synchronisation. Die Versionsnummer schützt den Schema-Namensraum, belegt
aber noch keine Migration zwischen künftigen Versionen. Ungültiger oder nicht
verfügbarer Storage fällt auf den leeren validierten Default zurück; daraus darf
keine erfolgreiche Persistenz abgeleitet werden. Gleichzeitige Änderungen in
mehreren Tabs sind keine Transaktion: Storage-Events verteilen den jeweils
zuletzt geschriebenen vollständigen Snapshot (`last write wins`), ohne
automatischen Merge oder Konfliktauflösung. Ein bereits als `volatile`
markierter Tab-Snapshot hat dabei Vorrang vor späteren Storage-Events:
Peer-Writes und `clear()` dürfen ungesicherte lokale Routen nicht still
verwerfen. Der nächste erfolgreiche lokale Write persistiert wieder den
vollständigen Tab-Snapshot und kehrt zur normalen Event-Synchronisation zurück.

`/add-site` bleibt bewusst außerhalb des lokalisierten Root-Layouts. Der
Wechsel zwischen dieser globalen Route und einem lokalisierten Pfad lädt daher
das jeweilige Root-Layout vollständig neu.

Neue Shared Components sind nur sinnvoll, wenn mindestens zwei Verbraucher
existieren oder die Komponente eine eigenständige semantische Verantwortung
besitzt. Direkte Imports und Named Exports halten Abhängigkeiten sichtbar.

## Deployment

`vercel.json` im Repository-Root ist die einzige getrackte
Vercel-Buildkonfiguration. Das kanonische Vercel-Projekt `frontend` baut den
Anwendungscode aus `frontend`; `main` ist der Produktionsbranch und `dev` der
langlebige Preview-Branch. Domain-, DNS- und Git-Integrationseinstellungen sind
Provider-Zustand und werden nicht durch veraltete Alias- oder
`github.silent`-Eigenschaften in `vercel.json` gespiegelt. Der vollständige
Vertrag und seine getrennten Nachweise stehen in [Deployment](deployment.md).
