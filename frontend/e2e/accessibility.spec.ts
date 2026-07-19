import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { publicRoutes } from "./site-routes";

for (const route of publicRoutes) {
  test(`${route.path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route.path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const blockingViolations = result.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(blockingViolations).toEqual([]);
  });
}

for (const width of [320, 768, 1024]) {
  test(`layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en/search");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });
}

for (const width of [390, 1440]) {
  test(`footer icon links share a text axis at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en");

    const [aboutTextStart, githubTextStart] = await Promise.all([
      page.getByRole("link", { name: "About Me" }).locator("span").last().evaluate(
        (element) => element.getBoundingClientRect().x,
      ),
      page.getByRole("link", { name: "GitHub" }).locator("span").last().evaluate(
        (element) => element.getBoundingClientRect().x,
      ),
    ]);

    expect(Math.abs(aboutTextStart - githubTextStart)).toBeLessThanOrEqual(0.5);
  });
}

for (const path of ["/en", "/en/today", "/en/search", "/add-site"]) {
  test(`${path} reflows at 200 percent text size`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });
}

test("the add-site action remains visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Add site" })).toBeVisible();
});

test("the search field remains visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/en/search");
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeVisible();
});
