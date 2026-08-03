import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";
import { Buffer } from "node:buffer";
import type { ApiRouteContract } from "../domain/site/api-route";
import { apiContractMetadataStorage } from "../domain/site/api-contract-metadata-storage";
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

async function expandAdvancedSettings(dialog: Locator) {
  const toggle = dialog.getByRole("button", {
    name: "Advanced settings: Expand",
  });
  if (await toggle.count()) await toggle.click();
}

const methodSuggestionScenarios = [
  {
    method: "GET",
    operationId: "getProductByUuid",
    requestType: "",
    responseStatus: "200",
    responseType: "ProductResponse",
    title: "Get product",
  },
  {
    method: "POST",
    operationId: "createProductByUuid",
    requestType: "CreateProductRequest",
    responseStatus: "201",
    responseType: "ProductResponse",
    title: "Create product",
  },
  {
    method: "PUT",
    operationId: "replaceProductByUuid",
    requestType: "ReplaceProductRequest",
    responseStatus: "200",
    responseType: "ProductResponse",
    title: "Replace product",
  },
  {
    method: "PATCH",
    operationId: "updateProductByUuid",
    requestType: "UpdateProductRequest",
    responseStatus: "200",
    responseType: "ProductResponse",
    title: "Update product",
  },
  {
    method: "DELETE",
    operationId: "deleteProductByUuid",
    requestType: "",
    responseStatus: "204",
    responseType: "",
    title: "Delete product",
  },
  {
    method: "HEAD",
    operationId: "inspectProductByUuid",
    requestType: "",
    responseStatus: "200",
    responseType: "",
    title: "Inspect product",
  },
  {
    method: "OPTIONS",
    operationId: "describeProductByUuid",
    requestType: "",
    responseStatus: "200",
    responseType: "",
    title: "Describe product",
  },
] as const;

for (const scenario of methodSuggestionScenarios) {
  test(`${scenario.method} materializes a complete editable route contract`, async ({
    page,
  }) => {
    await page.goto(studioPath);
    if (scenario.method !== "GET") {
      await page.getByRole("button", { name: "HTTP method GET" }).click();
      await page.getByRole("list", { name: "HTTP method" })
        .getByRole("button", { name: scenario.method }).click();
    }
    const routeInput = page.getByRole("textbox", {
      name: "API endpoint path",
    });
    await routeInput.fill("products/{uuid}");
    await routeInput.press("Enter");

    const dialog = page.getByRole("dialog", {
      name: "Add a data structure to this route",
    });
    const requestTab = dialog.getByRole("tab", { name: "Request body" });
    const responseTab = dialog.getByRole("tab", { name: "Response" });
    const requestFirst = ["POST", "PUT", "PATCH"].includes(scenario.method);
    await expect(requestTab).toHaveAttribute(
      "aria-selected",
      requestFirst ? "true" : "false",
    );
    await expect(responseTab).toHaveAttribute(
      "aria-selected",
      requestFirst ? "false" : "true",
    );
    await requestTab.click();
    await expect(dialog.getByRole("textbox", { name: "Request type" }))
      .toHaveValue(scenario.requestType);
    await responseTab.click();
    await expandAdvancedSettings(dialog);
    const details = dialog.getByRole("region", { name: "Route details" });
    await expect(details.getByRole("textbox", { name: "Title" }))
      .toHaveValue(scenario.title);
    await expect(details.getByRole("textbox", { name: "Operation ID" }))
      .toHaveValue(scenario.operationId);
    await expect(details.getByRole("textbox", { name: "Parameter name 1" }))
      .toHaveValue("uuid");
    await expect(details.getByRole("textbox", { name: "Format 1" }))
      .toHaveValue("uuid");
    await expect(details.getByRole("button", { name: "Remove parameter 1" }))
      .toHaveCount(0);

    const response = dialog.getByRole("region", { name: "Response" });
    const responseOptions = dialog.getByRole("region", { name: "Response options" });
    await expect(response.getByRole("textbox", { name: "HTTP status 1" }))
      .toHaveValue(scenario.responseStatus);
    await expect(response.getByRole("textbox", { name: "Response type" }))
      .toHaveValue(scenario.responseType);
    await expect(response.getByRole("button", { name: "Paginated response" }))
      .toHaveCount(scenario.responseType ? 1 : 0);
    await expect(responseOptions.getByRole("button", { name: "Remove response 1" }))
      .toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Save" })).toBeEnabled();
  });
}

