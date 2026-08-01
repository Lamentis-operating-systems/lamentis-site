import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("the page scrollbar is hidden without disabling scrolling", {
  tag: "@cross-browser-smoke",
}, async ({ browserName, page }) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto("/en/search");

  const root = page.locator("html");
  const scrollbarStyle = browserName === "webkit"
    ? await root.evaluate(
      (element) => getComputedStyle(element, "::-webkit-scrollbar").display,
    )
    : await root.evaluate(
      (element) => getComputedStyle(element).scrollbarWidth,
    );
  expect(scrollbarStyle).toBe("none");

  const scrollRange = await page.evaluate(() => {
    const scroller = document.scrollingElement;
    if (!scroller) {
      throw new Error("The page must expose a scrolling element.");
    }

    return scroller.scrollHeight - scroller.clientHeight;
  });
  expect(scrollRange).toBeGreaterThan(0);

  await page.mouse.move(195, 240);
  await page.mouse.wheel(0, 480);
  await expect.poll(
    () => page.evaluate(() => document.scrollingElement?.scrollTop ?? 0),
  ).toBeGreaterThan(0);
});

test("mobile navigation owns focus and releases scroll lock", {
  tag: "@cross-browser-smoke",
}, async ({ page }) => {
  await page.goto("/en");
  const openTrigger = page.getByRole("button", { name: "Open primary navigation" });
  await expect(openTrigger).toHaveAccessibleName("Open primary navigation");
  const iconButtonGeometry = await openTrigger.evaluate((element) => {
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      borderRadius: Number.parseFloat(styles.borderRadius),
      height: rect.height,
      width: rect.width,
    };
  });
  expect(iconButtonGeometry.width).toBe(iconButtonGeometry.height);
  expect(iconButtonGeometry.borderRadius).toBeGreaterThanOrEqual(
    iconButtonGeometry.width / 2,
  );
  const controlledDialogId = await openTrigger.getAttribute("aria-controls");
  expect(controlledDialogId).toBeTruthy();
  if (!controlledDialogId) {
    throw new Error("The mobile trigger must reference its dialog.");
  }
  await openTrigger.click();

  const trigger = page.locator(`button[aria-controls="${controlledDialogId}"]`);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAccessibleName("Close primary navigation");
  const dialog = page.getByRole("dialog", { name: "Primary navigation" });
  await expect(dialog).toHaveAttribute("id", controlledDialogId);
  await expect(dialog).toBeVisible();
  await expect.poll(
    () => dialog.evaluate(
      (element) => element.contains(document.activeElement),
    ),
  ).toBe(true);
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
  await dialog.getByRole("link", { name: "API Creator Studio" }).click();
  await expect(page).toHaveURL(/\/en\/api-creator-studio$/);
  await expect(dialog).not.toBeVisible();
});

