import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile navigation owns focus and releases scroll lock", async ({ page }) => {
  await page.goto("/en");
  const trigger = page.locator('button[aria-controls="mobile-primary-navigation"]');
  await expect(trigger).toHaveAccessibleName("Open primary navigation");
  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAccessibleName("Close primary navigation");
  await expect(page.getByRole("dialog", { name: "Primary navigation" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("visible");
});

test("mobile route navigation closes the dialog", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Primary navigation" });
  await dialog.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/en\/today$/);
  await expect(dialog).not.toBeVisible();
});

test("locale switcher preserves route identity", async ({ page }) => {
  await page.goto("/en/trending");
  const trigger = page.getByRole("button", { name: "Language" });
  await trigger.click();
  const germanLink = page.getByRole("link", { name: "Deutsch" });
  await expect(germanLink).toHaveAttribute("href", "/de/trending");
  await germanLink.click();
  await expect(page).toHaveURL(/\/de\/trending$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});

test("add-site action uses the exact global route", async ({ page }) => {
  await page.goto("/en");
  const addSite = page.getByRole("link", { name: "Add site" });
  await expect(addSite).toHaveAttribute("href", "/add-site");
  await addSite.click();
  await expect(page).toHaveURL(/\/add-site$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("search accepts text without submitting or changing the route", async ({ page }) => {
  await page.goto("/en/search");
  await expect(
    page.getByRole("heading", { name: "Search sites" }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search" });
  await search.fill("Lamentis");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/en\/search$/);
  await expect(search).toHaveValue("Lamentis");
});

test("search focus does not add an active border", async ({ page }) => {
  await page.goto("/en/search");

  const search = page.getByRole("searchbox", { name: "Search" });
  const searchRegion = page.getByRole("search", { name: "Search" });
  await search.focus();
  await expect(searchRegion).toHaveCSS("border-style", "none");
  await expect(searchRegion).toHaveCSS("outline-style", "none");
});
