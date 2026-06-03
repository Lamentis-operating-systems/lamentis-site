import type { Locale } from "./content";
import { naomeArticles } from "./naome-page";
import { naomeJsonLdBase } from "./naome-page-seo";
import { localizedUrl } from "./seo";

export {
  naomeFaqJsonLd,
  naomeSectionListJsonLd,
} from "./naome-page-secondary-jsonld";

function naomeSoftwareApplication({
  description,
  keywords,
  locale,
  sectionHeadlines,
}: {
  description: string;
  keywords: string[];
  locale: Locale;
  sectionHeadlines: string[];
}) {
  return {
    "@type": "SoftwareApplication",
    name: "NAOME",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Autopoietic Software OS",
    description,
    operatingSystem: "Cross-platform",
    inLanguage: locale,
    keywords: keywords.join(", "),
    codeRepository: "https://github.com/Lamentis-O/naome",
    featureList: sectionHeadlines,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };
}

function naomeAboutThing(locale: Locale, url: string) {
  return {
    "@type": "Thing",
    name:
      locale === "de"
        ? "Autopoietisches Software-OS"
        : "Autopoietic Software OS",
    description:
      locale === "de"
        ? "Ein Repository-First Operating-System für kontrollierte Software-Weiterentwicklung."
        : "A repository-first operating system for controlled software evolution.",
    url,
    sameAs: "https://github.com/Lamentis-O/naome",
  };
}

export function naomeJsonLd({ locale }: { locale: Locale }) {
  const base = naomeJsonLdBase(locale);
  const sectionHeadlines = naomeArticles[locale].map((article) => article.headline);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": base.url,
    url: base.url,
    name: base.title,
    description: base.description,
    inLanguage: locale,
    dateModified: base.lastModified,
    datePublished: "2026-05-23",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".ds-naome-hero__tagline", "h1.ds-product-title"],
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: locale === "de" ? "Startseite" : "Home",
          item: localizedUrl(locale, "/"),
        },
        { "@type": "ListItem", position: 2, name: "NAOME", item: base.url },
      ],
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${base.url}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    isPartOf: {
      "@type": "WebSite",
      name: base.siteName,
      url: localizedUrl(locale, "/"),
    },
    mainEntity: naomeSoftwareApplication({
      description: base.description,
      keywords: base.keywords,
      locale,
      sectionHeadlines,
    }),
    hasPart: {
      "@type": "ItemList",
      numberOfItems: naomeArticles[locale].length,
      itemListElement: naomeArticles[locale].map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.label,
        item: `${base.url}#${article.id}`,
      })),
    },
    about: naomeAboutThing(locale, base.url),
    spatialCoverage: {
      "@type": "Place",
      name: base.geoPlacename,
      geo: {
        "@type": "GeoCoordinates",
        latitude: base.latitude,
        longitude: base.longitude,
      },
    },
    publisher: {
      "@type": "Organization",
      name: base.siteName,
      url: localizedUrl(locale, "/"),
      areaServed: { "@type": "Country", name: base.geoPlacename },
    },
    isAccessibleForFree: true,
    additionalType: "https://schema.org/TechArticle",
    areaServed: {
      "@type": "Country",
      name: base.geoPlacename,
      sameAs: `https://www.iso.org/obp/ui/en/#iso:3166:${base.geoRegion}`,
    },
    audience: {
      "@type": "Audience",
      audienceType: "Software engineers and engineering teams",
      geographicArea: { "@type": "AdministrativeArea", name: base.geoPlacename },
    },
  };
}
