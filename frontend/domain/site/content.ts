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
import type {
  ApiCachePolicy,
  ApiIdempotencyPolicy,
  ApiParameterLocation,
  ApiParameterType,
  ApiSecurityScheme,
} from "./api-route";

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
  arrayConnectorLabel: string;
  arrayItemTypeLabel: string;
  collapseSectionLabel: string;
  duplicatePropertyError: string;
  expandSectionLabel: string;
  identifierHint: string;
  incompleteSchemaError: string;
  newSchemaTypeLabel: string;
  newResponseTypeLabel: string;
  objectTypeTemplateLabel: string;
  optionalLabel: string;
  paginationDescription: string;
  paginationLabel: string;
  propertiesLabel: string;
  propertiesLabelByKind: Record<"request" | "response", string>;
  propertyNameLabel: string;
  propertyNamePlaceholder: string;
  propertyTypeLabel: string;
  removePropertyLabel: string;
  responseTypeConflictError: string;
  responseTypeDescription: string;
  responseTypeLabel: string;
  responseTypePlaceholder: string;
  responseTypeTemplateLabel: string;
  routeContract: {
    addParameterLabel: string;
    addResponseHeaderLabel: string;
    addResponseLabel: string;
    authLocationLabel: string;
    authNameLabel: string;
    cacheLabel: string;
    cacheOptions: Record<ApiCachePolicy, string>;
    contentTypesHint: string;
    contentTypesLabel: string;
    defaultResponseDescription: string;
    duplicateResponseStatusError: string;
    deprecatedLabel: string;
    descriptionLabel: string;
    detailsDescription: string;
    detailsLabel: string;
    formatLabel: string;
    idempotencyLabel: string;
    idempotencyOptions: Record<ApiIdempotencyPolicy, string>;
    invalidContractError: string;
    operationIdLabel: string;
    parameterDescriptionLabel: string;
    parameterLocationLabel: string;
    parameterLocationOptions: Record<ApiParameterLocation, string>;
    parameterNameLabel: string;
    parameterTypeLabel: string;
    parameterTypeOptions: Record<ApiParameterType, string>;
    parametersDescription: string;
    parametersLabel: string;
    rateLimitLabel: string;
    removeParameterLabel: string;
    removeResponseHeaderLabel: string;
    removeResponseLabel: string;
    requestRequiredLabel: string;
    requiredLabel: string;
    responseDescriptionLabel: string;
    responseHeaderDescriptionLabel: string;
    responseHeaderNameLabel: string;
    responseHeadersLabel: string;
    responseStatusLabel: string;
    securityBehaviorDescription: string;
    securityBehaviorLabel: string;
    securityNameHint: string;
    securitySchemeLabel: string;
    securitySchemeOptions: Record<ApiSecurityScheme, string>;
    securityScopesLabel: string;
    tagsHint: string;
    tagsLabel: string;
    titleLabel: string;
  };
  schemaTypeConflictError: string;
  routeLabel: string;
  saveLabel: string;
  typeDescriptionByKind: Record<"request" | "response", string>;
  typeLabelByKind: Record<"request" | "response", string>;
  typeOptions: Record<ApiResponseFieldType, string>;
  typePlaceholderByKind: Record<"request" | "response", string>;
  typeTemplateLabelByKind: Record<"request" | "response", string>;
};

