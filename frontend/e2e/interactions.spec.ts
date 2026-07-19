import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile navigation owns focus and releases scroll lock", async ({ page }) => {
  await page.goto("/en");
  const trigger = page.locator('button[aria-controls="mobile-product-navigation"]');
  await expect(trigger).toHaveAccessibleName("Open product navigation");
  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAccessibleName("Close product navigation");
  await expect(page.getByRole("dialog", { name: "Product navigation" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("visible");
});

test("mobile route navigation closes the dialog", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open product navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Product navigation" });
  await dialog.getByRole("link", { name: "Noma Tasks" }).click();
  await expect(page).toHaveURL(/\/en\/noma$/);
  await expect(dialog).not.toBeVisible();
});

test("locale switcher preserves route identity", async ({ page }) => {
  await page.goto("/en/nox");
  const trigger = page.getByRole("button", { name: "Language" });
  await trigger.click();
  const germanLink = page.getByRole("link", { name: "Deutsch" });
  await expect(germanLink).toHaveAttribute("href", "/de/nox");
  await germanLink.click();
  await expect(page).toHaveURL(/\/de\/nox$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});
