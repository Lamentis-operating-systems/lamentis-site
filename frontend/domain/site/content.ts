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
import type { ApiResponseFieldType } from "./api-response-schema";

export type RouteCopy = {
  title: string;
  description: string;
};

export type SearchContent = {
  heading: string;
  label: string;
  placeholder: string;
};

export type ResponseSchemaEditorContent = {
  addPropertyLabel: string;
  arrayItemTypeLabel: string;
  duplicatePropertyError: string;
  identifierHint: string;
  optionalLabel: string;
  propertiesLabel: string;
  propertyNameLabel: string;
  propertyNamePlaceholder: string;
  propertyTypeLabel: string;
  removePropertyLabel: string;
  responseTypeLabel: string;
  responseTypePlaceholder: string;
  saveLabel: string;
  typeOptions: Record<ApiResponseFieldType, string>;
};

export type ApiCreatorStudioContent = SearchContent & {
  actionLabel: string;
  closeEditRouteOverlayLabel: string;
  closeResponseOverlayLabel: string;
  copyRouteLabel: string;
  deleteRouteLabel: string;
  editRouteLabel: string;
  editRouteTitle: string;
  methodSelectorLabel: string;
  responseEditor: ResponseSchemaEditorContent;
  responseOverlayTitle: string;
  routeActionsLabel: string;
  routeListLabel: string;
  saveRouteLabel: string;
};