export type ApiCreatorStudioContent = SearchContent & {
  actionLabel: string;
  closeEditRouteOverlayLabel: string;
  closeResponseOverlayLabel: string;
  copyRouteErrorLabel: string;
  copyRouteLabel: string;
  deleteRouteLabel: string;
  duplicatePathError: string;
  editResponseTypeDescription: string;
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
      copyRouteErrorLabel: "The route could not be copied.",
      copyRouteLabel: "Copy",
      deleteRouteLabel: "Delete",
      duplicatePathError: "This HTTP method and path already exist.",
      editResponseTypeDescription:
        "Update this response type or use an existing one as an editable template.",
      editRouteLabel: "Edit",
      editRouteTitle: "Edit this route",
      heading: "Create API Contracts",
      invalidPathError:
        "Use lowercase letters and numbers in path segments. Wrap parameter names in braces and start them with a letter.",
      methodSelectorLabel: "HTTP method",
      pathPrefixHint: "A leading slash is added automatically.",
      responseEditor: {
        addPropertyLabel: "Add property",
        arrayConnectorLabel: "of",
        arrayItemTypeLabel: "Array item type",
        collapseSectionLabel: "Collapse",
        duplicatePropertyError: "Property names must be unique.",
        expandSectionLabel: "Expand",
        identifierHint: "Use a valid TypeScript identifier.",
        incompleteSchemaError:
          "Complete every object type and property before saving.",
        newSchemaTypeLabel: "New",
        newResponseTypeLabel: "New",
        objectTypeTemplateLabel: "Object type template",
        optionalLabel: "Optional",
        paginationDescription:
          "Wrap the response in a paginated result with items, totalHits, page, limit, and totalPages.",
        paginationLabel: "Paginated response",
        propertiesLabel: "Response properties",
        propertiesLabelByKind: {
          request: "Request properties",
          response: "Response properties",
        },
        propertyNameLabel: "Property name",
        propertyNamePlaceholder: "propertyName",
        propertyTypeLabel: "Property type",
        removePropertyLabel: "Remove property",
        responseTypeConflictError:
          "This response type already uses a different schema.",
        schemaTypeConflictError:
          "This type name already uses a different schema.",
        responseTypeDescription:
          "Create a response type or use an existing one as an editable template.",
        responseTypeLabel: "Response type",
        responseTypePlaceholder: "Name your response type",
        responseTypeTemplateLabel: "Response type template",
        routeContract: {
          addParameterLabel: "Add parameter",
          addResponseHeaderLabel: "Add response header",
          addResponseLabel: "Add response",
          authLocationLabel: "Credential location",
          authNameLabel: "Credential name",
          cacheLabel: "Cache policy",
          cacheOptions: {
            unspecified: "Unspecified",
            "no-store": "No store",
            private: "Private",
            public: "Public",
          },
          contentTypesHint: "Comma-separated media types",
          contentTypesLabel: "Content types",
          defaultResponseDescription: "Successful response",
          duplicateResponseStatusError:
            "Response status codes must be unique.",
          deprecatedLabel: "Deprecated route",
          descriptionLabel: "Description",
          detailsDescription:
            "Document the operation with editable suggestions derived from its method and path.",
          detailsLabel: "Route details",
          formatLabel: "Format",
          idempotencyLabel: "Idempotency",
          idempotencyOptions: {
            unspecified: "Unspecified",
            idempotent: "Idempotent",
            "non-idempotent": "Non-idempotent",
            "idempotency-key": "Requires idempotency key",
          },
          invalidContractError:
            "Complete every route contract field with a valid value before saving.",
          operationIdLabel: "Operation ID",
          parameterDescriptionLabel: "Parameter description",
          parameterLocationLabel: "Parameter location",
          parameterLocationOptions: {
            path: "path",
            query: "query",
            header: "header",
            cookie: "cookie",
          },
          parameterNameLabel: "Parameter name",
          parameterTypeLabel: "Parameter type",
          parameterTypeOptions: {
            string: "string",
            number: "number",
            integer: "integer",
            boolean: "boolean",
            array: "array",
          },
          parametersDescription:
            "Path parameters are synchronized from the route. Add query, header, or cookie parameters explicitly.",
          parametersLabel: "Parameters",
          rateLimitLabel: "Rate limit",
          removeParameterLabel: "Remove parameter",
          removeResponseHeaderLabel: "Remove response header",
          removeResponseLabel: "Remove response",
          requestRequiredLabel: "Request body required",
          requiredLabel: "Required",
          responseDescriptionLabel: "Response description",
          responseHeaderDescriptionLabel: "Header description",
          responseHeaderNameLabel: "Response header name",
          responseHeadersLabel: "Response headers",
          responseStatusLabel: "HTTP status",
          securityBehaviorDescription:
            "Define authentication and transport-independent operational behavior.",
          securityBehaviorLabel: "Security and behavior",
          securityNameHint: "Header, query parameter, or cookie name",
          securitySchemeLabel: "Security scheme",
          securitySchemeOptions: {
            none: "None",
            bearer: "Bearer token",
            basic: "HTTP Basic",
            apiKey: "API key",
            cookie: "Cookie session",
            oauth2: "OAuth 2",
          },
          securityScopesLabel: "OAuth scopes",
          tagsHint: "Comma-separated tags",
          tagsLabel: "Tags",
          titleLabel: "Title",
        },
        routeLabel: "Route",
        saveLabel: "Save",
        typeDescriptionByKind: {
          request:
            "Create a request type or use an existing one as an editable template.",
          response:
            "Create a response type or use an existing one as an editable template.",
        },
        typeLabelByKind: {
          request: "Request type",
          response: "Response type",
        },
        typeOptions: {
          string: "string",
          number: "number",
          boolean: "boolean",
          object: "object",
          array: "array",
          null: "null",
          unknown: "unknown",
        },
        typePlaceholderByKind: {
          request: "Name your request type",
          response: "Name your response type",
        },
        typeTemplateLabelByKind: {
          request: "Request type template",
          response: "Response type template",
        },
      },
      responseOverlayTitle: "Add a data structure to this route",
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
      copyRouteErrorLabel: "Die Route konnte nicht kopiert werden.",
      copyRouteLabel: "Kopieren",
      deleteRouteLabel: "Löschen",
      duplicatePathError:
        "Diese HTTP-Methode und dieser Pfad sind bereits vorhanden.",
      editResponseTypeDescription:
        "Bearbeite diesen Antworttyp oder verwende einen vorhandenen als bearbeitbare Vorlage.",
      editRouteLabel: "Bearbeiten",
      editRouteTitle: "Diese Route bearbeiten",
      heading: "API-Verträge erstellen",
      invalidPathError:
        "Verwende Kleinbuchstaben und Zahlen in Pfadsegmenten. Setze Parameternamen in geschweifte Klammern und beginne sie mit einem Buchstaben.",
      methodSelectorLabel: "HTTP-Methode",
      pathPrefixHint:
        "Ein führender Schrägstrich wird automatisch ergänzt.",
      responseEditor: {
        addPropertyLabel: "Eigenschaft hinzufügen",
        arrayConnectorLabel: "aus",
        arrayItemTypeLabel: "Array-Elementtyp",
        collapseSectionLabel: "Einklappen",
        duplicatePropertyError: "Eigenschaftsnamen müssen eindeutig sein.",
        expandSectionLabel: "Ausklappen",
        identifierHint: "Eine gültige TypeScript-Bezeichnung verwenden.",
        incompleteSchemaError:
          "Vervollständige jeden Objekttyp und jede Eigenschaft vor dem Speichern.",
        newSchemaTypeLabel: "Neu",
        newResponseTypeLabel: "Neu",
        objectTypeTemplateLabel: "Objekttyp-Vorlage",
        optionalLabel: "Optionales Feld",
        paginationDescription:
          "Hülle die Antwort in ein paginiertes Ergebnis mit items, totalHits, page, limit und totalPages.",
        paginationLabel: "Paginierte Antwort",
        propertiesLabel: "Antwort-Eigenschaften",
        propertiesLabelByKind: {
          request: "Anfrage-Eigenschaften",
          response: "Antwort-Eigenschaften",
        },
        propertyNameLabel: "Eigenschaftsname",
        propertyNamePlaceholder: "eigenschaftName",
        propertyTypeLabel: "Eigenschaftstyp",
        removePropertyLabel: "Eigenschaft entfernen",
        responseTypeConflictError:
          "Dieser Antworttyp verwendet bereits ein anderes Schema.",
        schemaTypeConflictError:
          "Dieser Typname verwendet bereits ein anderes Schema.",
        responseTypeDescription:
          "Erstelle einen Antworttyp oder verwende einen vorhandenen als bearbeitbare Vorlage.",
        responseTypeLabel: "Antworttyp",
        responseTypePlaceholder: "Benenne deinen Antworttyp",
        responseTypeTemplateLabel: "Antworttyp-Vorlage",
        routeContract: {
          addParameterLabel: "Parameter hinzufügen",
          addResponseHeaderLabel: "Antwort-Header hinzufügen",
          addResponseLabel: "Antwort hinzufügen",
          authLocationLabel: "Zugangsdaten-Ort",
          authNameLabel: "Zugangsdaten-Name",
          cacheLabel: "Cache-Richtlinie",
          cacheOptions: {
            unspecified: "Nicht angegeben",
            "no-store": "Nicht speichern",
            private: "Privat",
            public: "Öffentlich",
          },
          contentTypesHint: "Kommagetrennte Medientypen",
          contentTypesLabel: "Inhaltstypen",
          defaultResponseDescription: "Erfolgreiche Antwort",
          duplicateResponseStatusError:
            "HTTP-Statuscodes der Antworten müssen eindeutig sein.",
          deprecatedLabel: "Veraltete Route",
          descriptionLabel: "Beschreibung",
          detailsDescription:
            "Dokumentiere die Operation mit bearbeitbaren Vorschlägen aus Methode und Pfad.",
          detailsLabel: "Routendetails",
          formatLabel: "Format",
          idempotencyLabel: "Idempotenz",
          idempotencyOptions: {
            unspecified: "Nicht angegeben",
            idempotent: "Idempotent",
            "non-idempotent": "Nicht idempotent",
            "idempotency-key": "Idempotenzschlüssel erforderlich",
          },
          invalidContractError:
            "Vervollständige vor dem Speichern alle Felder des Routenvertrags mit gültigen Werten.",
          operationIdLabel: "Operations-ID",
          parameterDescriptionLabel: "Parameterbeschreibung",
          parameterLocationLabel: "Parameterort",
          parameterLocationOptions: {
            path: "Pfad",
            query: "Query",
            header: "Header",
            cookie: "Cookie",
          },
          parameterNameLabel: "Parametername",
          parameterTypeLabel: "Parametertyp",
          parameterTypeOptions: {
            string: "string",
            number: "number",
            integer: "integer",
            boolean: "boolean",
            array: "array",
          },
          parametersDescription:
            "Pfadparameter werden mit der Route synchronisiert. Query-, Header- und Cookie-Parameter werden explizit ergänzt.",
          parametersLabel: "Parameter",
          rateLimitLabel: "Ratenbegrenzung",
          removeParameterLabel: "Parameter entfernen",
          removeResponseHeaderLabel: "Antwort-Header entfernen",
          removeResponseLabel: "Antwort entfernen",
          requestRequiredLabel: "Anfragekörper erforderlich",
          requiredLabel: "Erforderlich",
          responseDescriptionLabel: "Antwortbeschreibung",
          responseHeaderDescriptionLabel: "Headerbeschreibung",
          responseHeaderNameLabel: "Antwort-Headername",
          responseHeadersLabel: "Antwort-Header",
          responseStatusLabel: "HTTP-Status",
          securityBehaviorDescription:
            "Definiere Authentifizierung und transportunabhängiges Betriebsverhalten.",
          securityBehaviorLabel: "Sicherheit und Verhalten",
          securityNameHint: "Header-, Query-Parameter- oder Cookie-Name",
          securitySchemeLabel: "Sicherheitsschema",
          securitySchemeOptions: {
            none: "Keine",
            bearer: "Bearer-Token",
            basic: "HTTP Basic",
            apiKey: "API-Schlüssel",
            cookie: "Cookie-Sitzung",
            oauth2: "OAuth 2",
          },
          securityScopesLabel: "OAuth-Bereiche",
          tagsHint: "Kommagetrennte Tags",
          tagsLabel: "Tags",
          titleLabel: "Titel",
        },
        routeLabel: "Route",
        saveLabel: "Speichern",
        typeDescriptionByKind: {
          request:
            "Erstelle einen Anfragetyp oder verwende einen vorhandenen als bearbeitbare Vorlage.",
          response:
            "Erstelle einen Antworttyp oder verwende einen vorhandenen als bearbeitbare Vorlage.",
        },
        typeLabelByKind: {
          request: "Anfragetyp",
          response: "Antworttyp",
        },
        typeOptions: {
          string: "string",
          number: "number",
          boolean: "boolean",
          object: "object",
          array: "array",
          null: "null",
          unknown: "unknown",
        },
        typePlaceholderByKind: {
          request: "Benenne deinen Anfragetyp",
          response: "Benenne deinen Antworttyp",
        },
        typeTemplateLabelByKind: {
          request: "Anfragetyp-Vorlage",
          response: "Antworttyp-Vorlage",
        },
      },
      responseOverlayTitle:
        "Datenstruktur zu dieser Route hinzufügen",
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
