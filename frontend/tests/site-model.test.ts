import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { assetPath } from "@/domain/site/assets";
import {
  contentByLocale,
  getFooterContent,
  getGlobalSiteChromeModel,
  getLocaleSwitcherModel,
  getNavigationContent,
  getRouteCopy,
  getSearchContent,
  getSiteChromeModel,
} from "@/domain/site/content";
import { serializeLocalePreference } from "@/domain/site/locale-preference";
import {
  footerRouteIds,
  indexableRouteIds,
  localeCatalog,
  matchRoute,
  navigationRouteIds,
  primaryNavigationRouteIds,
  routeAlternates,
  routePath,
  routeUrl,
  routeVariants,
  siteConfig,
  siteRouteIds,
  siteRoutes,
  supportedLocales,
  switchLocalePath,
  type FooterSectionId,
  type Locale,
  type NavigationArea,
} from "@/domain/site/routes";
import {
  metadataForNotFound,
  metadataForRoute,
  siteMetadataForLocale,
  structuredDataForRoute,
} from "@/domain/site/seo";

function stringLeaves(
  value: unknown,
  prefix = "",
): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      Object.entries(stringLeaves(child, prefix ? `${prefix}.${key}` : key))),
  );
}

describe("public URL golden contract", () => {
  it("freezes the fifteen public paths", () => {
    const publicPaths = siteRouteIds
      .flatMap((routeId) => routeVariants(routeId))
      .map((variant) => variant.path)
      .sort();

    expect(publicPaths).toEqual([
      "/add-site",
      "/de",
      "/de/about/elias-papavlassopoulos",
      "/de/api-creator-studio",
      "/de/legal-notice",
      "/de/search",
      "/de/today",
      "/de/trending",
      "/en",
      "/en/about/elias-papavlassopoulos",
      "/en/api-creator-studio",
      "/en/legal-notice",
      "/en/search",
      "/en/today",
      "/en/trending",
    ]);
  });
});

