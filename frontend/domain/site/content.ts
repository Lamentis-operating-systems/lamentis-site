import {
  defaultLocale,
  footerRouteIds,
  isLocalizedRouteId,
  localeCatalog,
  navigationRouteIds,
  primaryNavigationRouteIds,
  routePath,
  siteConfig,
  siteRoutes,
  type ExternalLink,
  type FooterSectionId,
  type InternalLink,
  type Locale,
  type RouteRef,
  type SiteRouteId,
} from "./routes";

export type RouteCopy = {
  title: string;
  description: string;
};

export type SearchContent = {
  heading: string;
  label: string;
  placeholder: string;
};

type LocalizedSiteContent = {
  routes: Record<SiteRouteId, RouteCopy>;
  search: SearchContent;
  placeholderStatus: string;
  navigation: {
    ariaLabel: string;
    homeLabel: string;
    openMenuLabel: string;
    closeMenuLabel: string;
  };
  footer: {
    sections: Record<FooterSectionId, { title: string }>;
    githubLabel: string;
    languageLabel: string;
    copyright: string;
    productionCredit: string;
  };
  notFound: {
    title: string;
    description: string;
    homeLabel: string;
  };
};

export const contentByLocale = {
  en: {
    routes: {
      home: {
        title: "Home",
        description: "Lamentis home.",
      },
      today: {
        title: "Today",
        description: "Today's sites on Lamentis.",
      },
      trending: {
        title: "Trending",
        description: "Trending sites on Lamentis.",
      },
      search: {
        title: "Search",
        description: "Search Lamentis.",
      },
      addSite: {
        title: "Add site",
        description: "Add a site to Lamentis.",
      },
      legalNotice: {
        title: "Legal Notice",
        description: "The legal notice is in preparation.",
      },
      about: {
        title: "About Me",
        description: "This page is in preparation.",
      },
    },
    search: {
      heading: "Search sites",
      label: "Search",
      placeholder: "Search",
    },
    placeholderStatus: "In preparation",
    navigation: {
      ariaLabel: "Primary navigation",
      homeLabel: "Lamentis home",
      openMenuLabel: "Open primary navigation",
      closeMenuLabel: "Close primary navigation",
    },
    footer: {
      sections: {
        platform: { title: "Platform" },
        legal: { title: "Legal" },
        links: { title: "Links" },
      },
      githubLabel: "GitHub",
      languageLabel: "Language",
      copyright: "© 2026 Lamentis.",
      productionCredit: "An Elias Papavlassopoulos production.",
    },
    notFound: {
      title: "Page not found",
      description: "The requested page does not exist.",
      homeLabel: "Back to Lamentis",
    },
  },
  de: {
    routes: {
      home: {
        title: "Home",
        description: "Lamentis-Startseite.",
      },
      today: {
        title: "Today",
        description: "Heutige Websites auf Lamentis.",
      },
      trending: {
        title: "Trending",
        description: "Aktuell beliebte Websites auf Lamentis.",
      },
      search: {
        title: "Search",
        description: "Lamentis durchsuchen.",
      },
      addSite: {
        title: "Add site",
        description: "Eine Website zu Lamentis hinzufügen.",
      },
      legalNotice: {
        title: "Impressum",
        description: "Das Impressum ist in Vorbereitung.",
      },
      about: {
        title: "Über mich",
        description: "Diese Seite ist in Vorbereitung.",
      },
    },
    search: {
      heading: "Websites durchsuchen",
      label: "Suche",
      placeholder: "Suchen",
    },
    placeholderStatus: "In Vorbereitung",
    navigation: {
      ariaLabel: "Hauptnavigation",
      homeLabel: "Lamentis-Startseite",
      openMenuLabel: "Hauptnavigation öffnen",
      closeMenuLabel: "Hauptnavigation schließen",
    },
    footer: {
      sections: {
        platform: { title: "Plattform" },
        legal: { title: "Rechtliches" },
        links: { title: "Links" },
      },
      githubLabel: "GitHub",
      languageLabel: "Sprache",
      copyright: "© 2026 Lamentis.",
      productionCredit: "Eine Elias Papavlassopoulos Produktion.",
    },
    notFound: {
      title: "Seite nicht gefunden",
      description: "Die angeforderte Seite existiert nicht.",
      homeLabel: "Zurück zu Lamentis",
    },
  },
} as const satisfies Record<Locale, LocalizedSiteContent>;

type NavigationItem = InternalLink & {
  label: string;
  href: string;
};

