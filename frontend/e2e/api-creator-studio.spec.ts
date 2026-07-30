import {
  expect,
  test,
  type Download,
  type Page,
} from "@playwright/test";
import { Buffer } from "node:buffer";
import type { ApiRouteContract } from "../domain/site/api-route";
import { apiRoutesStorage } from "../domain/site/api-route-storage";
import { routePath } from "../domain/site/routes";

const studioPath = routePath({
  scope: "localized",
  locale: "en",
  routeId: "apiCreatorStudio",
});
const storageError =
  "Routes are available in this tab but could not be read from or saved to local storage. Download them before reloading.";

async function seedRoutes(
  page: Page,
  routes: readonly ApiRouteContract[],
): Promise<void> {
  await page.addInitScript(
    ({ key, serializedRoutes }) => {
      window.localStorage.setItem(key, serializedRoutes);
    },
    {
      key: apiRoutesStorage.key,
      serializedRoutes: JSON.stringify(routes),
    },
  );
}

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

test("adds and persists a route while restoring focus after Escape", {
  tag: "@cross-browser-smoke",
}, async ({ page }) => {
  await page.goto(studioPath);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("orders/{orderid}");
  await routeInput.press("Enter");

  const responseDialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expect(responseDialog).toBeVisible();
  await expect(responseDialog.getByRole("textbox", {
    name: "Response type",
  })).toBeFocused();
  await expect(responseDialog.getByText(
    "Create a response type or use an existing one as an editable template.",
  )).toBeVisible();
  await expect(responseDialog.getByText(
    "Define the fields returned in this response.",
  )).toBeVisible();

  const closeOverlay = responseDialog.getByRole("button", {
    name: "Close the response editor",
  });
  const closeBox = await closeOverlay.boundingBox();
  expect(closeBox).not.toBeNull();
  if (!closeBox) {
    throw new Error("The response overlay close control must be measurable.");
  }
  await expect(responseDialog.getByRole("button", {
    name: "Route actions /orders/{orderid}",
  })).toHaveCount(0);

  await responseDialog.getByRole("button", {
    name: "Add property",
  }).click();
  await expect(responseDialog.getByText(
    "Property name",
    { exact: true },
  )).toHaveCount(0);
  await expect(responseDialog.getByText(
    "Property type",
    { exact: true },
  )).toHaveCount(0);
  const propertyType = responseDialog.getByRole("button", {
    name: "Property type",
  });
  await propertyType.click();
  const propertyTypeMenu = responseDialog.getByRole("list", {
    name: "Property type",
  });
  await expect(propertyTypeMenu).toBeVisible();
  expect(await propertyTypeMenu.evaluate(
    (element) => element.matches(":popover-open"),
  )).toBe(true);

  const firstPropertyType = propertyTypeMenu.getByRole("button", {
    name: "string",
  });
  const [propertyMenuBox, firstPropertyTypeBox] = await Promise.all([
    propertyTypeMenu.boundingBox(),
    firstPropertyType.boundingBox(),
  ]);
  expect(propertyMenuBox).not.toBeNull();
  expect(firstPropertyTypeBox).not.toBeNull();
  if (!propertyMenuBox || !firstPropertyTypeBox) {
    throw new Error("Property type options must have measurable geometry.");
  }
  expect(propertyMenuBox.y).toBeGreaterThanOrEqual(0);
  expect(propertyMenuBox.y + propertyMenuBox.height).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? Number.POSITIVE_INFINITY,
  );
  const firstOptionOwnsItsCenter = await page.evaluate(({ x, y, menuId }) => (
    document.elementFromPoint(x, y)?.closest(`#${CSS.escape(menuId)}`) !== null
  ), {
    menuId: await propertyTypeMenu.getAttribute("id") ?? "",
    x: firstPropertyTypeBox.x + firstPropertyTypeBox.width / 2,
    y: firstPropertyTypeBox.y + firstPropertyTypeBox.height / 2,
  });
  expect(firstOptionOwnsItsCenter).toBe(true);
  await propertyTypeMenu.getByRole("button", { name: "array" }).click();
  await expect(propertyTypeMenu).toBeHidden();
  await expect(propertyType).toContainText("array");
  await expect(responseDialog.getByText("of", { exact: true })).toBeVisible();
  await expect(responseDialog.getByRole("button", {
    name: "Array item type",
  })).toContainText("string");

  const overlayRoute = responseDialog.getByRole("group", {
    name: "API endpoint path",
  });
  const overlayMethod = overlayRoute.getByRole("button", {
    name: "HTTP method",
  });
  await expect(overlayRoute.getByRole("textbox", {
    name: "API endpoint path",
  })).toHaveValue("orders / {orderid}");
  await overlayMethod.click();
  await responseDialog.getByRole("list", {
    name: "HTTP method",
  }).getByRole("button", { name: "PATCH" }).click();
  await expect(overlayMethod).toContainText("PATCH");
  await expect(responseDialog.getByRole("button", {
    name: "Route actions /orders/{orderid}",
  })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(responseDialog).not.toBeVisible();
  await expect(routeInput).toBeFocused();

  const routeList = page.getByRole("list", { name: "API routes" });
  const route = routeList.getByRole("listitem");
  await expect(route).toContainText("PATCH");
  await expect(route).toContainText("/orders/{orderid}");

  await expect.poll(
    () => page.evaluate(
      (key) => {
        const routes = JSON.parse(
          window.localStorage.getItem(key) ?? "null",
        ) as Array<{ method: string; path: string }> | null;
        return routes?.map(({ method, path }) => ({ method, path })) ?? null;
      },
      apiRoutesStorage.key,
    ),
  ).toEqual([
    {
      method: "PATCH",
      path: "/orders/{orderid}",
    },
  ]);

  await page.reload();
  const persistedRoute = page
    .getByRole("list", { name: "API routes" })
    .getByRole("listitem");
  await expect(persistedRoute).toContainText("PATCH");
  await expect(persistedRoute).toContainText("/orders/{orderid}");
});

