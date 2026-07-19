import { expect, test } from "@playwright/test";
import { publicRoutes } from "./site-routes";

const viewports = [
  { id: "mobile", width: 390, height: 844 },
  { id: "desktop", width: 1440, height: 1000 },
] as const;

const colorSchemes = ["light", "dark"] as const;

for (const route of publicRoutes) {
  for (const viewport of viewports) {
    for (const colorScheme of colorSchemes) {
      test(`${route.id} ${viewport.id} ${colorScheme}`, async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });

        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        const response = await page.goto(route.path, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        expect(consoleErrors).toEqual([]);
        await expect(page).toHaveScreenshot(
          `${route.id}-${viewport.id}-${colorScheme}.png`,
          { fullPage: true, animations: "disabled", caret: "hide" },
        );
      });
    }
  }
}
