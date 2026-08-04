import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";
import { apiRoutesStorage } from "../domain/site/api-route-storage";
import { routePath } from "../domain/site/routes";
import { publicRouteVariants } from "./route-projections";

const homePath = routePath({ scope: "localized", locale: "en", routeId: "home" });
const searchPath = routePath({ scope: "localized", locale: "en", routeId: "search" });
const studioPath = routePath({
  scope: "localized",
  locale: "en",
  routeId: "apiCreatorStudio",
});
const reflowPaths = [
  homePath,
  routePath({ scope: "localized", locale: "en", routeId: "today" }),
  searchPath,
  studioPath,
  routePath({ scope: "global", routeId: "addSite" }),
] as const;
const wcagConformanceTags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

async function expectMinimumTouchTarget(locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("The touch target must have a bounding box.");
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

for (const route of publicRouteVariants) {
  test(`${route.path} has no WCAG A or AA violations`, async ({ page }) => {
    await page.goto(route.path);
    const result = await new AxeBuilder({ page })
      .withTags([...wcagConformanceTags])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("the open response overlay has no WCAG A or AA violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(studioPath);
  await page.getByRole("textbox", {
    name: "API endpoint path",
  }).fill("users/{id}");
  await page.getByRole("textbox", {
    name: "API endpoint path",
  }).press("Enter");
  await expect(page.getByRole("dialog", {
    name: "Define this API route",
  })).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags([...wcagConformanceTags])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("the JSON request and response editors have contextual accessible names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(studioPath);
  await page.getByRole("button", { name: "HTTP method GET" }).click();
  await page.getByRole("list", { name: "HTTP method" })
    .getByRole("button", { name: "POST" }).click();
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("profiles");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Define this API route",
  });
  await expect(dialog.getByRole("textbox", { name: "Request JSON" }))
    .toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Response JSON" }))
    .toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "HTTP status" }))
    .toHaveValue("201");
  const advancedToggle = dialog.getByRole("button", {
    name: "Advanced settings: Expand",
  });
  await advancedToggle.focus();
  await expect.poll(async () => advancedToggle.evaluate((element) => ({
    style: getComputedStyle(element).outlineStyle,
    width: getComputedStyle(element).outlineWidth,
  }))).toEqual({ style: "solid", width: "2px" });
  await advancedToggle.click();
  await expect(dialog.getByRole("button", {
    name: "Advanced settings: Collapse",
  })).toHaveAttribute("aria-expanded", "true");
  expect(await dialog.evaluate((element) => (
    element.scrollWidth <= element.clientWidth
  ))).toBe(true);

  const result = await new AxeBuilder({ page })
    .withTags([...wcagConformanceTags])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("route validation exposes its canonical prefix and error reasons", async ({
  page,
}) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });

  await expect(routeInput).toHaveAccessibleDescription(
    "A leading slash is added automatically.",
  );
  await expect(routeInput).not.toHaveAttribute("aria-invalid");

  await routeInput.fill("users/{}");
  await expect(routeInput).toHaveAttribute("aria-invalid", "true");
  await expect(routeInput).toHaveAccessibleDescription(
    "A leading slash is added automatically. "
    + "Use lowercase letters and numbers in path segments. "
    + "Wrap parameter names in braces and start them with a letter.",
  );

  await routeInput.fill("users");
  await routeInput.press("Enter");
  const responseDialog = page.getByRole("dialog", {
    name: "Define this API route",
  });
  await expect(responseDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(responseDialog).not.toBeVisible();

  await routeInput.fill("users");
  await expect(routeInput).toHaveAttribute("aria-invalid", "true");
  await expect(routeInput).toHaveAccessibleDescription(
    "A leading slash is added automatically. "
    + "This HTTP method and path already exist.",
  );

  const result = await new AxeBuilder({ page })
    .withTags([...wcagConformanceTags])
    .analyze();
  expect(result.violations).toEqual([]);
});

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
    if (path === studioPath) {
      await page.addInitScript(
        ({ key }) => {
          window.localStorage.setItem(key, JSON.stringify([{
            id: 0,
            method: "DELETE",
            path: "/accounts/{accountid}/subscriptions/{subscriptionid}",
          }]));
        },
        { key: apiRoutesStorage.key },
      );
    }
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
  await expectMinimumTouchTarget(
    page.getByRole("button", { name: "Language English" }),
  );
});

test("the sticky header keeps page content out of its layout area", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(searchPath);

  const [navigationBox, mainBox] = await Promise.all([
    page.getByRole("navigation", { name: "Primary navigation" }).boundingBox(),
    page.getByRole("main").boundingBox(),
  ]);
  if (!navigationBox || !mainBox) {
    throw new Error("The navigation and main content must have layout boxes.");
  }
  expect(mainBox.y).toBeGreaterThanOrEqual(
    navigationBox.y + navigationBox.height - 0.5,
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
