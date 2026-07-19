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
Segmente, Seitentypen, Produktzuordnung und Indexierbarkeit. Inhalte liegen in
`frontend/domain/site/content.ts` als benannte englische und deutsche
Dictionaries. SEO-Projektionen entstehen in `frontend/domain/site/seo.ts` aus
dem Routenkatalog und den Inhalten.

## Routingvertrag

| Route | Rendering | Indexierung |
| --- | --- | --- |
| `/` | 307 nach `/en` oder `/de` | keine Seite |
| `/en`, `/de` | statische Homepage | indexiert |
| `/{locale}/nox`, `/{locale}/noma` | statische Produktseite | `noindex` |
| `/{locale}/legal-notice` | statischer Platzhalter | `noindex` |
| `/{locale}/about/elias-papavlassopoulos` | statischer Platzhalter | `noindex` |
| unbekannte Locale oder Route | 404 | `noindex` |

Nur `frontend/proxy.ts` verhandelt die Sprache und ausschließlich für `/`.
Alle lokalisierten Seiten validieren `Locale`; dynamische Produktparameter sind
auf NOX und Noma begrenzt. Unpräfixierte Unterseiten werden nicht umgeleitet.

Die öffentlichen Helfer `routePath`, `matchRoute`, `switchLocalePath`,
`routeAlternates` und `metadataForRoute` verhindern freie Pfad- und
SEO-Entscheidungen in Komponenten.

## Komponenten- und State-Grenzen

Server Components sind der Standard. Navigation und Locale-Umschalter sind
kleine Client-Inseln:

- Die Navigation besitzt ausschließlich lokalen Zustand für den mobilen Dialog.
- Der Locale-Umschalter besitzt ausschließlich lokalen Zustand für sein Menü.
- Locale und aktive Route werden immer aus der URL abgeleitet.
- Navigation und Footer erhalten getrennte Projektionen aus demselben
  Routenkatalog.
- Interne Links verwenden `next/link`; externe Links bleiben explizit typisiert.

Neue Shared Components sind nur sinnvoll, wenn mindestens zwei Verbraucher
existieren oder die Komponente eine eigenständige semantische Verantwortung
besitzt. Direkte Imports und Named Exports halten Abhängigkeiten sichtbar.

## Deployment

`vercel.json` im Repository-Root ist die einzige Deployment-Konfiguration. Ein
Deployment gehört nicht zu einem normalen Refactor und wird separat ausgelöst.
