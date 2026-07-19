import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { localizedRoutes } from "./site-routes";

for (const route of localizedRoutes) {
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
    await page.goto("/en/nox");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });
}

for (const path of ["/en", "/en/nox", "/en/noma"]) {
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

test("product title remains visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/en/nox");
  await expect(page.getByRole("heading", { name: "NOX" })).toBeVisible();
});
