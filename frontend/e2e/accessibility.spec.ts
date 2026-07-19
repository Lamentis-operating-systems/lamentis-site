import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";
import {
  routePath,
} from "../domain/site/routes";
import { publicRouteVariants } from "./route-projections";

const homePath = routePath({ scope: "localized", locale: "en", routeId: "home" });
const searchPath = routePath({ scope: "localized", locale: "en", routeId: "search" });
const reflowPaths = [
  homePath,
  routePath({ scope: "localized", locale: "en", routeId: "today" }),
  searchPath,
  routePath({ scope: "global", routeId: "addSite" }),
] as const;

async function expectMinimumTouchTarget(locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

for (const route of publicRouteVariants) {
  test(`${route.path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route.path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const blockingViolations = result.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(blockingViolations).toEqual([]);
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(searchPath);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });
}

for (const width of [390, 1440]) {
  test(`footer icon links share a text axis at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(homePath);

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

for (const path of reflowPaths) {
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

test("mobile toggle controls keep a 44 pixel touch target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(homePath);

  await expectMinimumTouchTarget(
    page.getByRole("button", { name: "Open primary navigation" }),
  );
  await expectMinimumTouchTarget(page.getByRole("button", { name: "Language" }));
});

test("the sticky header keeps page content out of its layout area", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(searchPath);

  const [navigationBox, mainBox] = await Promise.all([
    page.getByRole("navigation", { name: "Primary navigation" }).boundingBox(),
    page.getByRole("main").boundingBox(),
  ]);
  expect(navigationBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(mainBox!.y).toBeGreaterThanOrEqual(
    navigationBox!.y + navigationBox!.height - 0.5,
  );
});

test("reduced motion removes authored transition duration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(homePath);
  await expect(page.getByRole("link", { name: "Add site" })).toHaveCSS(
    "transition-duration",
    "0s",
  );
});

test("the add-site action remains visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(homePath);
  await expect(page.getByRole("link", { name: "Add site" })).toBeVisible();
});

test("the search field remains visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(searchPath);
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeVisible();
});