test("locale switcher preserves route identity", async ({ page }) => {
  await page.goto("/en/trending");
  const trigger = page.getByRole("button", { name: "Language English" });
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

test("add-site keeps the selected locale across its global route", async ({ page }) => {
  await page.goto("/de");
  const addSite = page.getByRole("link", { name: "Website hinzufügen" });
  await expect(addSite).toHaveAttribute("href", "/add-site");
  await addSite.click();

  await expect(page).toHaveURL(/\/add-site$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  await expect(page.getByRole("main", { name: "Website hinzufügen" })).toBeVisible();
  await expect(page).toHaveTitle(/Website hinzufügen/);
});

test("search accepts text without submitting or changing the route", async ({ page }) => {
  await page.goto("/en/search");
  await expect(
    page.getByRole("heading", { name: "Search sites" }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search sites" });
  await search.fill("Lamentis");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/en\/search$/);
  await expect(search).toHaveValue("Lamentis");
});

test("search focus uses the shared border without changing its surface", async ({ page }) => {
  const focusSchemes = [
    {
      colorScheme: "light",
      background: "rgb(247, 247, 247)",
      icon: "rgb(102, 102, 102)",
      placeholder: "rgb(102, 102, 102)",
    },
    {
      colorScheme: "dark",
      background: "rgb(33, 33, 33)",
      icon: "rgba(255, 255, 255, 0.6)",
      placeholder: "rgb(175, 175, 175)",
    },
  ] as const;

  for (const scheme of focusSchemes) {
    await page.emulateMedia({ colorScheme: scheme.colorScheme });
    await page.goto("/en/search");

    const search = page.getByRole("searchbox", { name: "Search sites" });
    const searchRegion = page.getByRole("search", { name: "Search sites" });
    await search.focus();
    await expect(searchRegion).toHaveCSS("background-color", scheme.background);
    await expect(searchRegion.locator("svg")).toHaveCSS("color", scheme.icon);
    const placeholderColor = await search.evaluate(
      (element) => getComputedStyle(element, "::placeholder").color,
    );
    expect(placeholderColor).toBe(scheme.placeholder);
    await expect(searchRegion).toHaveCSS("border-style", "none");
    await expect(searchRegion).toHaveCSS("outline-style", "none");
    await expect.poll(
      () => searchRegion.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      ),
    ).toMatch(/1px inset/);
  }
});

test("control focus uses the system outline only in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/en/search");

  const search = page.getByRole("searchbox", { name: "Search sites" });
  const searchRegion = page.getByRole("search", { name: "Search sites" });
  await search.focus();
  await expect(searchRegion).toHaveCSS("border-style", "none");
  await expect(searchRegion).toHaveCSS("outline-style", "solid");
  await expect(searchRegion).toHaveCSS("outline-width", "2px");
  await expect(searchRegion).toHaveCSS("outline-offset", "4px");
  await expect(searchRegion).toHaveCSS("box-shadow", "none");

  await page.goto("/en");
  const navigationTrigger = page.getByRole("button", {
    name: "Open primary navigation",
  });
  await navigationTrigger.focus();
  await expect(navigationTrigger).toHaveCSS("outline-style", "solid");
  await expect(navigationTrigger).toHaveCSS("outline-width", "2px");
  await expect(navigationTrigger).toHaveCSS("outline-offset", "4px");
  await expect(navigationTrigger).toHaveCSS("box-shadow", "none");
});

test("shared controls use their intended interaction states", async ({
  page,
}) => {
  await page.goto("/en/api-creator-studio");

  const method = page.getByRole("button", { name: "HTTP method GET" });
  await expect(method).toHaveCSS("border-style", "none");
  await method.hover();
  await expect.poll(
    () => method.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  const routeSurface = page.getByRole("group", {
    name: "API endpoint path",
  });
  await routeInput.focus();
  await expect(routeSurface).toHaveCSS("border-style", "none");
  await expect(routeSurface).toHaveCSS("outline-style", "none");
  await expect(routeSurface).toHaveCSS(
    "background-color",
    "rgb(247, 247, 247)",
  );
  await expect.poll(
    () => routeSurface.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);

  await method.focus();
  await expect(method).toHaveCSS("outline-style", "none");
  await expect(method).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(routeSurface).toHaveCSS("box-shadow", "none");
  await expect.poll(
    () => method.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);
  await page.keyboard.press("Enter");
  await expect(method).toHaveAttribute("aria-expanded", "true");
  await expect(method).toHaveCSS("border-style", "none");
  await expect(method).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect.poll(
    () => method.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);
  await page.keyboard.press("Escape");

  const navigationTrigger = page.getByRole("button", {
    name: "Open primary navigation",
  });
  await navigationTrigger.hover();
  await expect(navigationTrigger).toHaveCSS(
    "background-color",
    "rgb(250, 250, 250)",
  );
  await expect.poll(
    () => navigationTrigger.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);
  await navigationTrigger.focus();
  await expect(navigationTrigger).toHaveCSS("outline-style", "none");
  await expect(navigationTrigger).toHaveCSS(
    "background-color",
    "rgb(250, 250, 250)",
  );
  await expect.poll(
    () => navigationTrigger.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);

  const download = page.getByRole("button", { name: "Download" });
  await download.focus();
  await expect(download).toHaveCSS("outline-style", "none");
  await expect(download).toHaveCSS("background-color", "rgb(102, 102, 102)");
  await expect(download).toHaveCSS("color", "rgb(255, 255, 255)");

  await routeInput.fill("bordered");
  const addRoute = page.getByRole("button", { name: "Add API route" });
  const addRouteBackground = await addRoute.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await addRoute.focus();
  await expect(addRoute).toHaveCSS("background-color", addRouteBackground);
  await expect.poll(
    () => addRoute.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);
  await routeInput.press("Enter");
  const responseDialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expect(responseDialog).toBeVisible();
  await responseDialog.getByRole("button", {
    name: "Response type: Expand",
  }).click();
  await responseDialog.getByRole("button", { name: "Add property" }).click();
  const optionalProperty = responseDialog.getByRole("button", {
    name: "Optional 1",
  });
  await expect(optionalProperty).toHaveAttribute("data-variant", "transparent");
  await optionalProperty.hover();
  await expect(optionalProperty).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(optionalProperty).toHaveCSS("box-shadow", "none");
  await optionalProperty.focus();
  await expect(optionalProperty).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(optionalProperty).toHaveCSS("box-shadow", "none");
  await optionalProperty.click();
  await expect(optionalProperty).toHaveAttribute("aria-pressed", "true");
  await expect(optionalProperty).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(optionalProperty).toHaveCSS("box-shadow", "none");
  await page.keyboard.press("Escape");
  await expect(responseDialog).not.toBeVisible();

  const routeActions = page.getByRole("button", {
    name: "Route actions /bordered",
  });
  await routeActions.click();
  await expect(routeActions).toHaveAttribute("aria-expanded", "true");
  await expect(routeActions).toHaveCSS("border-style", "none");
  await expect(routeActions).toHaveCSS("outline-style", "none");
  await expect(routeActions).toHaveCSS(
    "background-color",
    "rgb(250, 250, 250)",
  );
  await expect.poll(
    () => routeActions.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).toMatch(/1px inset/);
});

test("sticky navigation stays above page select popovers", async ({ page }) => {
  await page.goto("/en/api-creator-studio");

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const method = page.getByRole("button", { name: "HTTP method GET" });
  const methodRoot = method.locator("..");

  await expect(methodRoot).toHaveCSS("z-index", "auto");
  await method.click();
  await expect(methodRoot).toHaveCSS("z-index", "10");
  await expect(navigation).toHaveCSS("z-index", "20");

  const [navigationBox, methodBox] = await Promise.all([
    navigation.boundingBox(),
    method.boundingBox(),
  ]);
  expect(navigationBox).not.toBeNull();
  expect(methodBox).not.toBeNull();
  if (!navigationBox || !methodBox) {
    throw new Error("Navigation and select must have measurable geometry.");
  }

  await page.evaluate(
    (scrollDistance) => window.scrollBy(0, scrollDistance),
    methodBox.y - navigationBox.y,
  );

  const overlappingMethodBox = await method.boundingBox();
  expect(overlappingMethodBox).not.toBeNull();
  if (!overlappingMethodBox) {
    throw new Error("The select must remain measurable after scrolling.");
  }

  const navigationOwnsOverlap = await page.evaluate(({ x, y }) => (
    document.elementFromPoint(x, y)?.closest("nav") !== null
  ), {
    x: overlappingMethodBox.x + overlappingMethodBox.width / 2,
    y: navigationBox.y + navigationBox.height / 2,
  });
  expect(navigationOwnsOverlap).toBe(true);
});