export type NavigationContent = {
  ariaLabel: string;
  homeLabel: string;
  homeHref: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  items: NavigationItem[];
  addSiteAction: NavigationItem;
};

export type FooterLink = (
  | (InternalLink & { href: string })
  | ExternalLink
) & {
  label: string;
  icon?: "github" | "profile";
};

export type FooterSection = {
  id: FooterSectionId;
  title: string;
  links: FooterLink[];
};

export type FooterContent = {
  sections: FooterSection[];
  copyright: string;
  productionCredit: string;
};

export type LocaleSwitcherModel = {
  label: string;
  locale: Locale;
  options: readonly { code: Locale; label: string }[];
};

export type SiteChromeModel = {
  navigation: NavigationContent;
  footer: FooterContent;
  localeSwitcher: LocaleSwitcherModel | null;
};

export function getRouteCopy(
  locale: Locale,
  routeId: SiteRouteId,
): RouteCopy {
  return contentByLocale[locale].routes[routeId];
}

function routeRefForLocale(
  routeId: SiteRouteId,
  locale: Locale,
): RouteRef {
  return isLocalizedRouteId(routeId)
    ? { scope: "localized", locale, routeId }
    : { scope: "global", routeId };
}

function createInternalLink(
  locale: Locale,
  routeId: SiteRouteId,
  id: string,
): InternalLink & { href: string } {
  const ref = routeRefForLocale(routeId, locale);
  return {
    kind: "internal",
    id,
    ...ref,
    href: routePath(ref),
  };
}

export function getNavigationContent(locale: Locale): NavigationContent {
  const content = contentByLocale[locale];
  const homeRef = {
    scope: "localized",
    locale,
    routeId: "home",
  } as const;
  const actionRouteId = navigationRouteIds("action")[0];

  if (!actionRouteId) {
    throw new Error("The route catalog must define a navigation action.");
  }

  return {
    ariaLabel: content.navigation.ariaLabel,
    homeLabel: content.navigation.homeLabel,
    homeHref: routePath(homeRef),
    openMenuLabel: content.navigation.openMenuLabel,
    closeMenuLabel: content.navigation.closeMenuLabel,
    items: primaryNavigationRouteIds.map((routeId) => ({
      ...createInternalLink(locale, routeId, `navigation-${routeId}`),
      label: getRouteCopy(locale, routeId).title,
    })),
    addSiteAction: {
      ...createInternalLink(locale, actionRouteId, "navigation-add-site"),
      label: getRouteCopy(locale, actionRouteId).title,
    },
  };
}

export function getSearchContent(locale: Locale): SearchContent {
  return contentByLocale[locale].search;
}

export function getFooterContent(locale: Locale): FooterContent {
  const content = contentByLocale[locale];
  const internalSections = Object.entries(content.footer.sections).map(
    ([sectionId, section]) => {
      const id = sectionId as FooterSectionId;
      const links = footerRouteIds(id).map((routeId): FooterLink => {
        const icon = siteRoutes[routeId].placement.footer?.icon;
        return {
          ...createInternalLink(locale, routeId, `footer-${routeId}`),
          label: getRouteCopy(locale, routeId).title,
          ...(icon ? { icon } : {}),
        };
      });

      return { id, title: section.title, links };
    },
  );
  const linksSection = internalSections.find((section) => section.id === "links");

  if (!linksSection) {
    throw new Error("The localized content must define the footer links section.");
  }

  linksSection.links.push({
    kind: "external",
    id: "footer-github",
    href: siteConfig.externalLinks.github,
    newWindow: true,
    label: content.footer.githubLabel,
    icon: "github",
  });

  return {
    sections: internalSections,
    copyright: content.footer.copyright,
    productionCredit: content.footer.productionCredit,
  };
}

export function getLocaleSwitcherModel(locale: Locale): LocaleSwitcherModel {
  return {
    label: contentByLocale[locale].footer.languageLabel,
    locale,
    options: supportedLanguageOptions,
  };
}

const supportedLanguageOptions = Object.freeze(
  Object.entries(localeCatalog).map(([code, locale]) => ({
    code: code as Locale,
    label: locale.label,
  })),
);

export function getSiteChromeModel(locale: Locale): SiteChromeModel {
  return {
    navigation: getNavigationContent(locale),
    footer: getFooterContent(locale),
    localeSwitcher: getLocaleSwitcherModel(locale),
  };
}

export function getGlobalSiteChromeModel(): SiteChromeModel {
  return {
    navigation: getNavigationContent(defaultLocale),
    footer: getFooterContent(defaultLocale),
    localeSwitcher: null,
  };
}
