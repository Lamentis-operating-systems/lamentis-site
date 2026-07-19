import { describe, expect, it } from "vitest";
import { iconSets } from "@/domain/site/assets";
import {
  contentByLocale,
  getFooterContent,
  getNavigationContent,
  getRouteCopy,
  getSearchContent,
} from "@/domain/site/content";
import {
  matchRoute,
  primaryNavigationRouteIds,
  routeAlternates,
  routePath,
  routeVariants,
  siteRouteIds,
  siteRoutes,
  supportedLocales,
  switchLocalePath,
} from "@/domain/site/routes";
import { metadataForGlobalRoute, metadataForRoute } from "@/domain/site/seo";

describe("site route authority", () => {
  it("defines thirteen unique public URLs", () => {
    const variants = siteRouteIds.flatMap((routeId) => routeVariants(routeId));
    expect(variants).toHaveLength(13);
    expect(new Set(variants.map((variant) => variant.path))).toHaveLength(13);
  });

  it("matches localized and global routes and switches locale by route identity", () => {
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
      locale: null,
      routeId: "addSite",
    });
    expect(matchRoute("/fr/today")).toBeNull();
    expect(matchRoute("/en/nox")).toBeNull();
    expect(matchRoute("/en/noma")).toBeNull();
    expect(switchLocalePath("/en/trending", "de")).toBe("/de/trending");
    expect(switchLocalePath("/add-site", "de")).toBe("/add-site");
    expect(switchLocalePath("/en/unknown", "de")).toBe("/de");
  });

  it("has localized copy for every route", () => {
    for (const locale of supportedLocales) {
      for (const routeId of siteRouteIds) {
        expect(getRouteCopy(locale, routeId).title).not.toHaveLength(0);
        expect(getRouteCopy(locale, routeId).description).not.toHaveLength(0);
      }
      expect(contentByLocale[locale].placeholderStatus).not.toHaveLength(0);
    }
  });

  it("projects navigation and footer from the same route authority", () => {
    const navigation = getNavigationContent("en");
    const footer = getFooterContent("en");
    expect(navigation.items.map((item) => item.routeId)).toEqual([
      "today",
      "trending",
      "search",
      "home",
    ]);
    expect(navigation.items.map((item) => item.routeId)).toEqual(primaryNavigationRouteIds);
    expect(navigation.addSiteAction).toMatchObject({
      routeId: "addSite",
      href: "/add-site",
      label: "Add site",
    });
    expect(footer.sections[0]?.links.map((link) => (
      link.kind === "internal" ? link.routeId : null
    ))).toEqual(primaryNavigationRouteIds);
    expect(footer.sections).toHaveLength(3);
    expect(footer.sections[2]?.links[0]).toMatchObject({
      routeId: "about",
      icon: "profile",
    });
  });

  it("projects only valid internal and HTTPS external links", () => {
    for (const locale of supportedLocales) {
      const navigation = getNavigationContent(locale);
      const footer = getFooterContent(locale);

      for (const item of navigation.items) {
        expect(matchRoute(item.href)).toEqual({
          scope: "localized",
          locale,
          routeId: item.routeId,
        });
      }
      expect(matchRoute(navigation.addSiteAction.href)).toEqual({
        scope: "global",
        locale: null,
        routeId: "addSite",
      });

      for (const link of footer.sections.flatMap((section) => section.links)) {
        if (link.kind === "internal") {
          expect(matchRoute(link.href)?.routeId).toBe(link.routeId);
        } else {
          expect(new URL(link.href).protocol).toBe("https:");
          expect(link.newWindow).toBe(true);
        }
      }
    }
  });

  it("keeps the explicit add-site path outside the locale namespace", () => {
    expect(routePath("addSite")).toBe("/add-site");
    expect(matchRoute("/en/add-site")).toBeNull();
    expect(matchRoute("/de/add-site")).toBeNull();
  });

  it("keeps search copy localized and marks the route by semantic kind", () => {
    expect(getSearchContent("en")).toEqual({
      heading: "Search sites",
      label: "Search",
      placeholder: "Search",
    });
    expect(getSearchContent("de")).toEqual({
      heading: "Websites durchsuchen",
      label: "Suche",
      placeholder: "Suchen",
    });
    expect(siteRoutes.search.kind).toBe("search");
  });
});

describe("site metadata authority", () => {
  it("keeps only the localized homepage indexable", () => {
    expect(metadataForRoute("en", "home").robots).toMatchObject({ index: true });
    for (const routeId of [
      "today",
      "trending",
      "search",
      "legalNotice",
      "about",
    ] as const) {
      expect(metadataForRoute("en", routeId).robots).toMatchObject({ index: false });
    }
    expect(metadataForGlobalRoute("addSite").robots).toMatchObject({ index: false });
  });

  it("builds localized canonicals and language alternates from route ids", () => {
    const metadata = metadataForRoute("de", "trending");
    expect(metadata.alternates?.canonical).toBe("/de/trending");
    expect(routeAlternates("trending")).toEqual({
      en: "https://lamentis.de/en/trending",
      de: "https://lamentis.de/de/trending",
      "x-default": "https://lamentis.de/en/trending",
    });
    expect(metadata.alternates?.languages).toEqual(routeAlternates("trending"));
  });

  it("keeps the global add-site route canonical and without hreflang", () => {
    const metadata = metadataForGlobalRoute("addSite");
    expect(metadata.alternates?.canonical).toBe("https://lamentis.de/add-site");
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.openGraph?.alternateLocale).toBeUndefined();
  });

  it("selects icon sets from the route catalog", () => {
    expect(metadataForRoute("en", "home").icons).toBe(iconSets.site);
    expect(metadataForGlobalRoute("addSite").icons).toBe(iconSets.site);
    expect(metadataForRoute("en", "about").icons).toBe(iconSets.about);
  });
});
