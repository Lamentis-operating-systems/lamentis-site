import type { IconSetId, SocialImageId } from "./assets";

export const localeCatalog = {
  en: {
    direction: "ltr",
    label: "English",
    openGraphLocale: "en_US",
  },
  de: {
    direction: "ltr",
    label: "Deutsch",
    openGraphLocale: "de_DE",
  },
} as const;

export type Locale = keyof typeof localeCatalog;

export const supportedLocales = Object.freeze(
  Object.keys(localeCatalog) as Locale[],
);

export const defaultLocale: Locale = "en";

export const siteConfig = {
  brandName: "Lamentis",
  origin: "https://lamentis.de",
  externalLinks: {
    github: "https://github.com/Lamentis-O",
  },
} as const;

export type FooterSectionId = "platform" | "legal" | "links";
export type NavigationArea = "primary" | "action";
type SiteStructuredDataType = "organization";

type NavigationPlacement = {
  area: NavigationArea;
  order: number;
};

type FooterPlacement = {
  section: FooterSectionId;
  order: number;
  icon: "profile" | null;
};

type SiteRouteSeoPolicy = {
  index: boolean;
  iconSet: IconSetId;
  socialImage: SocialImageId | null;
  structuredData: SiteStructuredDataType | null;
};

type RouteDefinitionBase = {
  placement: {
    navigation: NavigationPlacement | null;
    footer: FooterPlacement | null;
  };
  seo: SiteRouteSeoPolicy;
};

type LocalizedRouteDefinition = RouteDefinitionBase & {
  scope: "localized";
  segments: Readonly<Record<Locale, readonly string[]>>;
};

type GlobalRouteDefinition = RouteDefinitionBase & {
  scope: "global";
  path: `/${string}`;
};

export type SiteRouteDefinition =
  | LocalizedRouteDefinition
  | GlobalRouteDefinition;

export const siteRoutes = {
  home: {
    scope: "localized",
    segments: { en: [], de: [] },
    placement: {
      navigation: { area: "primary", order: 10 },
      footer: { section: "platform", order: 40, icon: null },
    },
    seo: {
      index: true,
      iconSet: "site",
      socialImage: "site",
      structuredData: "organization",
    },
  },
  today: {
    scope: "localized",
    segments: { en: ["today"], de: ["today"] },
    placement: {
      navigation: null,
      footer: { section: "platform", order: 10, icon: null },
    },
    seo: {
      index: false,
      iconSet: "site",
      socialImage: null,
      structuredData: null,
    },
  },
  trending: {
    scope: "localized",
    segments: { en: ["trending"], de: ["trending"] },
    placement: {
      navigation: null,
      footer: { section: "platform", order: 20, icon: null },
    },
    seo: {
      index: false,
      iconSet: "site",
      socialImage: null,
      structuredData: null,
    },
  },
  search: {
    scope: "localized",
    segments: { en: ["search"], de: ["search"] },
    placement: {
      navigation: null,
      footer: { section: "platform", order: 30, icon: null },
    },
    seo: {
      index: false,
      iconSet: "site",
      socialImage: null,
      structuredData: null,
    },
  },
  apiCreatorStudio: {
    scope: "localized",
    segments: {
      en: ["api-creator-studio"],
      de: ["api-creator-studio"],
    },
    placement: {
      navigation: { area: "primary", order: 20 },
      footer: null,
    },
    seo: {
      index: false,
      iconSet: "site",
      socialImage: null,
      structuredData: null,
    },
  },
  addSite: {
    scope: "global",
    path: "/add-site",
    placement: {
      navigation: { area: "action", order: 10 },
      footer: null,
    },
    seo: {
      index: false,
      iconSet: "site",
      socialImage: null,
      structuredData: null,
    },
  },
  legalNotice: {
    scope: "localized",
    segments: { en: ["legal-notice"], de: ["legal-notice"] },
    placement: {
      navigation: null,
      footer: { section: "legal", order: 10, icon: null },
    },
    seo: {
      index: false,
      iconSet: "site",
      socialImage: null,
      structuredData: null,
    },
  },
  about: {
    scope: "localized",
    segments: {
      en: ["about", "elias-papavlassopoulos"],
      de: ["about", "elias-papavlassopoulos"],
    },
    placement: {
      navigation: null,
      footer: { section: "links", order: 10, icon: "profile" },
    },
    seo: {
      index: false,
      iconSet: "about",
      socialImage: null,
      structuredData: null,
    },
  },
} as const satisfies Record<string, SiteRouteDefinition>;

export type SiteRouteId = keyof typeof siteRoutes;

type RouteIdForScope<Scope extends SiteRouteDefinition["scope"]> = {
  [RouteId in SiteRouteId]: (typeof siteRoutes)[RouteId]["scope"] extends Scope
    ? RouteId
    : never;
}[SiteRouteId];

export type LocalizedRouteId = RouteIdForScope<"localized">;
type GlobalRouteId = RouteIdForScope<"global">;

type LocalizedRouteRef = {
  scope: "localized";
  routeId: LocalizedRouteId;
  locale: Locale;
};

type GlobalRouteRef = {
  scope: "global";
  routeId: GlobalRouteId;
};

export type RouteRef = LocalizedRouteRef | GlobalRouteRef;

