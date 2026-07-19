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
| `/add-site` | statische globale leere Plattformseite | `noindex` |
| `/{locale}/legal-notice` | statischer Platzhalter | `noindex` |
| `/{locale}/about/elias-papavlassopoulos` | statischer Platzhalter | `noindex` |
| unbekannte Locale oder Route | 404 | `noindex` |

Nur `frontend/proxy.ts` verhandelt die Sprache und ausschließlich für `/`.
Alle lokalisierten Seiten validieren `Locale`. Die globale Route `/add-site`
besitzt bewusst keinen Locale-Prefix, keine lokalisierten Aliase und keine
hreflang-Alternativen. Der Wechsel zwischen dem globalen und dem lokalisierten
Root-Layout verursacht deshalb bewusst einen vollständigen Browser-Reload.
Alle anderen unpräfixierten Unterseiten bleiben 404.

Explizite App-Router-Dateien bleiben die Authority für die konkrete
Seitenkomponente. Der Routenkatalog modelliert deshalb keinen zweiten
Seitentyp. Die diskriminierte `RouteRef` unterscheidet lokalisierte und
globale Routen. Die öffentlichen Helfer `routePath`, `routeUrl`, `matchRoute`,
`switchLocalePath`, `routeAlternates`, `routeVariants` und `metadataForRoute`
verhindern freie Pfad- und SEO-Entscheidungen in Komponenten und Tests. Alle
Canonicals sind absolute URLs.

## Komponenten- und State-Grenzen

Server Components sind der Standard. Navigation und Locale-Umschalter sind
kleine Client-Inseln:

- Die Navigation besitzt ausschließlich lokalen Zustand für den mobilen Dialog.
- Der Locale-Umschalter besitzt ausschließlich lokalen Zustand für sein Menü.
- Locale und aktive Route werden immer aus der URL abgeleitet.
- Navigation und Footer erhalten getrennte Projektionen im gemeinsamen
  `SiteChromeModel` aus demselben Routenkatalog. Der Locale-Switcher ist darin
  entweder vollständig modelliert oder `null`; ein paralleles Boolean-Flag
  existiert nicht.
- Die primäre Navigation projiziert `Today`, `Trending`, `Search` und `Home`;
  die globale Add-site-Aktion wird aus derselben Authority abgeleitet.
- Die Search-Fläche ist eine Server Component. Überschrift, Label und
  Placeholder stammen aus dem Locale-Dictionary. Das unkontrollierte Suchfeld
  besitzt weder Client-State noch Form-Action; ausschließlich die explizite
  Search-Route wählt diese Seitenkomponente.
- Interne Links verwenden `next/link`; externe Links bleiben explizit typisiert.

`/add-site` bleibt bewusst außerhalb des lokalisierten Root-Layouts. Der
Wechsel zwischen dieser globalen Route und einem lokalisierten Pfad lädt daher
das jeweilige Root-Layout vollständig neu.

Neue Shared Components sind nur sinnvoll, wenn mindestens zwei Verbraucher
existieren oder die Komponente eine eigenständige semantische Verantwortung
besitzt. Direkte Imports und Named Exports halten Abhängigkeiten sichtbar.

## Deployment

`vercel.json` im Repository-Root ist die einzige Deployment-Konfiguration. Ein
Deployment gehört nicht zu einem normalen Refactor und wird separat ausgelöst.
