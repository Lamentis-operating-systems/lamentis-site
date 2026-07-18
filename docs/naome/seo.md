# SEO and GEO

Status: Active

## Ownership

- SEO/GEO primitives live in `frontend/domain/site/seo.ts`.
- Localized page copy lives in `frontend/domain/site/content.ts`.
- Route pages consume helpers instead of hand-writing repeated metadata.

## Page Metadata Standard

Indexable localized pages should provide:

- Browser title through Next.js metadata.
- Localized meta description.
- Canonical URL on `https://lamentis.de`.
- `hreflang` alternates for `en`, `de`, and `x-default`.
- Open Graph metadata with a relevant image.
- Twitter card metadata.
- JSON-LD when the page describes an organization, person, project, or legal entity.

Placeholder pages may have complete titles and descriptions but should use
`noindex` until they contain useful page content.

## Current Routes

- `/en` and `/de`: Organization metadata and homepage sitemap entries.
- `/en/about/elias-papavlassopoulos` and `/de/about/elias-papavlassopoulos`:
  Person metadata, portrait Open Graph image, and page-specific favicon.
- `/en/legal-notice` and `/de/legal-notice`: indexable legal entries.
- `/nox` and `/noma` localized routes: noindex placeholders.

## Verification

- `npm run --prefix frontend build`
- Inspect page head for title, description, canonical, alternates, Open Graph,
  Twitter tags, and JSON-LD.
- Inspect `/robots.txt` and `/sitemap.xml`.
