import { expect, test, type Page } from "@playwright/test";
import { routePath } from "../domain/site/routes";

const viewports = [
  { id: "mobile", width: 390, height: 844 },
  { id: "desktop", width: 1440, height: 1000 },
] as const;

const colorSchemes = ["light", "dark"] as const;

const visualArchetypes = [
  {
    id: "home-en",
    path: routePath({ scope: "localized", locale: "en", routeId: "home" }),
    status: 200,
  },
  {
    id: "search-de",
    path: routePath({ scope: "localized", locale: "de", routeId: "search" }),
    status: 200,
  },
  {
    id: "legal-en",
    path: routePath({ scope: "localized", locale: "en", routeId: "legalNotice" }),
    status: 200,
  },
  { id: "not-found-de", path: "/de/unknown", status: 404 },
] as const;

const documentNotFoundMessage =
  "Failed to load resource: the server responded with a status of 404 (Not Found)";

function collectPageErrors(page: Page, expectedStatus: number): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    const isExpectedDocumentNotFound =
      expectedStatus === 404 && message.text() === documentNotFoundMessage;
    if (message.type() === "error" && !isExpectedDocumentNotFound) {
      errors.push(message.text());
    }
  });
  page.on("response", (response) => {
    const isExpectedDocumentNotFound =
      expectedStatus === 404 && response.request().resourceType() === "document";
    if (response.status() >= 400 && !isExpectedDocumentNotFound) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function settlePage(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

for (const route of visualArchetypes) {
  for (const viewport of viewports) {
    for (const colorScheme of colorSchemes) {
      test(`${route.id} ${viewport.id} ${colorScheme}`, async ({ page }) => {
        const pageErrors = collectPageErrors(page, route.status);
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });

        const response = await page.goto(route.path, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(route.status);
        await settlePage(page);

        expect(pageErrors).toEqual([]);
        await expect(page).toHaveScreenshot(
          `${route.id}-${viewport.id}-${colorScheme}.png`,
          { fullPage: true, animations: "disabled", caret: "hide" },
        );
      });
    }
  }
}

for (const colorScheme of colorSchemes) {
  test(`API Creator Studio response and route list ${colorScheme}`, async ({
    page,
  }) => {
    const pageErrors = collectPageErrors(page, 200);
    await page.setViewportSize(viewports[1]);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(routePath({
      scope: "localized",
      locale: "en",
      routeId: "apiCreatorStudio",
    }));
    await page.getByRole("button", { name: "HTTP method GET" }).click();
    await page.getByRole("list", { name: "HTTP method" })
      .getByRole("button", { name: "POST" }).click();
    const routeInput = page.getByRole("textbox", {
      name: "API endpoint path",
    });
    await routeInput.fill("accounts/{accountid}");
    await routeInput.press("Enter");
    const responseDialog = page.getByRole("dialog", {
      name: "Define this API route",
    });
    await expect(responseDialog).toBeVisible();
    const requestJson = responseDialog.getByRole("textbox", {
      name: "Request JSON",
    });
    await requestJson.fill('{"name":"Ada"}');
    await responseDialog.getByRole("textbox", { name: "Response JSON" }).fill(
      '{"id":"user_123","name":"Ada"}',
    );
    await requestJson.evaluate((input) => {
      const field = input.closest("[data-json-input]");
      const scroller = input.closest("form")?.parentElement;
      if (!field || !scroller) return;
      scroller.scrollTop += field.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top
        - 16;
    });
    await settlePage(page);

    expect(pageErrors).toEqual([]);
    await expect(page).toHaveScreenshot(
      `api-creator-studio-response-open-desktop-${colorScheme}.png`,
      {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 5,
      },
    );

    await page.keyboard.press("Escape");
    await expect(responseDialog).not.toBeVisible();
    await expect(page.getByRole("list", { name: "API routes" })).toBeVisible();
    await settlePage(page);

    expect(pageErrors).toEqual([]);
    await expect(page).toHaveScreenshot(
      `api-creator-studio-desktop-${colorScheme}.png`,
      { fullPage: true, animations: "disabled", caret: "hide" },
    );
  });

  test(`mobile navigation open ${colorScheme}`, async ({ page }) => {
    const pageErrors = collectPageErrors(page, 200);
    await page.setViewportSize(viewports[0]);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(routePath({ scope: "localized", locale: "en", routeId: "home" }));
    await page.getByRole("button", { name: "Open primary navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Primary navigation" })).toBeVisible();
    await settlePage(page);

    expect(pageErrors).toEqual([]);
    await expect(page).toHaveScreenshot(`navigation-open-mobile-${colorScheme}.png`, {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });
  });

  test(`locale menu open ${colorScheme}`, async ({ page }) => {
    const pageErrors = collectPageErrors(page, 200);
    await page.setViewportSize(viewports[0]);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(routePath({ scope: "localized", locale: "en", routeId: "home" }));
    await page.getByRole("button", { name: "Language English" }).click();
    await expect(page.getByRole("link", { name: "Deutsch" })).toBeVisible();
    await settlePage(page);

    expect(pageErrors).toEqual([]);
    await expect(page).toHaveScreenshot(`locale-menu-open-mobile-${colorScheme}.png`, {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });
  });
}