test("keeps response and header removal on the trailing edge in a narrow overlay", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("layoutaudit");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expandAdvancedSettings(dialog);
  const response = dialog.getByRole("region", { name: "Response options" });
  await response.getByRole("button", {
    name: "Add response",
    exact: true,
  }).click();
  await response.getByRole("button", { name: "Add response header 1" }).click();

  const trailingActions = [
    response.getByRole("button", { name: "Remove response 2" }),
    response.getByRole("button", { name: "Remove response header 1.1" }),
  ];
  const actionBoxes = await Promise.all(trailingActions.map((action) => (
    action.boundingBox()
  )));
  expect(actionBoxes.every(Boolean)).toBe(true);
  const rightEdges = actionBoxes.map((box) => box!.x + box!.width);
  expect(Math.max(...rightEdges) - Math.min(...rightEdges)).toBeLessThan(2);
  await expect.poll(() => dialog.evaluate((element) => (
    element.scrollWidth <= element.clientWidth
  ))).toBe(true);
});

test("keeps every route-detail selector inside a valid editable state", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto(studioPath);
  await page.getByRole("button", { name: "HTTP method GET" }).click();
  await page.getByRole("list", { name: "HTTP method" })
    .getByRole("button", { name: "HEAD" }).click();
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("controlmatrix");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expandAdvancedSettings(dialog);
  const details = dialog.getByRole("region", { name: "Route details" });
  await details.getByRole("button", { name: "Add parameter" }).click();
  await details.getByRole("textbox", { name: "Parameter name 1" })
    .fill("filter");

  await details.getByRole("button", { name: "Parameter location 1 query" }).click();
  let menu = details.getByRole("list", { name: "Parameter location 1" });
  await expect(menu.getByRole("button", { name: "path" })).toBeDisabled();
  await expect(menu.getByRole("button")).toHaveCount(4);
  await menu.getByRole("button", { name: "header" }).click();
  await details.getByRole("button", { name: "Parameter location 1 header" }).click();
  await details.getByRole("list", { name: "Parameter location 1" })
    .getByRole("button", { name: "cookie" }).click();
  await details.getByRole("button", { name: "Parameter location 1 cookie" }).click();
  await details.getByRole("list", { name: "Parameter location 1" })
    .getByRole("button", { name: "query" }).click();

  const parameterTypes = ["string", "number", "integer", "boolean", "array"];
  for (const type of parameterTypes) {
    await details.getByRole("button", { name: /^Parameter type 1 / }).click();
    menu = details.getByRole("list", { name: "Parameter type 1" });
    await expect(menu.getByRole("button")).toHaveCount(parameterTypes.length);
    await menu.getByRole("button", { name: type }).click();
    await expect(details.getByRole("button", {
      name: `Parameter type 1 ${type}`,
    })).toBeVisible();
  }

  async function chooseSecurity(label: string) {
    await details.getByRole("button", { name: /^Security scheme / }).click();
    await details.getByRole("list", { name: "Security scheme" })
      .getByRole("button", { name: label }).click();
  }

  await chooseSecurity("API key");
  await expect(details.getByRole("textbox", { name: "Credential name" }))
    .toHaveAttribute("required", "");
  await details.getByRole("button", { name: /^Credential location / }).click();
  const apiKeyLocationMenu = details.getByRole("list", {
    name: "Credential location",
  });
  await expect(apiKeyLocationMenu.getByRole("button")).toHaveCount(3);
  await apiKeyLocationMenu.getByRole("button", { name: "header" }).click();

  await chooseSecurity("Cookie session");
  await expect(details.getByRole("textbox", { name: "Credential name" }))
    .toHaveAttribute("required", "");
  await details.getByRole("button", { name: "Credential location cookie" }).click();
  await expect(details.getByRole("list", { name: "Credential location" })
    .getByRole("button")).toHaveCount(1);
  await details.getByRole("list", { name: "Credential location" })
    .getByRole("button", { name: "cookie" }).click();

  await chooseSecurity("OAuth 2");
  await expect(details.getByRole("textbox", { name: "OAuth scopes" }))
    .toBeVisible();
  await expect(details.getByRole("textbox", { name: "Credential name" }))
    .toHaveCount(0);
  await chooseSecurity("Bearer token");
  await expect(details.getByRole("textbox", { name: "OAuth scopes" }))
    .toHaveCount(0);
  await chooseSecurity("HTTP Basic");
  await chooseSecurity("None");

  await details.getByRole("button", { name: "Cache policy Unspecified" }).click();
  await expect(details.getByRole("list", { name: "Cache policy" })
    .getByRole("button")).toHaveCount(4);
  await details.getByRole("list", { name: "Cache policy" })
    .getByRole("button", { name: "Public" }).click();
  await details.getByRole("button", { name: "Idempotency Unspecified" }).click();
  await expect(details.getByRole("list", { name: "Idempotency" })
    .getByRole("button")).toHaveCount(4);
  await details.getByRole("list", { name: "Idempotency" })
    .getByRole("button", { name: "Requires idempotency key" }).click();
  await expect(dialog.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("keeps multi-response validation and header actions recoverable", async ({
  page,
}) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("multistatus");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expandAdvancedSettings(dialog);
  const response = dialog.getByRole("region", { name: "Response options" });
  await response.getByRole("button", {
    name: "Add response",
    exact: true,
  }).click();
  await expect(response.getByRole("textbox", { name: "HTTP status 2" }))
    .toHaveValue("400");

  await response.getByRole("textbox", { name: "HTTP status 2" }).fill("200");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(response.getByRole("alert")).toHaveText(
    "Response status codes must be unique.",
  );
  await expect(dialog).toBeVisible();
  await response.getByRole("textbox", { name: "HTTP status 2" }).fill("400");
  await expect(response.getByRole("alert")).toHaveCount(0);

  await response.getByRole("button", { name: "Add response header 1" }).click();
  await response.getByRole("textbox", {
    name: "Response header name 1.1",
  }).fill("X-RateLimit-Remaining");
  await response.getByRole("button", { name: "Parameter type 1.1 string" }).click();
  await response.getByRole("list", { name: "Parameter type 1.1" })
    .getByRole("button", { name: "integer" }).click();
  await response.getByRole("textbox", {
    name: "Header description 1.1",
  }).fill("Requests remaining in the current window");
  await response.getByRole("button", {
    name: "Remove response header 1.1",
  }).click();
  await expect(response.getByRole("textbox", {
    name: "Response header name 1.1",
  })).toHaveCount(0);

  await response.getByRole("button", { name: "Remove response 2" }).click();
  await expect(response.getByRole("button", { name: "Remove response 1" }))
    .toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("adds and persists a route while restoring focus after Escape", {
  tag: "@cross-browser-smoke",
}, async ({ page }) => {
  await page.goto(studioPath);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("orders/{orderid}");
  await expect(page.getByRole("button", { name: "Add API route" }))
    .toBeEnabled();
  await routeInput.press("Enter");

  const responseDialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expect(responseDialog).toBeVisible();
  await expect(responseDialog.getByRole("button", {
    name: "Advanced settings: Expand",
  })).toHaveAttribute("aria-expanded", "false");
  await expect(responseDialog.getByRole("textbox", { name: "Response type" }))
    .toBeVisible();
  await expect(responseDialog.getByRole("textbox", { name: "Request type" }))
    .toHaveCount(0);
  await responseDialog.getByRole("tab", { name: "Request body" }).click();
  await expect(responseDialog.getByRole("textbox", { name: "Request type" }))
    .toBeVisible();
  await responseDialog.getByRole("tab", { name: "Response" }).click();
  await expandAdvancedSettings(responseDialog);
  await expect(responseDialog.getByText(
    "Define the primary response status, media types, example, and typed schema.",
  )).toBeVisible();
  await expect(responseDialog.getByRole("heading", {
    name: "Response properties",
  })).toHaveCount(0);
  await expect(responseDialog.getByText(
    "Define the fields returned in this response.",
  )).toHaveCount(0);

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

  const responseTypeRegion = responseDialog.getByRole("region", {
    name: "Response",
  });
  await responseTypeRegion.getByRole("button", {
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
    name: "Property type 1 string",
  });
  await propertyType.click();
  const propertyTypeMenu = responseDialog.getByRole("list", {
    name: "Property type 1",
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
  await expect(responseDialog.getByRole("button", {
    name: "Property type 1 array",
  })).toContainText("array");
  await expect(responseDialog.getByText("of", { exact: true })).toBeVisible();
  await expect(responseDialog.getByRole("button", {
    name: "Array item type 1 string",
  })).toContainText("string");

  const overlayRoute = responseDialog.getByRole("group", {
    name: "API endpoint path",
  });
  const overlayMethod = overlayRoute.getByRole("button", {
    name: "HTTP method GET",
  });
  await expect(overlayRoute.getByRole("textbox", {
    name: "API endpoint path",
  })).toHaveValue("orders / {orderid}");
  await overlayMethod.click();
  await responseDialog.getByRole("list", {
    name: "HTTP method",
  }).getByRole("button", { name: "PATCH" }).click();
  await expect(overlayRoute.getByRole("button", {
    name: "HTTP method PATCH",
  })).toContainText("PATCH");
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

test("keeps edit-route changes atomic until Save", async ({ page }) => {
  const originalRoute: ApiRouteContract = {
    id: 7,
    method: "GET",
    path: "/users/{id}",
    response: {
      fields: [
        { name: "id", optional: false, type: "string" },
      ],
      typeName: "UserResponse",
    },
  };
  await seedRoutes(page, [originalRoute]);
  await page.goto(studioPath);

  await page.getByRole("button", {
    name: "Route actions /users/{id}",
  }).click();
  await page.getByRole("list", {
    name: "Route actions /users/{id}",
  }).getByRole("button", { name: "Edit /users/{id}" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit this route" });
  await expandAdvancedSettings(dialog);
  const routeEditor = dialog.getByRole("group", {
    name: "API endpoint path",
  });
  await routeEditor.getByRole("textbox", {
    name: "API endpoint path",
  }).fill("accounts/{id}");
  await routeEditor.getByRole("button", {
    name: "HTTP method GET",
  }).click();
  await dialog.getByRole("list", {
    name: "HTTP method",
  }).getByRole("button", { name: "PATCH" }).click();
  await dialog.getByRole("textbox", {
    name: "Response type",
  }).fill("AccountResponse");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  const route = page
    .getByRole("list", { name: "API routes" })
    .getByRole("listitem");
  await expect(route).toContainText("GET");
  await expect(route).toContainText("/users/{id}");
  await expect(route).not.toContainText("/accounts/{id}");
  await expect.poll(
    () => page.evaluate(
      (key) => JSON.parse(
        window.localStorage.getItem(key) ?? "null",
      ) as ApiRouteContract[] | null,
      apiRoutesStorage.key,
    ),
  ).toEqual([originalRoute]);
});

test("preserves a materialized response when changing a route to DELETE", async ({
  page,
}) => {
  await seedRoutes(page, [{
    id: 8,
    method: "GET",
    path: "/accounts/{uuid}",
    response: {
      fields: [{ name: "id", optional: false, type: "string" }],
      typeName: "AccountView",
    },
  }]);
  await page.goto(studioPath);
  await page.getByRole("button", {
    name: "Route actions /accounts/{uuid}",
  }).click();
  await page.getByRole("list", {
    name: "Route actions /accounts/{uuid}",
  }).getByRole("button", { name: "Edit /accounts/{uuid}" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit this route" });
  await dialog.getByRole("button", { name: "HTTP method GET" }).click();
  await dialog.getByRole("list", { name: "HTTP method" })
    .getByRole("button", { name: "DELETE" }).click();
  await expandAdvancedSettings(dialog);
  const response = dialog.getByRole("region", { name: "Response" });
  await expect(response.getByRole("textbox", { name: "HTTP status 1" }))
    .toHaveValue("200");
  await expect(response.getByRole("textbox", { name: "Content types 1" }))
    .toHaveValue("application/json");
  await expect(response.getByRole("textbox", { name: "Response type" }))
    .toHaveValue("AccountView");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => JSON.parse(
    window.localStorage.getItem(key) ?? "[]",
  ), apiRoutesStorage.key)).toMatchObject([{
    method: "DELETE",
    responses: [{ status: "200" }],
  }]);
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
    name: "HTTP method /shared/{id} GET",
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
  await expandAdvancedSettings(responseDialog);
  const save = responseDialog.getByRole("button", { name: "Save" });
  const responseType = responseDialog.getByRole("textbox", {
    name: "Response type",
  });
  const responseTypeTemplate = responseDialog.getByRole("button", {
    name: "Response type template New",
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
    name: "Property name 1",
  })).toHaveValue("id");
  await expect(save).toBeEnabled();

  const propertyType = responseDialog.getByRole("button", {
    name: "Property type 1 string",
  });
  await propertyType.click();
  const propertyTypeMenu = responseDialog.getByRole("list", {
    name: "Property type 1",
  });
  await expect(propertyType).toHaveAttribute("aria-expanded", "true");
  await expect(
    propertyTypeMenu.getByRole("button", { name: "string" }).locator("svg"),
  ).toBeVisible();
  await propertyTypeMenu.getByRole("button", { name: "number" }).click();
  await expect(responseDialog.getByRole("button", {
    name: "Property type 1 number",
  })).toContainText("number");
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
  const responseRegion = dialog.getByRole("region", { name: "Response" });
  const addPropertyButton = responseRegion.getByRole("button", {
    name: "Add property",
  });
  await expect(addPropertyButton).toHaveText("");
  await expect(addPropertyButton.locator("svg")).toHaveCount(1);
  await addPropertyButton.click();
  await dialog.getByRole("textbox", {
    name: "Property name 1",
  }).fill("profile");
  await dialog.getByRole("button", {
    name: "Property type 1 string",
  }).click();
  await dialog.getByRole("list", {
    name: "Property type 1",
  }).getByRole("button", { name: "object" }).click();

  const objectTemplate = dialog.getByRole("button", {
    name: "Object type template 1 New",
  });
  await expect(dialog.getByRole("button", {
    name: "Object definition: profile",
  })).toHaveCount(0);
  const objectPropertyRow = dialog.locator(
    '[data-root-properties="true"] > li',
  ).first();
  await expect(objectPropertyRow.getByRole("button", {
    name: "Add property 1",
  })).toHaveCount(1);
  await expect(dialog.getByRole("textbox", {
    name: "Object type",
  })).toHaveCount(0);
  await expect(objectTemplate).toContainText("New");
  await expect(save).toBeEnabled();

  await objectTemplate.click();
  await dialog.getByRole("list", {
    name: "Object type template 1",
  }).getByRole("button", { name: "AddressResponse" }).click();
  const nestedProperties = objectPropertyRow.locator(
    "[data-nested-properties]",
  );
  await expect(nestedProperties).toHaveCount(1);
  await expect(nestedProperties.getByRole("textbox", {
    name: "Property name 1.1",
  })).toHaveValue("city");
  const nestedPropertyList = nestedProperties.locator(":scope > ul");
  await expect(nestedPropertyList).toHaveCSS("padding-inline-start", "16px");
  const nestedPropertyRow = nestedPropertyList.locator(":scope > li");
  await expect.poll(() => nestedPropertyRow.evaluate((element) => {
    const connector = getComputedStyle(element, "::before");
    return {
      blockEndWidth: connector.getPropertyValue("border-block-end-width"),
      inlineStartWidth: connector.getPropertyValue(
        "border-inline-start-width",
      ),
      radius: connector.getPropertyValue("border-end-start-radius"),
    };
  })).toEqual({
    blockEndWidth: "2px",
    inlineStartWidth: "2px",
    radius: "8px",
  });
  await expect(save).toBeEnabled();

  await nestedProperties.getByRole("textbox", {
    name: "Property name 1.1",
  }).fill("displayName");
  await expect(save).toBeEnabled();
  await expect(objectTemplate).toContainText("New");
  await expect(dialog.getByRole("button", {
    name: "Object definition: profile",
  })).toHaveCount(0);
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

test("renders object definitions inline without an empty state", async ({
  page,
}) => {
  await page.goto(studioPath);

  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("profiles");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  const responseRegion = dialog.getByRole("region", { name: "Response" });
  await responseRegion.getByRole("button", { name: "Add property" }).click();
  await dialog.getByRole("textbox", {
    name: "Property name 1",
  }).fill("profile");
  await dialog.getByRole("button", {
    name: "Property type 1 string",
  }).click();
  await dialog.getByRole("list", {
    name: "Property type 1",
  }).getByRole("button", { name: "object" }).click();

  await expect(dialog.getByRole("button", {
    name: "Object definition: profile",
  })).toHaveCount(0);
  await expect(dialog.locator("[data-nested-properties]")).toHaveCount(0);

  const objectPropertyRow = dialog.getByRole("listitem");
  await expect(objectPropertyRow).toHaveCount(1);
  const addObjectProperty = objectPropertyRow.getByRole("button", {
    name: "Add property 1",
  });
  await expect(addObjectProperty).toHaveCount(1);
  await addObjectProperty.click();
  await expect(dialog.getByRole("button", {
    name: "Object definition: profile",
  })).toHaveCount(0);
  const nestedProperties = dialog.locator("[data-nested-properties]");
  await expect(nestedProperties).toHaveCount(1);
  await expect(nestedProperties.getByRole("textbox", {
    name: "Property name 1.1",
  })).toBeVisible();
  const rootProperties = dialog.getByRole("region", {
    name: "Response",
  }).locator('[data-root-properties="true"]');
  await expect(rootProperties).toHaveCount(1);
  await expect(rootProperties).toHaveCSS("padding-inline-start", "16px");
  const rootPropertyRow = rootProperties.locator(":scope > li");
  const nestedPropertyRow = nestedProperties.locator(":scope > ul > li");
  await expect.poll(async () => Promise.all(
    [rootPropertyRow, nestedPropertyRow].map((propertyRow) => (
      propertyRow.evaluate((element) => {
        const endCap = getComputedStyle(element, "::before");
        const continuation = getComputedStyle(element, "::after");
        return {
          continuation: continuation.content,
          endCapBlockWidth: endCap.getPropertyValue(
            "border-block-end-width",
          ),
          endCapInlineWidth: endCap.getPropertyValue(
            "border-inline-start-width",
          ),
          endCapRadius: endCap.getPropertyValue(
            "border-end-start-radius",
          ),
        };
      })
    )),
  )).toEqual([
    {
      continuation: "none",
      endCapBlockWidth: "2px",
      endCapInlineWidth: "2px",
      endCapRadius: "8px",
    },
    {
      continuation: "none",
      endCapBlockWidth: "2px",
      endCapInlineWidth: "2px",
      endCapRadius: "8px",
    },
  ]);
  await addObjectProperty.click();
  const nestedPropertyRows = nestedProperties.locator(":scope > ul > li");
  await expect(nestedPropertyRows).toHaveCount(2);
  const connectorGapGeometry = await Promise.all([
    nestedPropertyRows.nth(0).evaluate((element) => (
      getComputedStyle(element, "::after").insetBlockEnd
    )),
    nestedPropertyRows.nth(1).evaluate((element) => (
      getComputedStyle(element, "::before").insetBlockStart
    )),
  ]);
  expect(connectorGapGeometry).toEqual(["0px", "-12px"]);
  const objectRemove = dialog.getByRole("button", {
    name: "Remove property 1",
    exact: true,
  });
  const nestedRemove = dialog.getByRole("button", {
    name: "Remove property 1.1",
    exact: true,
  });
  await expect(objectRemove).toHaveCount(1);
  await expect(nestedRemove).toHaveCount(1);
  const [objectRemoveBox, nestedRemoveBox] = await Promise.all([
    objectRemove.boundingBox(),
    nestedRemove.boundingBox(),
  ]);
  expect(objectRemoveBox).not.toBeNull();
  expect(nestedRemoveBox).not.toBeNull();
  if (!objectRemoveBox || !nestedRemoveBox) {
    throw new Error("Property remove controls must be measurable.");
  }
  expect(Math.abs(
    objectRemoveBox.x + objectRemoveBox.width
    - nestedRemoveBox.x - nestedRemoveBox.width,
  )).toBeLessThanOrEqual(1);
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

test("persists request and paginated response sections and exports the wrapper", async ({
  page,
}) => {
  await page.goto(studioPath);
  await page.getByRole("textbox", { name: "API endpoint path" }).fill("search");
  await page.getByRole("textbox", { name: "API endpoint path" }).press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  const advancedToggle = dialog.getByRole("button", {
    name: /^Advanced settings:/,
  });
  await expect(advancedToggle).toHaveAttribute("aria-expanded", "false");
  const advancedChevron = advancedToggle.locator("svg");
  await expect(advancedChevron).toHaveCSS(
    "transform",
    "matrix(0, -1, 1, 0, 0, 0)",
  );
  await expect(advancedChevron).toHaveCSS("transition-duration", "0.12s");
  await advancedToggle.hover();
  await expect(advancedToggle).toHaveCSS("box-shadow", "none");
  await expect(advancedToggle).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await advancedToggle.focus();
  await expect(advancedToggle).toHaveCSS("box-shadow", "none");
  await expect(advancedToggle).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );

  await advancedToggle.click();
  await expect(advancedChevron).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await dialog.getByRole("tab", { name: "Request body" }).click();
  const requestRegion = dialog.getByRole("region", { name: "Request body" });
  await requestRegion.getByRole("textbox", { name: "Request type" })
    .fill("SearchRequest");
  await requestRegion.getByRole("button", { name: "Add property" }).click();
  await requestRegion.getByRole("textbox", { name: "Property name 1" })
    .fill("query");

  await dialog.getByRole("tab", { name: "Response" }).click();
  const responseRegion = dialog.getByRole("region", { name: "Response" });
  await responseRegion.getByRole("textbox", { name: "Response type" })
    .fill("SearchResult");
  const pagination = responseRegion.getByRole("button", {
    name: "Paginated response",
  });
  await expect(pagination).toHaveAttribute("data-variant", "transparent");
  await pagination.click();
  await expect(pagination).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => page.evaluate((key) => JSON.parse(
    window.localStorage.getItem(key) ?? "[]",
  ), apiRoutesStorage.key)).toEqual([{
    id: 0,
    method: "GET",
    operationId: "listSearch",
    paginated: true,
    path: "/search",
    request: {
      fields: [{ name: "query", optional: false, type: "string" }],
      typeName: "SearchRequest",
    },
    requestBody: {
      contentTypes: ["application/json"],
      required: false,
      schema: {
        fields: [{ name: "query", optional: false, type: "string" }],
        typeName: "SearchRequest",
      },
    },
    response: { fields: [], typeName: "SearchResult" },
    responses: [{
      contentTypes: ["application/json"],
      description: "Successful response",
      headers: [],
      paginated: true,
      schema: { fields: [], typeName: "SearchResult" },
      status: "200",
    }],
    title: "List search",
  }]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const skill = await readDownload(await downloadPromise);
  expect(skill).toContain("Request model: `SearchRequest`");
  expect(skill).toContain("Response model: `SearchResultPage`");
  expect(skill).toContain("items: SearchResult[];");
  expect(skill).toContain("totalHits: number;");
  expect(skill).toContain("limit: number;");
  expect(skill).toContain("totalPages: number;");
});

test("prefills a path contract and persists explicit parameters and behavior", async ({
  page,
}) => {
  await page.goto(studioPath);
  await page.getByRole("textbox", { name: "API endpoint path" })
    .fill("users/{uuid}");
  await page.getByRole("textbox", { name: "API endpoint path" }).press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expandAdvancedSettings(dialog);
  const details = dialog.getByRole("region", { name: "Route details" });
  await expect(details.getByRole("textbox", { name: "Title" }))
    .toHaveValue("Get user");
  await expect(details.getByRole("textbox", { name: "Operation ID" }))
    .toHaveValue("getUserByUuid");
  await expect(details.getByRole("textbox", { name: "Parameter name 1" }))
    .toHaveValue("uuid");
  await expect(details.getByRole("textbox", { name: "Format 1" }))
    .toHaveValue("uuid");
  await expect(details.getByRole("button", {
    name: "Remove parameter 1",
  })).toHaveCount(0);
  await details.getByRole("button", { name: "Parameter location 1 path" }).click();
  const pathLocationMenu = details.getByRole("list", {
    name: "Parameter location 1",
  });
  await expect(pathLocationMenu.getByRole("button", { name: "query" }))
    .toBeDisabled();
  await expect(pathLocationMenu.getByRole("button", { name: "header" }))
    .toBeDisabled();
  await expect(pathLocationMenu.getByRole("button", { name: "cookie" }))
    .toBeDisabled();
  await pathLocationMenu.getByRole("button", { name: "path" }).click();

  await details.getByRole("button", { name: "Add parameter" }).click();
  await details.getByRole("textbox", { name: "Parameter name 2" }).fill("limit");
  await details.getByRole("button", { name: "Parameter location 2 query" }).click();
  const locationMenu = details.getByRole("list", {
    name: "Parameter location 2",
  });
  await expect(locationMenu.getByRole("button", { name: "path" }))
    .toBeDisabled();
  await locationMenu.getByRole("button", { name: "header" }).click();
  await details.getByRole("button", { name: "Parameter location 2 header" }).click();
  await details.getByRole("list", { name: "Parameter location 2" })
    .getByRole("button", { name: "query" }).click();
  await details.getByRole("button", { name: /^Parameter type 2 / }).click();
  await details.getByRole("list", { name: "Parameter type 2" })
    .getByRole("button", { name: "integer" }).click();
  const queryParameter = details.getByRole("group", { name: "Parameters 2" });
  const requiredBounds = await queryParameter.getByRole("checkbox", {
    name: "Required",
  }).boundingBox();
  const removeBounds = await queryParameter.getByRole("button", {
    name: "Remove parameter 2",
  }).boundingBox();
  expect(requiredBounds).not.toBeNull();
  expect(removeBounds).not.toBeNull();
  expect(Math.abs(
    requiredBounds!.y + requiredBounds!.height / 2
      - (removeBounds!.y + removeBounds!.height / 2),
  )).toBeLessThan(2);
  await details.getByRole("button", { name: /^Security scheme / }).click();
  await details.getByRole("list", { name: "Security scheme" })
    .getByRole("button", { name: "Bearer token" }).click();
  await details.getByRole("button", { name: /^Cache policy / }).click();
  await details.getByRole("list", { name: "Cache policy" })
    .getByRole("button", { name: "Private" }).click();
  await details.getByRole("textbox", { name: "Rate limit" }).fill("120/minute");

  await expect(dialog.getByRole("textbox", { name: "Response type" }))
    .toHaveValue("UserResponse");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => page.evaluate((key) => JSON.parse(
    window.localStorage.getItem(key) ?? "[]",
  ), apiRoutesStorage.key)).toHaveLength(1);
  const [route] = await page.evaluate((key) => JSON.parse(
    window.localStorage.getItem(key) ?? "[]",
  ) as ApiRouteContract[], apiRoutesStorage.key);
  expect(route).toMatchObject({
    behavior: { cache: "private", rateLimit: "120/minute" },
    operationId: "getUserByUuid",
    parameters: [
      {
        format: "uuid",
        location: "path",
        name: "uuid",
        required: true,
        type: "string",
      },
      {
        location: "query",
        name: "limit",
        required: false,
        type: "integer",
      },
    ],
    security: { scheme: "bearer" },
    title: "Get user",
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const skill = await readDownload(await downloadPromise);
  expect(skill).toContain("Operation ID: `getUserByUuid`");
  expect(skill).toContain("`limit` in query: integer, optional");
  expect(skill).toContain("Security: bearer");
  expect(skill).toContain("Cache policy: private");
  expect(skill).toContain("Rate limit: 120/minute");
});

test("authors portable contract details, constraints, examples, and array serialization", async ({
  page,
}) => {
  await page.goto(studioPath);
  await page.getByRole("button", { name: /^HTTP method / }).click();
  await page.getByRole("list", { name: "HTTP method" })
    .getByRole("button", { name: "POST" }).click();
  const routeInput = page.getByRole("textbox", { name: "API endpoint path" });
  await routeInput.fill("accounts/search");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "Add a data structure to this route",
  });
  await expandAdvancedSettings(dialog);
  const apiDetails = dialog.getByRole("region", { name: "API details" });
  await apiDetails.getByRole("textbox", { name: "API title" }).fill("Accounts API");
  await apiDetails.getByRole("textbox", { name: "API version" }).fill("1.0.0");
  await apiDetails.getByRole("textbox", { name: "Base path" }).fill("/api/v1");
  await apiDetails.getByRole("button", { name: /^Security scheme / }).click();
  await apiDetails.getByRole("list", { name: "Security scheme" })
    .getByRole("button", { name: "Bearer token" }).click();

  const details = dialog.getByRole("region", { name: "Route details" });
  await details.getByRole("button", { name: "Add parameter" }).click();
  await details.getByRole("textbox", { name: "Parameter name 1" }).fill("tags");
  await details.getByRole("button", { name: /^Parameter type 1 / }).click();
  await details.getByRole("list", { name: "Parameter type 1" })
    .getByRole("button", { name: "array" }).click();
  await details.getByRole("button", { name: /^Array serialization 1 / }).click();
  await details.getByRole("list", { name: "Array serialization 1" })
    .getByRole("button", { name: /Comma separated/ }).click();
  await details.getByRole("textbox", { name: "Allowed values 1" })
    .fill("active, archived");
  await details.getByRole("textbox", { name: "Default value 1" }).fill("active");
  await details.getByRole("textbox", { name: "Example 1" }).fill("active");

  await dialog.getByRole("textbox", { name: "Request example" })
    .fill('{"query":"elias"}');
  const request = dialog.getByRole("region", { name: "Request body" });
  await request.getByRole("button", { name: "Add property" }).click();
  await request.getByRole("textbox", { name: "Property name 1" }).fill("query");
  await request.getByRole("textbox", { name: "Allowed values 1" })
    .fill("elias, account");
  await request.getByRole("textbox", { name: "Minimum length 1" }).fill("2");
  await request.getByRole("textbox", { name: "Maximum length 1" }).fill("80");
  await request.getByRole("textbox", { name: "Pattern 1" }).fill("^[a-z]+$");

  await dialog.getByRole("tab", { name: "Response" }).click();
  await dialog.getByRole("textbox", { name: "Response example 1" })
    .fill('{"id":"acc_1"}');
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => page.evaluate((key) => JSON.parse(
    window.localStorage.getItem(key) ?? "{}",
  ), apiContractMetadataStorage.key)).toMatchObject({
    basePath: "/api/v1",
    security: { scheme: "bearer" },
    title: "Accounts API",
    version: "1.0.0",
  });
  const [route] = await page.evaluate((key) => JSON.parse(
    window.localStorage.getItem(key) ?? "[]",
  ) as ApiRouteContract[], apiRoutesStorage.key);
  expect(route).toMatchObject({
    parameters: [{
      defaultValue: "active",
      enumValues: ["active", "archived"],
      example: "active",
      location: "query",
      name: "tags",
      serialization: "comma",
      type: "array",
    }],
    requestBody: { example: { query: "elias" } },
    responses: [{ example: { id: "acc_1" } }],
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const skill = await readDownload(await downloadPromise);
  expect(skill).toContain("Title: Accounts API");
  expect(skill).toContain("Base path: `/api/v1`");
  expect(skill).toContain("serialization comma");
  expect(skill).toContain("minimum length: 2");
  expect(skill).toContain('"query": "elias"');
  expect(skill).toContain('"id": "acc_1"');
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
