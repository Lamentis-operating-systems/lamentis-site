import { describe, expect, it } from "vitest";
import { iconSets } from "@/domain/site/assets";
import {
  contentByLocale,
  getFooterContent,
  getNavigationContent,
  getRouteCopy,
} from "@/domain/site/content";
import {
  matchRoute,
  routeAlternates,
  routePath,
  siteRouteIds,
  supportedLocales,
  switchLocalePath,
} from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

describe("site route authority", () => {
  it("defines ten unique localized URLs", () => {
    const paths = supportedLocales.flatMap((locale) =>
      siteRouteIds.map((routeId) => routePath(locale, routeId)),
    );
    expect(paths).toHaveLength(10);
    expect(new Set(paths)).toHaveLength(10);
  });

  it("matches routes and switches locale by route identity", () => {
    expect(matchRoute("/en/nox")).toEqual({ locale: "en", routeId: "nox" });
    expect(matchRoute("/de/about/elias-papavlassopoulos")).toEqual({
      locale: "de",
      routeId: "about",
    });
    expect(matchRoute("/fr/nox")).toBeNull();
    expect(matchRoute("/en/unknown")).toBeNull();
    expect(switchLocalePath("/en/nox", "de")).toBe("/de/nox");
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
    expect(navigation.items.map((item) => item.routeId)).toEqual(["noma", "nox"]);
    expect(footer.sections[0]?.links.map((link) => link.kind === "internal" && link.routeId)).toEqual([
      "noma",
      "nox",
    ]);
    expect(footer.sections).toHaveLength(3);
  });

  it("projects only valid localized internal and HTTPS external links", () => {
    for (const locale of supportedLocales) {
      const navigation = getNavigationContent(locale);
      const footer = getFooterContent(locale);

      for (const item of navigation.items) {
        expect(matchRoute(item.href)).toEqual({ locale, routeId: item.routeId });
        expect(new URL(item.repositoryUrl).protocol).toBe("https:");
      }

      for (const link of footer.sections.flatMap((section) => section.links)) {
        if (link.kind === "internal") {
          expect(matchRoute(link.href)).toEqual({ locale, routeId: link.routeId });
        } else {
          expect(new URL(link.href).protocol).toBe("https:");
          expect(link.newWindow).toBe(true);
        }
      }
    }
  });
});

describe("site metadata authority", () => {
  it("keeps only the homepage indexable", () => {
    expect(metadataForRoute("en", "home").robots).toMatchObject({ index: true });
    for (const routeId of ["nox", "noma", "legalNotice", "about"] as const) {
      expect(metadataForRoute("en", routeId).robots).toMatchObject({ index: false });
    }
  });

  it("builds canonical and language alternates from route ids", () => {
    const metadata = metadataForRoute("de", "nox");
    expect(metadata.alternates?.canonical).toBe("/de/nox");
    expect(routeAlternates("nox")).toEqual({
      en: "https://lamentis.de/en/nox",
      de: "https://lamentis.de/de/nox",
      "x-default": "https://lamentis.de/en/nox",
    });
    expect(metadata.alternates?.languages).toEqual(routeAlternates("nox"));
  });

  it("selects the route icon set from the route catalog", () => {
    expect(metadataForRoute("en", "home").icons).toBe(iconSets.site);
    expect(metadataForRoute("en", "nox").icons).toBe(iconSets.site);
    expect(metadataForRoute("en", "about").icons).toBe(iconSets.about);
  });
});