test("synchronizes the canonical route snapshot across tabs", {
  tag: "@cross-browser-smoke",
}, async ({ context, page }) => {
  const peerPage = await context.newPage();
  await Promise.all([
    page.goto(studioPath),
    peerPage.goto(studioPath),
  ]);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("shared/{id}");
  await routeInput.press("Enter");
  await page.keyboard.press("Escape");

  const peerRoute = peerPage
    .getByRole("list", { name: "API routes" })
    .getByRole("listitem");
  await expect(peerRoute).toContainText("GET");
  await expect(peerRoute).toContainText("/shared/{id}");

  await peerRoute.getByRole("button", {
    name: "HTTP method /shared/{id}",
  }).click();
  await peerPage.getByRole("button", { name: "POST" }).click();

  const sourceRoute = page
    .getByRole("list", { name: "API routes" })
    .getByRole("listitem");
  await expect(sourceRoute).toContainText("POST");

  await sourceRoute.getByRole("button", {
    name: "Route actions /shared/{id}",
  }).click();
  await page.getByRole("button", {
    name: "Delete /shared/{id}",
  }).click();

  await expect(
    peerPage.getByRole("list", { name: "API routes" }),
  ).toHaveCount(0);

  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full.", "QuotaExceededError");
    };
  });
  await routeInput.fill("volatile/{id}");
  await routeInput.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("status")).toHaveText(storageError);

  const peerInput = peerPage.getByRole("textbox", {
    name: "API endpoint path",
  });
  await peerInput.fill("peer/{id}");
  await peerInput.press("Enter");
  await peerPage.keyboard.press("Escape");

  const volatileRoute = page
    .getByRole("list", { name: "API routes" })
    .getByRole("listitem");
  await expect(volatileRoute).toContainText("/volatile/{id}");
  await expect(volatileRoute).not.toContainText("/peer/{id}");
});

