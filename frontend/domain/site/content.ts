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

export type ResponseSchemaEditorContent = {
  requestBodyDescription: string;
  requestBodyLabel: string;
  responseSectionDescription: string;
  responseSectionLabel: string;
  responseTypeLabel: string;
  routeContract: {
    defaultResponseDescription: string;
    duplicateResponseStatusError: string;
    requestExampleLabel: string;
    responseExampleLabel: string;
    invalidContractError: string;
    invalidExampleError: string;
    responseStatusLabel: string;
  };
  routeLabel: string;
  saveLabel: string;
};

export type ApiCreatorStudioContent = SearchContent & {
  actionLabel: string;
  closeEditRouteOverlayLabel: string;
  closeResponseOverlayLabel: string;
  contractMetadata: {
    basePathLabel: string;
    description: string;
    label: string;
    titleLabel: string;
    versionLabel: string;
  };
  copyRouteErrorLabel: string;
  copyRouteLabel: string;
  deleteRouteLabel: string;
  duplicatePathError: string;
  editRouteLabel: string;
  editRouteTitle: string;
  invalidPathError: string;
  methodSelectorLabel: string;
  pathPrefixHint: string;
  responseEditor: ResponseSchemaEditorContent;
  responseOverlayTitle: string;
  routeActionsLabel: string;
  routeListLabel: string;
  storageErrorLabel: string;
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
    downloadApiContractsErrorLabel: string;
    homeLabel: string;
    openMenuLabel: string;
    skipToContentLabel: string;
  };
  footer: {
    sections: Record<FooterSectionId, { title: string }>;
    githubLabel: string;
    languageLabel: string;
    copyright: string;
    productionCredit: string;
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
      closeResponseOverlayLabel: "Close the response editor",
      contractMetadata: {
        basePathLabel: "Base path",
        description: "Optional details that apply to every route in this contract.",
        label: "API details",
        titleLabel: "API title",
        versionLabel: "API version",
      },
      copyRouteErrorLabel: "The route could not be copied.",
      copyRouteLabel: "Copy",
      deleteRouteLabel: "Delete",
      duplicatePathError: "This HTTP method and path already exist.",
      editRouteLabel: "Edit",
      editRouteTitle: "Edit this route",
      heading: "Create API Contracts",
      invalidPathError:
        "Use lowercase letters and numbers in path segments. Wrap parameter names in braces and start them with a letter.",
      methodSelectorLabel: "HTTP method",
      pathPrefixHint: "A leading slash is added automatically.",
      responseEditor: {
        requestBodyDescription:
          "Paste one JSON example. The request type is inferred automatically.",
        requestBodyLabel: "Request JSON",
        responseSectionDescription:
          "Paste one JSON example. The response type is inferred automatically.",
        responseSectionLabel: "Response JSON",
        responseTypeLabel: "Response type",
        routeContract: {
          defaultResponseDescription: "Successful response",
          duplicateResponseStatusError:
            "Response status codes must be unique.",
          requestExampleLabel: "Request JSON",
          responseExampleLabel: "Response JSON",
          invalidContractError:
            "This route conflicts with an existing generated type. Change the path or JSON shape.",
          invalidExampleError: "Enter valid JSON before saving.",
          responseStatusLabel: "HTTP status",
        },
        routeLabel: "Route",
        saveLabel: "Save",
      },
      responseOverlayTitle: "Define this API route",
      routeActionsLabel: "Route actions",
      routeListLabel: "API routes",
      storageErrorLabel:
        "Routes are available in this tab but could not be read from or saved to local storage. Download them before reloading.",
      label: "API endpoint path",
      placeholder: "type path here...",
    },
    placeholderStatus: "In preparation",
    navigation: {
      ariaLabel: "Primary navigation",
      closeMenuLabel: "Close primary navigation",
      downloadApiContractsLabel: "Download",
      downloadApiContractsErrorLabel: "Download failed",
      homeLabel: "Lamentis home",
      openMenuLabel: "Open primary navigation",
      skipToContentLabel: "Skip to main content",
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
      closeResponseOverlayLabel:
        "Datenstruktur für diese Route schließen",
      contractMetadata: {
        basePathLabel: "Basispfad",
        description: "Optionale Angaben, die für alle Routen dieses Vertrags gelten.",
        label: "API-Angaben",
        titleLabel: "API-Titel",
        versionLabel: "API-Version",
      },
      copyRouteErrorLabel: "Die Route konnte nicht kopiert werden.",
      copyRouteLabel: "Kopieren",
      deleteRouteLabel: "Löschen",
      duplicatePathError:
        "Diese HTTP-Methode und dieser Pfad sind bereits vorhanden.",
      editRouteLabel: "Bearbeiten",
      editRouteTitle: "Diese Route bearbeiten",
      heading: "API-Verträge erstellen",
      invalidPathError:
        "Verwende Kleinbuchstaben und Zahlen in Pfadsegmenten. Setze Parameternamen in geschweifte Klammern und beginne sie mit einem Buchstaben.",
      methodSelectorLabel: "HTTP-Methode",
      pathPrefixHint:
        "Ein führender Schrägstrich wird automatisch ergänzt.",
      responseEditor: {
        requestBodyDescription:
          "Füge ein JSON-Beispiel ein. Der Anfragetyp wird automatisch abgeleitet.",
        requestBodyLabel: "Request-JSON",
        responseSectionDescription:
          "Füge ein JSON-Beispiel ein. Der Antworttyp wird automatisch abgeleitet.",
        responseSectionLabel: "Response-JSON",
        responseTypeLabel: "Antworttyp",
        routeContract: {
          defaultResponseDescription: "Erfolgreiche Antwort",
          duplicateResponseStatusError:
            "HTTP-Statuscodes der Antworten müssen eindeutig sein.",
          requestExampleLabel: "Request-JSON",
          responseExampleLabel: "Response-JSON",
          invalidContractError:
            "Diese Route kollidiert mit einem bestehenden automatisch erzeugten Typ. Ändere Pfad oder JSON-Struktur.",
          invalidExampleError: "Gib vor dem Speichern gültiges JSON ein.",
          responseStatusLabel: "HTTP-Status",
        },
        routeLabel: "Route",
        saveLabel: "Speichern",
      },
      responseOverlayTitle: "Diese API-Route definieren",
      routeActionsLabel: "Routenaktionen",
      routeListLabel: "API-Routen",
      storageErrorLabel:
        "Die Routen sind in diesem Tab verfügbar, konnten aber nicht aus dem lokalen Speicher gelesen oder dort gespeichert werden. Lade sie vor dem Neuladen herunter.",
      label: "API-Endpunktpfad",
      placeholder: "pfad hier eingeben...",
    },
    placeholderStatus: "In Vorbereitung",
    navigation: {
      ariaLabel: "Hauptnavigation",
      closeMenuLabel: "Hauptnavigation schließen",
      downloadApiContractsLabel: "Herunterladen",
      downloadApiContractsErrorLabel: "Download fehlgeschlagen",
      homeLabel: "Lamentis-Startseite",
      openMenuLabel: "Hauptnavigation öffnen",
      skipToContentLabel: "Zum Hauptinhalt",
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
  },
} as const satisfies Record<Locale, LocalizedSiteContent>;