type LocalizedSiteContent = {
  siteDescription: string;
  routes: Record<SiteRouteId, RouteCopy>;
  search: SearchContent;
  apiCreatorStudio: ApiCreatorStudioContent;
  placeholderStatus: string;
  navigation: {
    ariaLabel: string;
    closeMenuLabel: string;
    downloadApiContractsLabel: string;
    homeLabel: string;
    openMenuLabel: string;
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
    siteDescription: "Lamentis is a platform for discovering and sharing sites.",
    routes: {
      home: {
        title: "Home",
        description: "Lamentis is a platform for discovering and sharing sites.",
      },
      today: {
        title: "Today",
        description: "Discover today's sites on Lamentis.",
      },
      trending: {
        title: "Trending",
        description: "Discover trending sites on Lamentis.",
      },
      search: {
        title: "Search",
        description: "Search for sites on Lamentis.",
      },
      apiCreatorStudio: {
        title: "API Creator Studio",
        description: "Create and manage APIs in the Lamentis API Creator Studio.",
      },
      addSite: {
        title: "Add site",
        description: "Add a site to Lamentis.",
      },
      legalNotice: {
        title: "Legal Notice",
        description: "The legal notice is being prepared.",
      },
      about: {
        title: "About Me",
        description: "This page is being prepared.",
      },
    },
    search: {
      heading: "Search sites",
      label: "Search sites",
      placeholder: "Search",
    },
    apiCreatorStudio: {
      actionLabel: "Add API route",
      closeEditRouteOverlayLabel: "Close Edit this route",
      closeResponseOverlayLabel: "Close Add response",
      copyRouteLabel: "Copy",
      deleteRouteLabel: "Delete",
      editRouteLabel: "Edit",
      editRouteTitle: "Edit this route",
      heading: "Create API Contracts",
      methodSelectorLabel: "HTTP method",
      responseEditor: {
        addPropertyLabel: "Add property",
        arrayItemTypeLabel: "Array item type",
        duplicatePropertyError: "Property names must be unique.",
        identifierHint: "Use a valid TypeScript identifier.",
        optionalLabel: "Optional",
        propertiesLabel: "Response properties",
        propertyNameLabel: "Property name",
        propertyNamePlaceholder: "propertyName",
        propertyTypeLabel: "Property type",
        removePropertyLabel: "Remove property",
        responseTypeLabel: "Response type",
        responseTypePlaceholder: "UserResponse",
        saveLabel: "Save",
        typeOptions: {
          string: "string",
          number: "number",
          boolean: "boolean",
          object: "object",
          array: "array",
          null: "null",
          unknown: "unknown",
        },
      },
      responseOverlayTitle: "Add response",
      routeActionsLabel: "Route actions",
      routeListLabel: "API routes",
      saveRouteLabel: "Save",
      label: "API endpoint path",
      placeholder: "type path here...",
    },
    placeholderStatus: "In preparation",
    navigation: {
      ariaLabel: "Primary navigation",
      closeMenuLabel: "Close primary navigation",
      downloadApiContractsLabel: "Download",
      homeLabel: "Lamentis home",
      openMenuLabel: "Open primary navigation",
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
      productionCredit: "A production by Elias Papavlassopoulos.",
    },
    notFound: {
      title: "Page not found",
      description: "The requested page does not exist.",
      homeLabel: "Back to Lamentis",
    },
  },
  de: {
    siteDescription: "Lamentis ist eine Plattform zum Entdecken und Teilen von Websites.",
    routes: {
      home: {
        title: "Startseite",
        description: "Lamentis ist eine Plattform zum Entdecken und Teilen von Websites.",
      },
      today: {
        title: "Heute",
        description: "Entdecke die heutigen Websites auf Lamentis.",
      },
      trending: {
        title: "Im Trend",
        description: "Entdecke aktuell beliebte Websites auf Lamentis.",
      },
      search: {
        title: "Suche",
        description: "Websites auf Lamentis durchsuchen.",
      },
      apiCreatorStudio: {
        title: "API Creator Studio",
        description: "APIs im Lamentis API Creator Studio erstellen und verwalten.",
      },
      addSite: {
        title: "Website hinzufügen",
        description: "Eine Website zu Lamentis hinzufügen.",
      },
      legalNotice: {
        title: "Impressum",
        description: "Das Impressum wird vorbereitet.",
      },
      about: {
        title: "Über mich",
        description: "Diese Seite wird vorbereitet.",
      },
    },
    search: {
      heading: "Websites durchsuchen",
      label: "Websites durchsuchen",
      placeholder: "Suchen",
    },
    apiCreatorStudio: {
      actionLabel: "API-Route hinzufügen",
      closeEditRouteOverlayLabel: "Route bearbeiten schließen",
      closeResponseOverlayLabel: "Antwort hinzufügen schließen",
      copyRouteLabel: "Kopieren",
      deleteRouteLabel: "Löschen",
      editRouteLabel: "Bearbeiten",
      editRouteTitle: "Diese Route bearbeiten",
      heading: "API-Verträge erstellen",
      methodSelectorLabel: "HTTP-Methode",
      responseEditor: {
        addPropertyLabel: "Eigenschaft hinzufügen",
        arrayItemTypeLabel: "Array-Elementtyp",
        duplicatePropertyError: "Eigenschaftsnamen müssen eindeutig sein.",
        identifierHint: "Eine gültige TypeScript-Bezeichnung verwenden.",
        optionalLabel: "Optionales Feld",
        propertiesLabel: "Antwort-Eigenschaften",
        propertyNameLabel: "Eigenschaftsname",
        propertyNamePlaceholder: "eigenschaftName",
        propertyTypeLabel: "Eigenschaftstyp",
        removePropertyLabel: "Eigenschaft entfernen",
        responseTypeLabel: "Antworttyp",
        responseTypePlaceholder: "BenutzerAntwort",
        saveLabel: "Speichern",
        typeOptions: {
          string: "string",
          number: "number",
          boolean: "boolean",
          object: "object",
          array: "array",
          null: "null",
          unknown: "unknown",
        },
      },
      responseOverlayTitle: "Antwort hinzufügen",
      routeActionsLabel: "Routenaktionen",
      routeListLabel: "API-Routen",
      saveRouteLabel: "Speichern",
      label: "API-Endpunktpfad",
      placeholder: "pfad hier eingeben...",
    },
    placeholderStatus: "In Vorbereitung",
    navigation: {
      ariaLabel: "Hauptnavigation",
      closeMenuLabel: "Hauptnavigation schließen",
      downloadApiContractsLabel: "Herunterladen",
      homeLabel: "Lamentis-Startseite",
      openMenuLabel: "Hauptnavigation öffnen",
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
      productionCredit: "Eine Produktion von Elias Papavlassopoulos.",
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
  addSiteAction: NavigationItem;
  ariaLabel: string;
  closeMenuLabel: string;
  downloadApiContractsLabel: string;
  homeHref: string;
  homeLabel: string;
  items: NavigationItem[];
  locale: Locale;
  openMenuLabel: string;
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
    locale,
    ariaLabel: content.navigation.ariaLabel,
    closeMenuLabel: content.navigation.closeMenuLabel,
    downloadApiContractsLabel:
      content.navigation.downloadApiContractsLabel,
    homeLabel: content.navigation.homeLabel,
    homeHref: routePath(homeRef),
    openMenuLabel: content.navigation.openMenuLabel,
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

export function getApiCreatorStudioContent(
  locale: Locale,
): ApiCreatorStudioContent {
  return contentByLocale[locale].apiCreatorStudio;
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

export function getGlobalSiteChromeModel(
  locale: Locale = defaultLocale,
): SiteChromeModel {
  return {
    navigation: getNavigationContent(locale),
    footer: getFooterContent(locale),
    localeSwitcher: null,
  };
}
