import { expect, test } from "@playwright/test";
import { globalRoutes, localizedRoutes } from "./site-routes";

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

for (const route of localizedRoutes) {
  test(`${route.path} keeps the route and SEO contract`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", route.locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${route.path.replaceAll("/", "\\/")}$`),
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);

    const robots = page.locator('meta[name="robots"]');
    if (route.indexable) {
      await expect(robots).toHaveAttribute("content", /index/);
    } else {
      await expect(robots).toHaveAttribute("content", /noindex/);
    }
  });
}

for (const route of globalRoutes) {
  test(`${route.path} keeps the global route and SEO contract`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", route.locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lamentis.de/add-site",
    );
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("main")).toBeEmpty();
  });
}

for (const path of ["/fr", "/nox", "/noma"]) {
  test(`${path} returns a noindex 404`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}

for (const invalidRoute of [
  { path: "/en/unknown", locale: "en", title: "Page not found" },
  { path: "/en/nox", locale: "en", title: "Page not found" },
  { path: "/en/noma", locale: "en", title: "Page not found" },
  { path: "/en/add-site", locale: "en", title: "Page not found" },
  { path: "/en/about/unknown", locale: "en", title: "Page not found" },
  { path: "/de/unknown", locale: "de", title: "Seite nicht gefunden" },
  { path: "/de/nox", locale: "de", title: "Seite nicht gefunden" },
  { path: "/de/noma", locale: "de", title: "Seite nicht gefunden" },
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

test("sitemap contains only the two home pages", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const sitemap = await response.text();
  expect(sitemap).toContain("https://lamentis.de/en");
  expect(sitemap).toContain("https://lamentis.de/de");
  expect(sitemap).not.toContain("/nox");
  expect(sitemap).not.toContain("/noma");
  expect(sitemap).not.toContain("/legal-notice");
  expect(sitemap).not.toContain("/about/");
  expect(sitemap).not.toContain("/today");
  expect(sitemap).not.toContain("/trending");
  expect(sitemap).not.toContain("/search");
  expect(sitemap).not.toContain("/add-site");
  expect(sitemap).toContain('hreflang="en" href="https://lamentis.de/en"');
  expect(sitemap).toContain('hreflang="de" href="https://lamentis.de/de"');
  expect(sitemap).not.toMatch(/hreflang="(?:en|de|x-default)" href="\//);
});

test("the shared favicon switches contrast with the system theme", async ({ page, request }) => {
  await page.goto("/en");
  await expect(
    page.locator(
      'link[rel="icon"][href="/assets/images/favicon-32-20260424.png?v=20260719"]' +
      '[media="(prefers-color-scheme: light)"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      'link[rel="icon"][href="/assets/images/app-logo-20260424.png?v=20260719"]' +
      '[media="(prefers-color-scheme: dark)"]',
    ),
  ).toHaveCount(1);
  await expect(page.locator('link[rel="shortcut icon"]')).toHaveCount(0);

  const response = await request.get("/assets/images/app-logo-20260424.png?v=20260719");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});

test("the Elias about route emits its portrait icon set", async ({ page, request }) => {
  await page.goto("/en/about/elias-papavlassopoulos");
  await expect(
    page.locator(
      'link[rel="icon"]' +
      '[href="/assets/images/about-favicon-elias-20260523-32.png?v=20260719"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('link[rel="icon"][href*="/assets/images/favicon-32-20260424.png"]'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      'link[rel="apple-touch-icon"]' +
      '[href="/assets/images/about-apple-touch-elias-20260523.png?v=20260719"]',
    ),
  ).toHaveCount(1);

  const response = await request.get(
    "/assets/images/about-favicon-elias-20260523-32.png?v=20260719",
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});