describe("site route authority", () => {
  it("derives unique public paths and URLs from keyed definitions", () => {
    const variants = siteRouteIds.flatMap((routeId) => routeVariants(routeId));
    expect(new Set(variants.map((variant) => variant.path)).size).toBe(variants.length);
    expect(new Set(variants.map((variant) => variant.url)).size).toBe(variants.length);

    for (const [routeId, definition] of Object.entries(siteRoutes)) {
      expect(definition).not.toHaveProperty("id");
      expect(definition).not.toHaveProperty("kind");
      expect(siteRouteIds).toContain(routeId);
    }
  });

  it("matches localized and global references and switches locale by route identity", () => {
    expect(matchRoute("/en/today")).toEqual({
      scope: "localized",
      locale: "en",
      routeId: "today",
    });
    expect(matchRoute("/de/about/elias-papavlassopoulos")).toEqual({
      scope: "localized",
      locale: "de",
      routeId: "about",
    });
    expect(matchRoute("/add-site")).toEqual({
      scope: "global",
      routeId: "addSite",
    });
    expect(matchRoute("/fr/today")).toBeNull();
    expect(matchRoute("/en/unknown")).toBeNull();
    expect(switchLocalePath("/en/trending", "de")).toBe("/de/trending");
    expect(switchLocalePath("/add-site", "de")).toBe("/add-site");
    expect(switchLocalePath("/en/unknown", "de")).toBe("/de");
  });

  it("keeps locale and site facts in their dedicated catalogs", () => {
    expect(supportedLocales).toEqual(Object.keys(localeCatalog));
    expect(Object.keys(siteConfig)).toEqual(["brandName", "origin", "externalLinks"]);
    expect(new URL(siteConfig.origin).protocol).toBe("https:");
    for (const href of Object.values(siteConfig.externalLinks)) {
      expect(new URL(href).protocol).toBe("https:");
    }
  });

  it("orders every placement without duplicate positions", () => {
    for (const area of ["primary", "action"] satisfies NavigationArea[]) {
      const orders = navigationRouteIds(area).map(
        (routeId) => siteRoutes[routeId].placement.navigation!.order,
      );
      expect(orders).toEqual([...orders].sort((left, right) => left - right));
      expect(new Set(orders).size).toBe(orders.length);
    }

    for (const section of ["platform", "legal", "links"] satisfies FooterSectionId[]) {
      const orders = footerRouteIds(section).map(
        (routeId) => siteRoutes[routeId].placement.footer!.order,
      );
      expect(orders).toEqual([...orders].sort((left, right) => left - right));
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("has complete localized route copy", () => {
    for (const locale of supportedLocales) {
      expect(Object.keys(contentByLocale[locale].routes).sort()).toEqual(
        [...siteRouteIds].sort(),
      );
      for (const routeId of siteRouteIds) {
        expect(getRouteCopy(locale, routeId).title).not.toHaveLength(0);
        expect(getRouteCopy(locale, routeId).description).not.toHaveLength(0);
      }
      expect(contentByLocale[locale].placeholderStatus).not.toHaveLength(0);
    }
  });

  it("keeps only explicitly language-neutral copy identical", () => {
    const english = stringLeaves(contentByLocale.en);
    const german = stringLeaves(contentByLocale.de);

    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort());
    expect(
      Object.keys(english)
        .filter((path) => english[path] === german[path])
        .sort(),
    ).toEqual([
      "apiCreatorStudio.responseEditor.routeLabel",
      "apiCreatorStudio.responseEditor.typeOptions.array",
      "apiCreatorStudio.responseEditor.typeOptions.boolean",
      "apiCreatorStudio.responseEditor.typeOptions.null",
      "apiCreatorStudio.responseEditor.typeOptions.number",
      "apiCreatorStudio.responseEditor.typeOptions.object",
      "apiCreatorStudio.responseEditor.typeOptions.string",
      "apiCreatorStudio.responseEditor.typeOptions.unknown",
      "footer.copyright",
      "footer.githubLabel",
      "footer.sections.links.title",
      "routes.apiCreatorStudio.title",
    ]);
  });

  it("projects navigation, footer, and locale switching from shared authorities", () => {
    const navigation = getNavigationContent("en");
    const footer = getFooterContent("en");
    const chrome = getSiteChromeModel("en");

    expect(navigation.items.map((item) => item.routeId)).toEqual(
      primaryNavigationRouteIds,
    );
    expect(navigation.items.map((item) => item.routeId)).toEqual(
      navigationRouteIds("primary"),
    );
    expect(navigation.action).toMatchObject({
      scope: "global",
      routeId: "addSite",
      href: "/add-site",
      label: "Add site",
    });
    expect(navigation.actionOverrides.apiCreatorStudio).toMatchObject({
      kind: "api-contract-download",
      label: "Download",
      errorLabel: "Download failed",
    });
    for (const section of footer.sections) {
      const internalRouteIds = section.links.flatMap((link) => (
        link.kind === "internal" ? [link.routeId] : []
      ));
      expect(internalRouteIds).toEqual(footerRouteIds(section.id));
    }
    expect(footer.sections).toHaveLength(3);
    expect(footer.sections[2]?.links[0]).toMatchObject({
      routeId: "about",
      icon: "profile",
    });
    expect(chrome.navigation).toEqual(navigation);
    expect(chrome.footer).toEqual(footer);
    expect(chrome.localeSwitcher).toEqual(getLocaleSwitcherModel("en"));
    expect(getGlobalSiteChromeModel().localeSwitcher).toBeNull();
    expect(getGlobalSiteChromeModel("de").navigation).toMatchObject({
      locale: "de",
      ariaLabel: "Hauptnavigation",
      action: { label: "Website hinzufügen" },
      actionOverrides: {
        apiCreatorStudio: {
          label: "Herunterladen",
        },
      },
    });
  });

  it("projects only matching internal references and safe external links", () => {
    for (const locale of supportedLocales) {
      const navigation = getNavigationContent(locale);
      const footer = getFooterContent(locale);

      for (const item of [...navigation.items, navigation.action]) {
        expect(matchRoute(item.href)).toEqual({
          scope: item.scope,
          routeId: item.routeId,
          ...(item.scope === "localized" ? { locale: item.locale } : {}),
        });
      }

      for (const link of footer.sections.flatMap((section) => section.links)) {
        if (link.kind === "internal") {
          expect(matchRoute(link.href)).toEqual({
            scope: link.scope,
            routeId: link.routeId,
            ...(link.scope === "localized" ? { locale: link.locale } : {}),
          });
        } else {
          expect(new URL(link.href).protocol).toBe("https:");
          expect(link.newWindow).toBe(true);
        }
      }
    }
  });

  it("builds absolute route URLs and localized alternates", () => {
    const localizedRef = {
      scope: "localized",
      locale: "de",
      routeId: "trending",
    } as const;
    const globalRef = { scope: "global", routeId: "addSite" } as const;

    expect(routePath(localizedRef)).toBe("/de/trending");
    expect(routeUrl(localizedRef)).toBe("https://lamentis.de/de/trending");
    expect(routePath(globalRef)).toBe("/add-site");
    expect(routeUrl(globalRef)).toBe("https://lamentis.de/add-site");
    expect(routeAlternates("trending")).toEqual({
      en: "https://lamentis.de/en/trending",
      de: "https://lamentis.de/de/trending",
      "x-default": "https://lamentis.de/en/trending",
    });
  });

  it("keeps only the localized homepage indexable", () => {
    expect(indexableRouteIds).toEqual(["home"]);
    expect(routeVariants(indexableRouteIds[0]!).every((route) => route.scope === "localized"))
      .toBe(true);
  });

  it("keeps search copy localized without introducing route rendering types", () => {
    expect(getSearchContent("en")).toEqual({
      heading: "Search sites",
      label: "Search sites",
      placeholder: "Search",
    });
    expect(getSearchContent("de")).toEqual({
      heading: "Websites durchsuchen",
      label: "Websites durchsuchen",
      placeholder: "Suchen",
    });
  });

  it("serializes the validated locale preference without route state", () => {
    expect(serializeLocalePreference("de")).toBe(
      "lamentis-locale=de; Path=/; Max-Age=31536000; SameSite=Lax",
    );
  });
});

describe("locale projections", () => {
  it.each(supportedLocales)("uses catalog display labels for %s", (locale: Locale) => {
    const switcher = getLocaleSwitcherModel(locale);
    expect(switcher.locale).toBe(locale);
    expect(switcher.options).toEqual(
      supportedLocales.map((code) => ({ code, label: localeCatalog[code].label })),
    );
  });
});

describe("site SEO authority", () => {
  it("builds absolute canonical metadata from route references", () => {
    const localizedRef = {
      scope: "localized",
      locale: "de",
      routeId: "trending",
    } as const;
    const globalRef = { scope: "global", routeId: "addSite" } as const;
    const localizedMetadata = metadataForRoute(localizedRef);
    const globalMetadata = metadataForRoute(globalRef);

    expect(localizedMetadata.alternates?.canonical).toBe(routeUrl(localizedRef));
    expect(localizedMetadata.alternates?.languages).toEqual(
      routeAlternates("trending"),
    );
    expect(localizedMetadata.openGraph?.locale).toBe(localeCatalog.de.openGraphLocale);
    expect(localizedMetadata.robots).toMatchObject({ index: false, follow: true });
    expect(globalMetadata.alternates?.canonical).toBe(routeUrl(globalRef));
    expect(globalMetadata.alternates?.languages).toBeUndefined();
    expect(globalMetadata.openGraph?.alternateLocale).toBeUndefined();
    expect(metadataForRoute(globalRef, "de")).toMatchObject({
      title: "Website hinzufügen",
      description: "Eine Website zu Lamentis hinzufügen.",
    });
    expect(siteMetadataForLocale("de").description).toBe(
      "Lamentis ist eine Plattform zum Entdecken und Teilen von Websites.",
    );
    expect(metadataForNotFound("de")).toMatchObject({
      title: "Seite nicht gefunden",
      description: "Die angeforderte Seite existiert nicht.",
    });
  });

  it("selects route icons and social images from the asset manifest policy", () => {
    const homeMetadata = metadataForRoute({
      scope: "localized",
      locale: "en",
      routeId: "home",
    });
    const aboutMetadata = metadataForRoute({
      scope: "localized",
      locale: "en",
      routeId: "about",
    });

    expect(JSON.stringify(homeMetadata.icons)).toContain(assetPath("siteFavicon32"));
    expect(JSON.stringify(homeMetadata.openGraph?.images)).toContain(
      new URL(assetPath("brandMark"), siteConfig.origin).toString(),
    );
    expect(JSON.stringify(aboutMetadata.icons)).toContain(assetPath("profilePortrait"));
    expect(aboutMetadata.openGraph?.images).toBeUndefined();
  });

  it("projects structured data only for the configured route", () => {
    const homeRef = {
      scope: "localized",
      locale: "en",
      routeId: "home",
    } as const;
    expect(structuredDataForRoute(homeRef)).toMatchObject({
      "@type": "Organization",
      name: siteConfig.brandName,
      url: routeUrl(homeRef),
      logo: new URL(assetPath("brandMark"), siteConfig.origin).toString(),
      sameAs: Object.values(siteConfig.externalLinks),
    });
    expect(structuredDataForRoute({
      scope: "localized",
      locale: "en",
      routeId: "about",
    })).toBeNull();
  });

  it("keeps the sitemap equal to indexable localized variants", () => {
    const expectedEntries = indexableRouteIds.flatMap((routeId) =>
      routeVariants(routeId).flatMap((variant) => (
        variant.scope === "localized"
          ? [{
              url: variant.url,
              alternates: { languages: routeAlternates(variant.routeId) },
            }]
          : []
      )),
    );
    expect(sitemap()).toEqual(expectedEntries);
  });
});
