import {
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { routePath } from "../domain/site/routes";

const studioPath = routePath({
  scope: "localized",
  locale: "en",
  routeId: "apiCreatorStudio",
});

async function openResponseOverlay(page: Page) {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("resize/{id}");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Define this API route",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-resizable", "true");
  const panel = dialog.locator("section").first();
  await expect(panel).toHaveAttribute("data-positioned", "true");
  await panel.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  return { dialog, panel };
}

async function dragHandle({
  deltaX,
  deltaY,
  direction,
  page,
  panel,
}: {
  deltaX: number;
  deltaY: number;
  direction: string;
  page: Page;
  panel: Locator;
}) {
  const handle = panel.locator(
    `[data-overlay-resize-handle="${direction}"]`,
  );
  const handleBox = await handle.boundingBox();
  const before = await panel.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(before).not.toBeNull();
  if (!handleBox || !before) {
    throw new Error("Overlay and resize handle must be measurable.");
  }

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY);
  await page.mouse.up();

  const after = await panel.boundingBox();
  expect(after).not.toBeNull();
  if (!after) throw new Error("Resized overlay must be measurable.");
  return { after, before };
}

function expectNear(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
}

test("all overlay edges and corners preserve their opposite axes", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1_440 });
  const { dialog, panel } = await openResponseOverlay(page);
  const cases = [
    { deltaX: 0, deltaY: 20, direction: "n" },
    { deltaX: -20, deltaY: 20, direction: "ne" },
    { deltaX: -20, deltaY: 0, direction: "e" },
    { deltaX: -20, deltaY: -20, direction: "se" },
    { deltaX: 0, deltaY: -20, direction: "s" },
    { deltaX: 20, deltaY: -20, direction: "sw" },
    { deltaX: 20, deltaY: 0, direction: "w" },
    { deltaX: 20, deltaY: 20, direction: "nw" },
  ] as const;

  for (const resizeCase of cases) {
    const { after, before } = await dragHandle({
      ...resizeCase,
      page,
      panel,
    });
    const changesWest = resizeCase.direction.includes("w");
    const changesEast = resizeCase.direction.includes("e");
    const changesNorth = resizeCase.direction.includes("n");
    const changesSouth = resizeCase.direction.includes("s");

    if (changesWest) {
      expectNear(after.x + after.width, before.x + before.width);
      expectNear(after.width, before.width - resizeCase.deltaX);
    } else if (changesEast) {
      expectNear(after.x, before.x);
      expectNear(after.width, before.width + resizeCase.deltaX);
    } else {
      expectNear(after.x, before.x);
      expectNear(after.width, before.width);
    }

    if (changesNorth) {
      expectNear(after.y + after.height, before.y + before.height);
      expectNear(after.height, before.height - resizeCase.deltaY);
    } else if (changesSouth) {
      expectNear(after.y, before.y);
      expectNear(after.height, before.height + resizeCase.deltaY);
    } else {
      expectNear(after.y, before.y);
      expectNear(after.height, before.height);
    }
  }

  const responseJson = dialog.getByRole("textbox", {
    name: "Response type (JSON Schema)",
  });
  await responseJson.fill(
    '{"type":"object","properties":{"resizable":{"type":"boolean"}},"required":["resizable"]}',
  );
  await expect(responseJson).toHaveValue(/"resizable"/);
  await dialog.getByRole("button", {
    name: "Close the response editor",
  }).click();
  await expect(dialog).not.toBeVisible();
});

test("maximum resize keeps equal viewport gaps and restores the preferred size", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1_000, width: 1_440 });
  const { panel } = await openResponseOverlay(page);

  let result = await dragHandle({
    deltaX: 2_000,
    deltaY: 0,
    direction: "w",
    page,
    panel,
  });
  expectNear(result.after.width, 360);

  result = await dragHandle({
    deltaX: -2_000,
    deltaY: 0,
    direction: "w",
    page,
    panel,
  });
  expectNear(result.after.x, 24);
  expectNear(1_440 - result.after.x - result.after.width, 24);
  const preferredWidth = result.after.width;

  result = await dragHandle({
    deltaX: 0,
    deltaY: -2_000,
    direction: "n",
    page,
    panel,
  });
  expectNear(result.after.y, 24);
  expectNear(1_000 - result.after.y - result.after.height, 24);
  const preferredHeight = result.after.height;

  await page.setViewportSize({ height: 500, width: 700 });
  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box
      ? {
          bottomGap: 500 - box.y - box.height,
          fitsHorizontally: box.x + box.width <= 700,
          fitsVertically: box.y + box.height <= 500,
          leftGap: box.x,
          rightGap: 700 - box.x - box.width,
          topGap: box.y,
        }
      : null;
  }).toEqual({
    bottomGap: 20,
    fitsHorizontally: true,
    fitsVertically: true,
    leftGap: 20,
    rightGap: 20,
    topGap: 20,
  });

  await page.setViewportSize({ height: 1_000, width: 1_440 });
  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box
      ? {
          bottomGap: 1_000 - box.y - box.height,
          height: box.height,
          leftGap: box.x,
          rightGap: 1_440 - box.x - box.width,
          topGap: box.y,
          width: box.width,
        }
      : null;
  }).toEqual({
    bottomGap: 24,
    height: preferredHeight,
    leftGap: 24,
    rightGap: 24,
    topGap: 24,
    width: preferredWidth,
  });
});

test("touch/mobile keeps the existing non-resizable overlay behavior", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: String(testInfo.project.use.baseURL),
    hasTouch: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();

  try {
    await page.goto(studioPath);
    await page.getByRole("textbox", {
      name: "API endpoint path",
    }).fill("mobile");
    await page.getByRole("textbox", {
      name: "API endpoint path",
    }).press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Define this API route",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toHaveAttribute("data-resizable", "true");
    await expect(dialog.locator(
      '[data-overlay-resize-handle="se"]',
    )).toHaveCSS("display", "none");
  } finally {
    await context.close();
  }
});
