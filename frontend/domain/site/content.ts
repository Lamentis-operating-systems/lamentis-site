import {
  externalLinks,
  productOrder,
  products,
  routePath,
  type ExternalLink,
  type InternalLink,
  type Locale,
  type ProductId,
  type SiteRouteId,
} from "./routes";

export type RouteCopy = {
  title: string;
  description: string;
};

type ProductCopy = RouteCopy & {
  displayTitle: string;
  navigationLabel: string;
  tagline: string;
};

type LocalizedSiteContent = {
  home: RouteCopy & { statusLabel: string };
  products: Record<ProductId, ProductCopy>;
  placeholders: Record<Extract<SiteRouteId, "legalNotice" | "about">, RouteCopy>;
  placeholderStatus: string;
  navigation: {
    ariaLabel: string;
    homeLabel: string;
    openMenuLabel: string;
    closeMenuLabel: string;
    githubLabel: string;
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

export const contentByLocale = {
  en: {
    home: {
      title: "Projects by Elias Papavlassopoulos",
      description:
        "Lamentis landing page: plan, coordinate, and host private and public events with your social circle.",
      statusLabel: "Coming soon",
    },
    products: {
      noma: {
        title: "Noma",
        displayTitle: "Noma Tasks",
        navigationLabel: "Noma Tasks",
        description: "Noma project page on Lamentis.",
        tagline:
          "An iOS task manager built around a calm daily flow: capture today's todos, organize them into projects, complete what matters, and let unfinished tasks roll into tomorrow automatically.",
      },
      nox: {
        title: "Nox",
        displayTitle: "NOX",
        navigationLabel: "Nox - Social Events",
        description: "Nox project page on Lamentis.",
        tagline:
          "A mobile platform for nightclubs to host events, sell tickets, and understand their audiences, paired with a social experience that helps guests connect with their circle before, during, and after the night.",
      },
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
      ariaLabel: "Product navigation",
      homeLabel: "Lamentis home",
      openMenuLabel: "Open product navigation",
      closeMenuLabel: "Close product navigation",
      githubLabel: "Open product repository on GitHub",
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
      title: "Projekte von Elias Papavlassopoulos",
      description:
        "Lamentis-Startseite: Plane, koordiniere und organisiere private und öffentliche Events.",
      statusLabel: "Demnächst",
    },
    products: {
      noma: {
        title: "Noma",
        displayTitle: "Noma Tasks",
        navigationLabel: "Noma Tasks",
        description: "Noma-Projektseite auf Lamentis.",
        tagline:
          "Ein iOS-Task-Manager für einen klaren Tagesablauf: heutige Todos erfassen, in Projekte sortieren, Wichtiges abschließen und unerledigte Aufgaben automatisch in den nächsten Tag übernehmen.",
      },
      nox: {
        title: "Nox",
        displayTitle: "NOX",
        navigationLabel: "Nox - Social Events",
        description: "Nox-Projektseite auf Lamentis.",
        tagline:
          "Eine mobile Plattform, mit der Nightclubs Events veranstalten, Tickets verkaufen und ihre Zielgruppen besser verstehen, kombiniert mit einem sozialen Erlebnis, das Gäste vor, während und nach der Nacht mit ihrem Freundeskreis verbindet.",
      },
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
      ariaLabel: "Produktnavigation",
      homeLabel: "Lamentis-Startseite",
      openMenuLabel: "Produktnavigation öffnen",
      closeMenuLabel: "Produktnavigation schließen",
      githubLabel: "Produkt-Repository auf GitHub öffnen",
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
  productId: ProductId;
  label: string;
  href: string;
  repositoryUrl: string;
};

export type NavigationContent = {
  ariaLabel: string;
  homeLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  githubLabel: string;
  items: NavigationItem[];
};

export type FooterLink = (
  | (InternalLink & { href: string })
  | ExternalLink
) & {
  label: string;
  icon?: "github";
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

  if (routeId === "home") return content.home;
  if (routeId === "noma" || routeId === "nox") return content.products[routeId];
  return content.placeholders[routeId];
}

export function getNavigationContent(locale: Locale): NavigationContent {
  const content = contentByLocale[locale];
  return {
    ...content.navigation,
    items: productOrder.map((productId) => ({
      kind: "internal",
      id: `navigation-${productId}`,
      routeId: products[productId].routeId,
      productId,
      label: content.products[productId].navigationLabel,
      href: routePath(locale, products[productId].routeId),
      repositoryUrl: products[productId].repositoryUrl,
    })),
  };
}

export function getFooterContent(locale: Locale): FooterContent {
  const content = contentByLocale[locale];
  const platformLinks: FooterLink[] = productOrder.map((productId) => ({
    kind: "internal",
    id: `footer-${productId}`,
    routeId: products[productId].routeId,
    href: routePath(locale, products[productId].routeId),
    label: content.products[productId].navigationLabel,
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
