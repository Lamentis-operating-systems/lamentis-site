export const supportedLocales = ["en", "de"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

export const siteRouteIds = [
  "home",
  "noma",
  "nox",
  "legalNotice",
  "about",
] as const;

export type SiteRouteId = (typeof siteRouteIds)[number];

const productIds = ["noma", "nox"] as const;

export type ProductId = (typeof productIds)[number];

export type SiteIconSetId = "site" | "about";

export type SiteRouteDefinition = {
  id: SiteRouteId;
  kind: "home" | "product" | "placeholder";
  indexable: boolean;
  iconSet: SiteIconSetId;
  segments: Readonly<Record<Locale, readonly string[]>>;
  productId?: ProductId;
};

export type ProductDefinition = {
  id: ProductId;
  routeId: Extract<SiteRouteId, "noma" | "nox">;
  title: string;
  repositoryUrl: `https://${string}`;
};

export type InternalLink = {
  kind: "internal";
  id: string;
  routeId: SiteRouteId;
};

export type ExternalLink = {
  kind: "external";
  id: string;
  href: `https://${string}`;
  newWindow: true;
};

export const siteRoutes = {
  home: {
    id: "home",
    kind: "home",
    indexable: true,
    iconSet: "site",
    segments: { en: [], de: [] },
  },
  noma: {
    id: "noma",
    kind: "product",
    indexable: false,
    iconSet: "site",
    productId: "noma",
    segments: { en: ["noma"], de: ["noma"] },
  },
  nox: {
    id: "nox",
    kind: "product",
    indexable: false,
    iconSet: "site",
    productId: "nox",
    segments: { en: ["nox"], de: ["nox"] },
  },
  legalNotice: {
    id: "legalNotice",
    kind: "placeholder",
    indexable: false,
    iconSet: "site",
    segments: { en: ["legal-notice"], de: ["legal-notice"] },
  },
  about: {
    id: "about",
    kind: "placeholder",
    indexable: false,
    iconSet: "about",
    segments: {
      en: ["about", "elias-papavlassopoulos"],
      de: ["about", "elias-papavlassopoulos"],
    },
  },
} as const satisfies Record<SiteRouteId, SiteRouteDefinition>;

export const productOrder = ["noma", "nox"] as const satisfies readonly ProductId[];

export const products = {
  noma: {
    id: "noma",
    routeId: "noma",
    title: "Noma Tasks",
    repositoryUrl: "https://github.com/Lamentis-O/noma",
  },
  nox: {
    id: "nox",
    routeId: "nox",
    title: "NOX",
    repositoryUrl: "https://github.com/Lamentis-O/nox",
  },
} as const satisfies Record<ProductId, ProductDefinition>;

export const externalLinks = {
  github: "https://github.com/Lamentis-O",
} as const;

export const siteName = "Lamentis";
export const siteUrl = "https://lamentis.de";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (supportedLocales as readonly string[]).includes(value));
}

export function isProductId(value: string | null | undefined): value is ProductId {
  return Boolean(value && (productIds as readonly string[]).includes(value));
}

export function routePath(locale: Locale, routeId: SiteRouteId): string {
  const segments = siteRoutes[routeId].segments[locale];
  return segments.length === 0 ? `/${locale}` : `/${locale}/${segments.join("/")}`;
}

export function routeUrl(locale: Locale, routeId: SiteRouteId): string {
  return new URL(routePath(locale, routeId), siteUrl).toString();
}

export function routeAlternates(routeId: SiteRouteId): Record<Locale | "x-default", string> {
  return {
    en: routeUrl("en", routeId),
    de: routeUrl("de", routeId),
    "x-default": routeUrl(defaultLocale, routeId),
  };
}

export type MatchedSiteRoute = {
  locale: Locale;
  routeId: SiteRouteId;
};

export function matchRoute(pathname: string): MatchedSiteRoute | null {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] ?? "/";
  const segments = normalizedPath.split("/").filter(Boolean);
  const [localeCandidate, ...routeSegments] = segments;

  if (!isSupportedLocale(localeCandidate)) {
    return null;
  }

  const routeId = siteRouteIds.find((candidate) => {
    const candidateSegments = siteRoutes[candidate].segments[localeCandidate];
    return candidateSegments.length === routeSegments.length
      && candidateSegments.every((segment, index) => segment === routeSegments[index]);
  });

  return routeId ? { locale: localeCandidate, routeId } : null;
}

export function switchLocalePath(pathname: string, targetLocale: Locale): string {
  const match = matchRoute(pathname);
  return routePath(targetLocale, match?.routeId ?? "home");
}

export const indexableRouteIds = siteRouteIds.filter(
  (routeId) => siteRoutes[routeId].indexable,
);