test("prevents incompatible response-type reuse before persistence", async ({
  page,
}) => {
  await seedRoutes(page, [
    {
      id: 7,
      method: "GET",
      path: "/users",
      response: {
        fields: [
          { name: "id", optional: false, type: "string" },
        ],
        typeName: "UserResponse",
      },
    },
  ]);
  await page.goto(studioPath);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("accounts");
  await routeInput.press("Enter");

  const responseDialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  const save = responseDialog.getByRole("button", { name: "Save" });
  const responseType = responseDialog.getByRole("textbox", {
    name: "Response type",
  });
  const responseTypeTemplate = responseDialog.getByRole("button", {
    name: "Response type template",
  });
  await expect(responseTypeTemplate).toContainText(
    "New",
  );
  await responseTypeTemplate.click();
  await responseDialog.getByRole("list", {
    name: "Response type template",
  }).getByRole("button", { name: "UserResponse" }).click();
  await expect(responseType).toHaveValue("UserResponse");
  await expect(responseDialog.getByRole("textbox", {
    name: "Property name",
  })).toHaveValue("id");
  await expect(save).toBeEnabled();

  const propertyType = responseDialog.getByRole("button", {
    name: "Property type",
  });
  await propertyType.click();
  const propertyTypeMenu = responseDialog.getByRole("list", {
    name: "Property type",
  });
  await expect(propertyType).toHaveAttribute("aria-expanded", "true");
  await expect(
    propertyTypeMenu.getByRole("button", { name: "string" }).locator("svg"),
  ).toBeVisible();
  await propertyTypeMenu.getByRole("button", { name: "number" }).click();
  await expect(propertyType).toContainText("number");
  await expect(save).toBeDisabled();
  await expect(responseDialog.getByRole("alert")).toHaveText(
    "This response type already uses a different schema.",
  );
  await expect.poll(
    () => page.evaluate(
      (key) => {
        const routes = JSON.parse(
          window.localStorage.getItem(key) ?? "[]",
        ) as ApiRouteContract[];
        return routes.find((route) => route.path === "/accounts")?.response;
      },
      apiRoutesStorage.key,
    ),
  ).toBeUndefined();

  await responseType.fill("AccountResponse");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(responseDialog).not.toBeVisible();
  await expect.poll(
    () => page.evaluate(
      (key) => {
        const routes = JSON.parse(
          window.localStorage.getItem(key) ?? "[]",
        ) as ApiRouteContract[];
        return routes.map((route) => route.response?.typeName);
      },
      apiRoutesStorage.key,
    ),
  ).toEqual(["UserResponse", "AccountResponse"]);
});

