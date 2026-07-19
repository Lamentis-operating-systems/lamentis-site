import { expect, test } from "@playwright/test";
import { assetManifest, assetPath } from "../domain/site/assets";
import {
  defaultLocale,
  indexableRouteIds,
  localeCatalog,
  routeAlternates,
  routePath,
  routeVariants,
  siteRouteIds,
  siteRoutes,
} from "../domain/site/routes";
import { publicRouteVariants } from "./route-projections";

test("root negotiates German with a temporary redirect", async ({ request }) => {
  const response = await request.get("/", {
    headers: { "accept-language": "en;q=0.4,de-DE;q=0.9" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/de$/);
});

test("root falls back to English", async ({ request }) => {
  const response = await request.get("/", {
    headers: { "accept-language": "fr-FR,es;q=0.9" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/en$/);
});

for (const acceptLanguage of ["*", "!!!"]) {
  test(`root safely handles ${acceptLanguage}`, async ({ request }) => {
    const response = await request.get("/", {
      headers: { "accept-language": acceptLanguage },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/en$/);
  });
}

for (const route of publicRouteVariants) {
  test(`${route.path} keeps the route and SEO contract`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);

    const documentLocale = route.scope === "localized" ? route.locale : defaultLocale;
    await expect(page.locator("html")).toHaveAttribute("lang", documentLocale);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", route.url);

    if (route.scope === "localized") {
      const alternates = routeAlternates(route.routeId);
      for (const [locale, href] of Object.entries(alternates)) {
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
        ).toHaveAttribute("href", href);
      }
      const alternateLocales = Object.values(localeCatalog)
        .filter((definition) => definition.openGraphLocale !== localeCatalog[route.locale].openGraphLocale)
        .map((definition) => definition.openGraphLocale);
      for (const openGraphLocale of alternateLocales) {
        await expect(
          page.locator(`meta[property="og:locale:alternate"][content="${openGraphLocale}"]`),
        ).toHaveCount(1);
      }
    } else {
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
      await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveCount(0);
    }

    const robotsContent = await page.locator('meta[name="robots"]').getAttribute("content");
    if (siteRoutes[route.routeId].seo.index) {
      expect(robotsContent).toContain("index");
      expect(robotsContent).not.toContain("noindex");
    } else {
      expect(robotsContent).toContain("noindex");
    }
  });
}

for (const path of ["/fr", "/missing", "/unknown-route"]) {
  test(`${path} returns a noindex 404`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}

for (const invalidRoute of [
  { path: "/en/unknown", locale: "en", title: "Page not found" },
  { path: "/en/add-site", locale: "en", title: "Page not found" },
  { path: "/en/about/unknown", locale: "en", title: "Page not found" },
  { path: "/de/unknown", locale: "de", title: "Seite nicht gefunden" },
  { path: "/de/add-site", locale: "de", title: "Seite nicht gefunden" },
] as const) {
  test(`${invalidRoute.path} uses the localized noindex 404`, async ({ page }) => {
    const response = await page.goto(invalidRoute.path);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", invalidRoute.locale);
    await expect(page.getByRole("heading", { name: invalidRoute.title })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}

test("sitemap contains exactly the indexable localized route variants", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const sitemap = await response.text();
  const indexableVariants = indexableRouteIds.flatMap((routeId) => routeVariants(routeId));
  const nonIndexableVariants = siteRouteIds
    .filter((routeId) => !indexableRouteIds.includes(routeId))
    .flatMap((routeId) => routeVariants(routeId));

  for (const route of indexableVariants) {
    expect(sitemap).toContain(`<loc>${route.url}</loc>`);
  }
  for (const route of nonIndexableVariants) {
    expect(sitemap).not.toContain(`<loc>${route.url}</loc>`);
  }
  expect(sitemap.match(/<url>/g)).toHaveLength(indexableVariants.length);
  expect(sitemap).not.toMatch(/hreflang="(?:en|de|x-default)" href="\//);
});

test("the shared favicon switches contrast with the system theme", async ({ page, request }) => {
  await page.goto(routePath({ scope: "localized", locale: "en", routeId: "home" }));
  for (const icon of assetManifest.iconSets.site.icon) {
    const mediaSelector = icon.media ? `[media="${icon.media}"]` : "";
    await expect(
      page.locator(`link[rel="icon"][href="${assetPath(icon.assetId)}"]${mediaSelector}`),
    ).toHaveCount(1);
  }
  await expect(page.locator('link[rel="shortcut icon"]')).toHaveCount(0);

  const response = await request.get(assetPath("brandMark"));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});

test("the Elias about route emits its portrait icon set", async ({ page, request }) => {
  await page.goto(
    routePath({ scope: "localized", locale: "en", routeId: "about" }),
  );
  for (const icon of assetManifest.iconSets.about.icon) {
    await expect(
      page.locator(`link[rel="icon"][href="${assetPath(icon.assetId)}"]`),
    ).toHaveCount(1);
  }
  await expect(
    page.locator(`link[rel="icon"][href="${assetPath("siteFavicon32")}"]`),
  ).toHaveCount(0);
  await expect(
    page.locator(
      `link[rel="apple-touch-icon"][href="${assetPath(assetManifest.iconSets.about.apple.assetId)}"]`,
    ),
  ).toHaveCount(1);

  const response = await request.get(assetPath("profilePortrait"));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});