type NavigationItem = InternalLink & {
  label: string;
  href: string;
};

type NavigationDownloadAction = {
  errorLabel: string;
  id: "navigation-download-api-contracts";
  kind: "api-contract-download";
  label: string;
};

export type NavigationAction =
  | NavigationItem
  | NavigationDownloadAction;

export type NavigationContent = {
  action: NavigationItem;
  actionOverrides: Partial<Record<SiteRouteId, NavigationAction>>;
  ariaLabel: string;
  closeMenuLabel: string;
  homeHref: string;
  homeLabel: string;
  items: NavigationItem[];
  locale: Locale;
  openMenuLabel: string;
  skipToContentLabel: string;
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
  const actionRouteIds = navigationRouteIds("action");

  if (actionRouteIds.length !== 1 || !actionRouteIds[0]) {
    throw new Error(
      "The route catalog must define exactly one navigation action.",
    );
  }
  const actionRouteId = actionRouteIds[0];

  return {
    locale,
    ariaLabel: content.navigation.ariaLabel,
    closeMenuLabel: content.navigation.closeMenuLabel,
    homeLabel: content.navigation.homeLabel,
    homeHref: routePath(homeRef),
    openMenuLabel: content.navigation.openMenuLabel,
    skipToContentLabel: content.navigation.skipToContentLabel,
    items: primaryNavigationRouteIds.map((routeId) => ({
      ...createInternalLink(locale, routeId, `navigation-${routeId}`),
      label: getRouteCopy(locale, routeId).title,
    })),
    action: {
      ...createInternalLink(locale, actionRouteId, "navigation-add-site"),
      label: getRouteCopy(locale, actionRouteId).title,
    },
    actionOverrides: {
      apiCreatorStudio: {
        errorLabel: content.navigation.downloadApiContractsErrorLabel,
        id: "navigation-download-api-contracts",
        kind: "api-contract-download",
        label: content.navigation.downloadApiContractsLabel,
      },
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
