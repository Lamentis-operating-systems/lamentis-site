export const supportedLocales = ["en", "de"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

const localizedRouteIds = [
  "home",
  "today",
  "trending",
  "search",
  "legalNotice",
  "about",
] as const;

export type LocalizedRouteId = (typeof localizedRouteIds)[number];

const globalRouteIds = ["addSite"] as const;

export type GlobalRouteId = (typeof globalRouteIds)[number];

export const siteRouteIds = [...localizedRouteIds, ...globalRouteIds] as const;

export type SiteRouteId = (typeof siteRouteIds)[number];

export const primaryNavigationRouteIds = [
  "today",
  "trending",
  "search",
  "home",
] as const satisfies readonly LocalizedRouteId[];

export const primarySectionRouteIds = [
  "today",
  "trending",
  "search",
] as const satisfies readonly LocalizedRouteId[];

export type PrimarySectionRouteId = (typeof primarySectionRouteIds)[number];

export type SiteIconSetId = "site" | "about";

type RouteDefinitionBase = {
  kind: "home" | "empty" | "search" | "placeholder";
  indexable: boolean;
  iconSet: SiteIconSetId;
};

type LocalizedRouteDefinition = RouteDefinitionBase & {
  scope: "localized";
  id: LocalizedRouteId;
  segments: Readonly<Record<Locale, readonly string[]>>;
};

type GlobalRouteDefinition = RouteDefinitionBase & {
  scope: "global";
  id: GlobalRouteId;
  path: `/${string}`;
  documentLocale: Locale;
  indexable: false;
};

export type SiteRouteDefinition = LocalizedRouteDefinition | GlobalRouteDefinition;

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
    scope: "localized",
    id: "home",
    kind: "home",
    indexable: true,
    iconSet: "site",
    segments: { en: [], de: [] },
  },
  today: {
    scope: "localized",
    id: "today",
    kind: "empty",
    indexable: false,
    iconSet: "site",
    segments: { en: ["today"], de: ["today"] },
  },
  trending: {
    scope: "localized",
    id: "trending",
    kind: "empty",
    indexable: false,
    iconSet: "site",
    segments: { en: ["trending"], de: ["trending"] },
  },
  search: {
    scope: "localized",
    id: "search",
    kind: "search",
    indexable: false,
    iconSet: "site",
    segments: { en: ["search"], de: ["search"] },
  },
  addSite: {
    scope: "global",
    id: "addSite",
    kind: "empty",
    indexable: false,
    iconSet: "site",
    path: "/add-site",
    documentLocale: defaultLocale,
  },
  legalNotice: {
    scope: "localized",
    id: "legalNotice",
    kind: "placeholder",
    indexable: false,
    iconSet: "site",
    segments: { en: ["legal-notice"], de: ["legal-notice"] },
  },
  about: {
    scope: "localized",
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

export const externalLinks = {
  github: "https://github.com/Lamentis-O",
} as const;

export const siteName = "Lamentis";
export const siteUrl = "https://lamentis.de";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (supportedLocales as readonly string[]).includes(value));
}

export function isPrimarySectionRouteId(value: SiteRouteId): value is PrimarySectionRouteId {
  return (primarySectionRouteIds as readonly SiteRouteId[]).includes(value);
}

export function routePath(locale: Locale, routeId: LocalizedRouteId): string;
export function routePath(routeId: GlobalRouteId): string;
export function routePath(
  localeOrRouteId: Locale | GlobalRouteId,
  localizedRouteId?: LocalizedRouteId,
): string {
  if (localizedRouteId) {
    const segments = siteRoutes[localizedRouteId].segments[localeOrRouteId as Locale];
    return segments.length === 0
      ? `/${localeOrRouteId}`
      : `/${localeOrRouteId}/${segments.join("/")}`;
  }

  return siteRoutes[localeOrRouteId as GlobalRouteId].path;
}

export function routeUrl(locale: Locale, routeId: LocalizedRouteId): string;
export function routeUrl(routeId: GlobalRouteId): string;
export function routeUrl(
  localeOrRouteId: Locale | GlobalRouteId,
  localizedRouteId?: LocalizedRouteId,
): string {
  const path = localizedRouteId
    ? routePath(localeOrRouteId as Locale, localizedRouteId)
    : routePath(localeOrRouteId as GlobalRouteId);
  return new URL(path, siteUrl).toString();
}

export function routeAlternates(
  routeId: LocalizedRouteId,
): Record<Locale | "x-default", string> {
  return {
    en: routeUrl("en", routeId),
    de: routeUrl("de", routeId),
    "x-default": routeUrl(defaultLocale, routeId),
  };
}

export type MatchedSiteRoute =
  | {
      scope: "localized";
      locale: Locale;
      routeId: LocalizedRouteId;
    }
  | {
      scope: "global";
      locale: null;
      routeId: GlobalRouteId;
    };

export function matchRoute(pathname: string): MatchedSiteRoute | null {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] ?? "/";
  const globalRouteId = globalRouteIds.find(
    (routeId) => siteRoutes[routeId].path === normalizedPath,
  );

  if (globalRouteId) {
    return { scope: "global", locale: null, routeId: globalRouteId };
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const [localeCandidate, ...routeSegments] = segments;

  if (!isSupportedLocale(localeCandidate)) {
    return null;
  }

  const routeId = localizedRouteIds.find((candidate) => {
    const candidateSegments = siteRoutes[candidate].segments[localeCandidate];
    return candidateSegments.length === routeSegments.length
      && candidateSegments.every((segment, index) => segment === routeSegments[index]);
  });

  return routeId
    ? { scope: "localized", locale: localeCandidate, routeId }
    : null;
}

export function switchLocalePath(pathname: string, targetLocale: Locale): string {
  const match = matchRoute(pathname);
  if (match?.scope === "global") return routePath(match.routeId);
  return routePath(targetLocale, match?.routeId ?? "home");
}

export type SiteRouteVariant =
  | {
      scope: "localized";
      locale: Locale;
      path: string;
      routeId: LocalizedRouteId;
      url: string;
    }
  | {
      scope: "global";
      locale: null;
      path: string;
      routeId: GlobalRouteId;
      url: string;
    };

export function routeVariants(routeId: SiteRouteId): readonly SiteRouteVariant[] {
  const route = siteRoutes[routeId];

  if (route.scope === "global") {
    return [{
      scope: "global",
      locale: null,
      path: route.path,
      routeId: route.id,
      url: routeUrl(route.id),
    }];
  }

  return supportedLocales.map((locale) => ({
    scope: "localized" as const,
    locale,
    path: routePath(locale, route.id),
    routeId: route.id,
    url: routeUrl(locale, route.id),
  }));
}

export const indexableRouteIds: readonly SiteRouteId[] = siteRouteIds.filter(
  (routeId) => siteRoutes[routeId].indexable,
);