test("derives object names from properties and can prefill an existing model", async ({
  page,
}) => {
  await seedRoutes(page, [
    {
      id: 7,
      method: "GET",
      path: "/addresses/{id}",
      response: {
        fields: [
          { name: "city", optional: false, type: "string" },
        ],
        typeName: "AddressResponse",
      },
    },
  ]);
  await page.goto(studioPath);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("users/{id}");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  const save = dialog.getByRole("button", { name: "Save" });
  await dialog.getByRole("textbox", {
    name: "Response type",
  }).fill("UserResponse");
  const addPropertyButton = dialog.getByRole("button", {
    name: "Add property",
  });
  await expect(addPropertyButton).toHaveText("");
  await expect(addPropertyButton.locator("svg")).toHaveCount(1);
  await addPropertyButton.click();
  await dialog.getByRole("textbox", {
    name: "Property name",
  }).fill("profile");
  await dialog.getByRole("button", {
    name: "Property type",
  }).click();
  await dialog.getByRole("list", {
    name: "Property type",
  }).getByRole("button", { name: "object" }).click();

  const objectTemplate = dialog.getByRole("button", {
    name: "Object type template",
  });
  const objectToggle = dialog.getByRole("button", {
    name: "Object definition: profile",
  });
  const objectPanelId = await objectToggle.getAttribute("aria-controls");
  const objectPanel = dialog.locator(`[id="${objectPanelId}"]`);
  await expect(objectToggle).toHaveAttribute("aria-expanded", "true");
  await expect(dialog.getByRole("textbox", {
    name: "Object type",
  })).toHaveCount(0);
  await expect.poll(() => objectPanel.evaluate(
    (element) => getComputedStyle(element, "::before").content,
  )).toBe("none");
  await expect(objectTemplate).toContainText("New");
  await expect(save).toBeEnabled();

  await objectTemplate.click();
  await dialog.getByRole("list", {
    name: "Object type template",
  }).getByRole("button", { name: "AddressResponse" }).click();
  await expect(objectPanel.getByRole("textbox", {
    name: "Property name",
  })).toHaveValue("city");
  const nestedProperties = objectPanel.locator("[data-nested-properties]");
  await expect(nestedProperties).toHaveCount(1);
  await expect(nestedProperties).toHaveCSS("border-inline-start-width", "2px");
  await expect(nestedProperties).toHaveCSS("padding-inline-start", "16px");
  await expect(save).toBeEnabled();

  await objectPanel.getByRole("textbox", {
    name: "Property name",
  }).fill("displayName");
  await expect(save).toBeEnabled();
  await expect(objectTemplate).toContainText("New");
  await objectToggle.click();
  await expect(objectToggle).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByRole("textbox", {
    name: "Response type",
  })).toHaveValue("UserResponse");
  await save.click();
  await expect(dialog).not.toBeVisible();

  await expect.poll(
    () => page.evaluate(
      (key) => {
        const routes = JSON.parse(
          window.localStorage.getItem(key) ?? "[]",
        ) as ApiRouteContract[];
        return routes.find(
          (route) => route.path === "/users/{id}",
        )?.response;
      },
      apiRoutesStorage.key,
    ),
  ).toEqual({
    fields: [
      {
        name: "profile",
        objectSchema: {
          fields: [
            {
              name: "displayName",
              optional: false,
              type: "string",
            },
          ],
          typeName: "UserResponseProfile",
        },
        optional: false,
        type: "object",
      },
    ],
    typeName: "UserResponse",
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const skill = await readDownload(await downloadPromise);
  expect(skill).toContain("profile: UserResponseProfile;");
  expect(skill).toContain("export interface UserResponseProfile {");
  expect(skill).toContain("displayName: string;");
  expect(skill).not.toContain("{ [key: string]: unknown }");
});

test("downloads the persisted contracts with the stable file contract", {
  tag: "@cross-browser-smoke",
}, async ({ page }) => {
  await seedRoutes(page, [
    {
      id: 7,
      method: "GET",
      path: "/orders/{orderid}",
    },
  ]);
  await page.goto(studioPath);
  await expect(
    page.getByRole("list", { name: "API routes" }).getByRole("listitem"),
  ).toContainText("/orders/{orderid}");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const contents = await readDownload(download);

  expect(download.suggestedFilename()).toBe(
    "api-contracts-agent-skill.md",
  );
  expect(contents).toContain("name: implement-api-contracts");
  expect(contents).toContain("### `GET /orders/{orderid}`");
  expect(contents).not.toContain("No API contracts are defined.");
});

test("blocks contract download when stored routes are invalid", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(key, "{invalid");
    },
    { key: apiRoutesStorage.key },
  );
  await page.goto(studioPath);

  await expect(page.getByRole("status")).toHaveText(storageError);
  await expect(
    page.getByRole("button", { name: "Download" }),
  ).toBeDisabled();
});

test("blocks contract download when local storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage unavailable.", "SecurityError");
    };
  });
  await page.goto(studioPath);

  await expect(page.getByRole("status")).toHaveText(storageError);
  await expect(
    page.getByRole("button", { name: "Download" }),
  ).toBeDisabled();
});

test("keeps volatile routes downloadable after a write failure", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full.", "QuotaExceededError");
    };
  });
  await page.goto(studioPath);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("volatile/{id}");
  await routeInput.press("Enter");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("status")).toHaveText(storageError);
  const downloadButton = page.getByRole("button", { name: "Download" });
  await expect(downloadButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const contents = await readDownload(await downloadPromise);
  expect(contents).toContain("### `GET /volatile/{id}`");
});

test("unmounts the studio overlay when navigation leaves the route", async ({
  page,
}) => {
  await page.goto("/en");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "API Creator Studio" })
    .click();
  await page.getByRole("textbox", {
    name: "API endpoint path",
  }).fill("users");
  await page.getByRole("textbox", {
    name: "API endpoint path",
  }).press("Enter");
  await expect(page.getByRole("dialog", {
    name: "Add a data structure to this route",
  })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("dialog", {
    name: "Add a data structure to this route",
  })).toHaveCount(0);
  await expect(page.getByRole("main", { name: "Home" })).toBeVisible();
});
