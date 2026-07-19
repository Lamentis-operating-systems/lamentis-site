import {
  externalLinks,
  primaryNavigationRouteIds,
  routePath,
  type ExternalLink,
  type InternalLink,
  type Locale,
  type SiteRouteId,
} from "./routes";

export type RouteCopy = {
  title: string;
  description: string;
};

type PlatformRouteId = Extract<SiteRouteId, "today" | "trending" | "search" | "addSite">;
type PlaceholderRouteId = Extract<SiteRouteId, "legalNotice" | "about">;
type PrimaryNavigationRouteId = (typeof primaryNavigationRouteIds)[number];

type LocalizedSiteContent = {
  home: RouteCopy;
  platformPages: Record<PlatformRouteId, RouteCopy>;
  search: SearchContent;
  placeholders: Record<PlaceholderRouteId, RouteCopy>;
  placeholderStatus: string;
  navigation: {
    ariaLabel: string;
    homeLabel: string;
    openMenuLabel: string;
    closeMenuLabel: string;
    labels: Record<PrimaryNavigationRouteId, string>;
    addSiteLabel: string;
  };
  footer: {
    platformTitle: string;
    legalTitle: string;
    linksTitle: string;
    legalNoticeLabel: string;
    aboutLabel: string;
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

export type SearchContent = {
  heading: string;
  label: string;
  placeholder: string;
};

export const contentByLocale = {
  en: {
    home: {
      title: "Home",
      description: "Lamentis home.",
    },
    platformPages: {
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
    },
    search: {
      heading: "Search sites",
      label: "Search",
      placeholder: "Search",
    },
    placeholders: {
      legalNotice: {
        title: "Legal Notice",
        description: "The legal notice is in preparation.",
      },
      about: {
        title: "About Me",
        description: "This page is in preparation.",
      },
    },
    placeholderStatus: "In preparation",
    navigation: {
      ariaLabel: "Primary navigation",
      homeLabel: "Lamentis home",
      openMenuLabel: "Open primary navigation",
      closeMenuLabel: "Close primary navigation",
      labels: {
        today: "Today",
        trending: "Trending",
        search: "Search",
        home: "Home",
      },
      addSiteLabel: "Add site",
    },
    footer: {
      platformTitle: "Platform",
      legalTitle: "Legal",
      linksTitle: "Links",
      legalNoticeLabel: "Legal Notice",
      aboutLabel: "About Me",
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
    home: {
      title: "Home",
      description: "Lamentis-Startseite.",
    },
    platformPages: {
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
    },
    search: {
      heading: "Websites durchsuchen",
      label: "Suche",
      placeholder: "Suchen",
    },
    placeholders: {
      legalNotice: {
        title: "Impressum",
        description: "Das Impressum ist in Vorbereitung.",
      },
      about: {
        title: "Über mich",
        description: "Diese Seite ist in Vorbereitung.",
      },
    },
    placeholderStatus: "In Vorbereitung",
    navigation: {
      ariaLabel: "Hauptnavigation",
      homeLabel: "Lamentis-Startseite",
      openMenuLabel: "Hauptnavigation öffnen",
      closeMenuLabel: "Hauptnavigation schließen",
      labels: {
        today: "Today",
        trending: "Trending",
        search: "Search",
        home: "Home",
      },
      addSiteLabel: "Add site",
    },
    footer: {
      platformTitle: "Plattform",
      legalTitle: "Rechtliches",
      linksTitle: "Links",
      legalNoticeLabel: "Impressum",
      aboutLabel: "Über mich",
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
  id: "platform" | "legal" | "links";
  title: string;
  links: FooterLink[];
};

export type FooterContent = {
  sections: FooterSection[];
  languageLabel: string;
  languageOptions: readonly { code: Locale; label: string }[];
  copyright: string;
  productionCredit: string;
};

export function getRouteCopy(locale: Locale, routeId: SiteRouteId): RouteCopy {
  const content = contentByLocale[locale];

  switch (routeId) {
    case "home":
      return content.home;
    case "today":
    case "trending":
    case "search":
    case "addSite":
      return content.platformPages[routeId];
    case "legalNotice":
    case "about":
      return content.placeholders[routeId];
  }
}

export function getNavigationContent(locale: Locale): NavigationContent {
  const content = contentByLocale[locale];
  return {
    ariaLabel: content.navigation.ariaLabel,
    homeLabel: content.navigation.homeLabel,
    homeHref: routePath(locale, "home"),
    openMenuLabel: content.navigation.openMenuLabel,
    closeMenuLabel: content.navigation.closeMenuLabel,
    items: primaryNavigationRouteIds.map((routeId) => ({
      kind: "internal",
      id: `navigation-${routeId}`,
      routeId,
      label: content.navigation.labels[routeId],
      href: routePath(locale, routeId),
    })),
    addSiteAction: {
      kind: "internal",
      id: "navigation-add-site",
      routeId: "addSite",
      label: content.navigation.addSiteLabel,
      href: routePath("addSite"),
    },
  };
}

export function getSearchContent(locale: Locale): SearchContent {
  return contentByLocale[locale].search;
}

export function getFooterContent(locale: Locale): FooterContent {
  const content = contentByLocale[locale];
  const platformLinks: FooterLink[] = primaryNavigationRouteIds.map((routeId) => ({
    kind: "internal",
    id: `footer-${routeId}`,
    routeId,
    href: routePath(locale, routeId),
    label: content.navigation.labels[routeId],
  }));

  return {
    sections: [
      { id: "platform", title: content.footer.platformTitle, links: platformLinks },
      {
        id: "legal",
        title: content.footer.legalTitle,
        links: [{
          kind: "internal",
          id: "footer-legal-notice",
          routeId: "legalNotice",
          href: routePath(locale, "legalNotice"),
          label: content.footer.legalNoticeLabel,
        }],
      },
      {
        id: "links",
        title: content.footer.linksTitle,
        links: [
          {
            kind: "internal",
            id: "footer-about",
            routeId: "about",
            href: routePath(locale, "about"),
            label: content.footer.aboutLabel,
            icon: "profile",
          },
          {
            kind: "external",
            id: "footer-github",
            href: externalLinks.github,
            newWindow: true,
            label: content.footer.githubLabel,
            icon: "github",
          },
        ],
      },
    ],
    languageLabel: content.footer.languageLabel,
    languageOptions: [
      { code: "en", label: "English" },
      { code: "de", label: "Deutsch" },
    ],
    copyright: content.footer.copyright,
    productionCredit: content.footer.productionCredit,
  };
}