export type InternalLink = (
  | LocalizedRouteRef
  | GlobalRouteRef
) & {
  kind: "internal";
  id: string;
};

export type ExternalLink = {
  kind: "external";
  id: string;
  href: `https://${string}`;
  newWindow: true;
};

export const siteRouteIds = Object.freeze(
  Object.keys(siteRoutes) as SiteRouteId[],
);

const localizedRouteIds = Object.freeze(
  siteRouteIds.filter(
    (routeId): routeId is LocalizedRouteId => siteRoutes[routeId].scope === "localized",
  ),
);

const globalRouteIds = Object.freeze(
  siteRouteIds.filter(
    (routeId): routeId is GlobalRouteId => siteRoutes[routeId].scope === "global",
  ),
);

export function isSupportedLocale(
  value: string | null | undefined,
): value is Locale {
  return typeof value === "string"
    && Object.prototype.hasOwnProperty.call(localeCatalog, value);
}

export function isLocalizedRouteId(
  routeId: SiteRouteId,
): routeId is LocalizedRouteId {
  return siteRoutes[routeId].scope === "localized";
}

function isGlobalRouteId(
  routeId: SiteRouteId,
): routeId is GlobalRouteId {
  return siteRoutes[routeId].scope === "global";
}

export function navigationRouteIds(
  area: NavigationArea,
): readonly SiteRouteId[] {
  return siteRouteIds
    .filter((routeId) => siteRoutes[routeId].placement.navigation?.area === area)
    .sort((left, right) => {
      const leftOrder = siteRoutes[left].placement.navigation?.order ?? 0;
      const rightOrder = siteRoutes[right].placement.navigation?.order ?? 0;
      return leftOrder - rightOrder;
    });
}

export function footerRouteIds(
  section: FooterSectionId,
): readonly SiteRouteId[] {
  return siteRouteIds
    .filter((routeId) => siteRoutes[routeId].placement.footer?.section === section)
    .sort((left, right) => {
      const leftOrder = siteRoutes[left].placement.footer?.order ?? 0;
      const rightOrder = siteRoutes[right].placement.footer?.order ?? 0;
      return leftOrder - rightOrder;
    });
}

function requireLocalizedRouteIds(
  routeIds: readonly SiteRouteId[],
): readonly LocalizedRouteId[] {
  if (!routeIds.every(isLocalizedRouteId)) {
    throw new Error("Primary navigation routes must be localized.");
  }

  return routeIds;
}

export const primaryNavigationRouteIds = Object.freeze(
  requireLocalizedRouteIds(navigationRouteIds("primary")),
);

export const indexableRouteIds = Object.freeze(
  siteRouteIds.filter((routeId) => siteRoutes[routeId].seo.index),
);

export function routePath(ref: RouteRef): string {
  if (ref.scope === "global") {
    return siteRoutes[ref.routeId].path;
  }

  const segments = siteRoutes[ref.routeId].segments[ref.locale];
  return segments.length === 0
    ? `/${ref.locale}`
    : `/${ref.locale}/${segments.join("/")}`;
}

export function routeUrl(ref: RouteRef): string {
  return new URL(routePath(ref), siteConfig.origin).toString();
}

export function routeAlternates(
  routeId: LocalizedRouteId,
): Record<Locale | "x-default", string> {
  const localizedAlternates = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      routeUrl({ scope: "localized", locale, routeId }),
    ]),
  ) as Record<Locale, string>;

  return {
    ...localizedAlternates,
    "x-default": routeUrl({
      scope: "localized",
      locale: defaultLocale,
      routeId,
    }),
  };
}

export function matchRoute(pathname: string): RouteRef | null {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] ?? "/";
  const globalRouteId = globalRouteIds.find(
    (routeId) => siteRoutes[routeId].path === normalizedPath,
  );

  if (globalRouteId) {
    return { scope: "global", routeId: globalRouteId };
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const [localeCandidate, ...routeSegments] = segments;

  if (!isSupportedLocale(localeCandidate)) {
    return null;
  }

  const routeId = localizedRouteIds.find((candidate) => {
    const candidateSegments = siteRoutes[candidate].segments[localeCandidate];
    return candidateSegments.length === routeSegments.length
      && candidateSegments.every(
        (segment, index) => segment === routeSegments[index],
      );
  });

  return routeId
    ? { scope: "localized", locale: localeCandidate, routeId }
    : null;
}

export function switchLocalePath(
  pathname: string,
  targetLocale: Locale,
): string {
  const match = matchRoute(pathname);

  if (match?.scope === "global") {
    return routePath(match);
  }

  return routePath({
    scope: "localized",
    locale: targetLocale,
    routeId: match?.routeId ?? "home",
  });
}

export type SiteRouteVariant = RouteRef & {
  path: string;
  url: string;
};

export function routeVariants(
  routeId: SiteRouteId,
): readonly SiteRouteVariant[] {
  if (isGlobalRouteId(routeId)) {
    const ref: GlobalRouteRef = { scope: "global", routeId };
    return [{ ...ref, path: routePath(ref), url: routeUrl(ref) }];
  }

  return supportedLocales.map((locale) => {
    const ref: LocalizedRouteRef = { scope: "localized", locale, routeId };
    return { ...ref, path: routePath(ref), url: routeUrl(ref) };
  });
}
