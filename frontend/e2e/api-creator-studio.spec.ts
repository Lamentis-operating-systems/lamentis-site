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
const emptyObjectSchemaStarter = [
  "{",
  '  "type": "object",',
  '  "properties": {',
  "    ",
  "  }",
  "}",
].join("\n");

function objectSchemaJson(
  properties: Record<string, unknown>,
  required: string[] = Object.keys(properties),
): string {
  return JSON.stringify({
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  });
}

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

async function selectMethod(page: Page, method: string): Promise<void> {
  await page.getByRole("button", { name: "HTTP method GET" }).click();
  await page.getByRole("list", { name: "HTTP method" })
    .getByRole("button", { name: method }).click();
}

test("keeps route, query parameters, status, and response type in the common GET flow", async ({
  page,
}) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("users/{id}");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", {
    name: "Request type (JSON Schema)",
  }))
    .toHaveCount(0);
  const responseSchema = dialog.getByRole("textbox", {
    name: "Response type (JSON Schema)",
  });
  await expect(responseSchema).toBeVisible();
  await expect(responseSchema).toHaveValue(emptyObjectSchemaStarter);
  await expect(dialog.getByRole("checkbox", {
    name: "Paginated response",
  })).toHaveAccessibleDescription(
    "Wraps this type in items and adds totalHits, page, limit, and totalPages when exported.",
  );
  await expect(dialog.getByRole("checkbox", {
    name: "Paginated response 1",
  })).toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "HTTP status" }))
    .toHaveValue("200");
  await expect(dialog.getByRole("button", { name: "Add query parameter" }))
    .toBeVisible();
  await expect(dialog.getByRole("button", {
    name: "Advanced settings",
  })).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByRole("textbox", {
    exact: true,
    name: "Response type",
  }))
    .toHaveCount(0);
});

test("assists keyboard authoring without trapping focus @cross-browser-smoke", async ({
  page,
}) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("assisted");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  const responseSchema = dialog.getByRole("textbox", {
    name: "Response type (JSON Schema)",
  });
  await responseSchema.focus();
  const expectedCaret = emptyObjectSchemaStarter.indexOf("\n    \n") + 5;
  await responseSchema.evaluate((input, position) => {
    (input as HTMLTextAreaElement).setSelectionRange(position, position);
  }, expectedCaret);

  await page.keyboard.type('"id": {"type": "string"}');
  await expect(responseSchema).toHaveValue([
    "{",
    '  "type": "object",',
    '  "properties": {',
    '    "id": {"type": "string"}',
    "  }",
    "}",
  ].join("\n"));

  await responseSchema.press("Tab");
  await expect(responseSchema).not.toBeFocused();
  await dialog.getByRole("button", { name: "Save" }).click();

  const routes = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key) ?? "[]") as ApiRouteContract[]
  ), apiRoutesStorage.key);
  expect(routes[0]?.responses?.[0]?.schema?.fields).toEqual([{
    name: "id",
    optional: true,
    type: "string",
  }]);
});

test("creates, exports, and reopens a typed JSON contract with examples", async ({
  page,
}) => {
  await page.goto(studioPath);
  await selectMethod(page, "POST");
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("users");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  await dialog.getByRole("textbox", {
    name: "Request type (JSON Schema)",
  }).fill(
    objectSchemaJson({
      name: { type: "string" },
      roles: { type: "array", items: { type: "string" } },
    }),
  );
  await dialog.getByRole("textbox", {
    name: "Response type (JSON Schema)",
  }).fill(
    objectSchemaJson({
      id: { type: "string" },
      profile: {
        type: "object",
        properties: { "display-name": { type: "string" } },
        required: ["display-name"],
      },
    }),
  );
  await dialog.getByRole("checkbox", { name: "Paginated response" }).check();
  await dialog.getByRole("button", {
    name: "Advanced settings",
  }).click();
  await dialog.getByRole("textbox", { name: "Request example (JSON)" })
    .fill('{"name":"Ada","roles":["admin"]}');
  await dialog.getByRole("textbox", { name: "Response example (JSON)" })
    .fill('{"id":"user_1","profile":{"display-name":"Ada"}}');
  await dialog.getByRole("button", { name: "Save" }).click();

  const route = page.getByRole("list", { name: "API routes" })
    .getByRole("listitem");
  await expect(route).toContainText("POST");
  await expect(route).toContainText("/users");
  await expect(route).toContainText("PostUsersResponse");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download" }).click(),
  ]);
  const skill = await readDownload(download);
  expect(skill).toContain("export interface PostUsersRequest {");
  expect(skill).toContain("export interface PostUsersResponse {");
  expect(skill).toContain("export interface PostUsersResponsePage {");
  expect(skill).toContain("items: PostUsersResponse[];");
  expect(skill).toContain("totalHits: number;");
  expect(skill).toContain("totalPages: number;");
  expect(skill).toContain('"display-name": string;');
  expect(skill).toContain('"name": "Ada"');
  expect(skill).toContain('"id": "user_1"');

  await page.getByRole("button", { name: "Route actions /users" }).click();
  await page.getByRole("button", { name: "Edit /users" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit this route" });
  await expect(editDialog.getByRole("textbox", {
    name: "Request type (JSON Schema)",
  })).toHaveValue(/"name": \{\n\s+"type": "string"/);
  await expect(editDialog.getByRole("textbox", {
    name: "Response type (JSON Schema)",
  })).toHaveValue(/"profile": \{/);
  await expect(editDialog.getByRole("checkbox", {
    name: "Paginated response",
  })).toBeChecked();
  await editDialog.getByRole("button", {
    name: "Advanced settings",
  }).click();
  await expect(editDialog.getByRole("textbox", {
    name: "Request example (JSON)",
  })).toHaveValue(/"name": "Ada"/);
  await expect(editDialog.getByRole("textbox", {
    name: "Response example (JSON)",
  })).toHaveValue(/"id": "user_1"/);
});

test("saves query input and explicit advanced route overrides", async ({
  page,
}) => {
  await page.goto(studioPath);
  await selectMethod(page, "POST");
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("sessions");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  await dialog.getByRole("button", { name: "Add query parameter" }).click();
  await dialog.getByRole("textbox", { name: "Parameter name 1" })
    .fill("include");
  await dialog.getByRole("button", {
    name: "Advanced settings",
  }).click();
  await dialog.getByRole("button", {
    name: "Route authentication Use API default",
  }).click();
  await dialog.getByRole("list", { name: "Route authentication" })
    .getByRole("button", { name: "No authentication" }).click();
  await dialog.getByRole("button", {
    exact: true,
    name: "Add response",
  }).click();
  await dialog.getByRole("textbox", {
    name: "Response type (JSON Schema) 2",
  }).fill(objectSchemaJson({ code: { type: "string" } }));
  await dialog.getByRole("textbox", { name: "Response example (JSON) 2" })
    .fill('{"code":"invalid"}');
  await dialog.getByRole("button", { name: "Save" }).click();

  const routes = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key) ?? "[]") as ApiRouteContract[]
  ), apiRoutesStorage.key);
  expect(routes[0]).toMatchObject({
    parameters: [{
      location: "query",
      name: "include",
      required: false,
      type: "string",
    }],
    responses: [
      { status: "201" },
      {
        description: "Error response",
        example: { code: "invalid" },
        schema: {
          fields: [{ name: "code", optional: false, type: "string" }],
          typeName: "PostSessionsResponse400",
        },
        status: "400",
      },
    ],
    security: { scheme: "none" },
  });
});

test("reports invalid JSON Schema without losing the draft", async ({ page }) => {
  await page.goto(studioPath);
  await selectMethod(page, "POST");
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("drafts");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  const requestSchema = dialog.getByRole("textbox", {
    name: "Request type (JSON Schema)",
  });
  await requestSchema.fill('{"type":');
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog.getByRole("alert")).toHaveText(
    "Enter a complete JSON Schema object before saving.",
  );
  await expect(requestSchema).toHaveAttribute("aria-invalid", "true");
  await expect(requestSchema).toBeFocused();
  await expect(requestSchema).toHaveValue('{"type":');
});

test("keeps an invalid Advanced control visible", async ({
  page,
}) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("sessions");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  const advancedToggle = dialog.getByRole("button", {
    name: "Advanced settings",
  });
  await advancedToggle.click();
  await dialog.getByRole("button", {
    name: "Add header or cookie parameter",
  }).click();
  await dialog.getByRole("button", {
    name: "Advanced settings",
  }).click();

  await expect(dialog.getByRole("button", {
    name: "Advanced settings",
  })).toHaveAttribute("aria-expanded", "true");
  await expect(dialog.getByRole("textbox", { name: "Parameter name 1" }))
    .toBeFocused();
  await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("offers a compact no-content response", async ({ page }) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("health");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  await dialog.getByRole("textbox", { name: "HTTP status" }).fill("204");
  await expect(dialog.getByRole("textbox", {
    name: "Response type (JSON Schema)",
  }))
    .toHaveCount(0);
  await expect(dialog.getByRole("checkbox", {
    name: "Paginated response",
  })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("list", { name: "API routes" })
    .getByRole("listitem")).toContainText("/health");
  const routes = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key) ?? "[]") as ApiRouteContract[]
  ), apiRoutesStorage.key);
  expect(routes[0]?.responses).toEqual([{
    contentTypes: [],
    description: "Successful response",
    status: "204",
  }]);
});

test("preserves legacy details that are no longer editable", async ({ page }) => {
  await seedRoutes(page, [{
    behavior: { cache: "private", rateLimit: "100/min" },
    id: 9,
    method: "GET",
    path: "/legacy",
    requestBody: {
      contentTypes: ["application/vnd.legacy+json"],
      example: { name: "Ada" },
      required: false,
      schema: {
        fields: [{
          maxLength: 40,
          name: "name",
          optional: false,
          type: "string",
        }],
        typeName: "LegacyRequest",
      },
    },
    responses: [{
      contentTypes: ["application/xml"],
      description: "Legacy XML response",
      example: { id: "legacy_1" },
      schema: {
        fields: [{
          name: "id",
          optional: false,
          pattern: "^legacy_",
          type: "string",
        }],
        typeName: "LegacyResponse",
      },
      status: "200",
    }],
    security: { scheme: "bearer" },
    tags: ["legacy"],
  }]);
  await page.goto(studioPath);
  await page.getByRole("button", { name: "Route actions /legacy" }).click();
  await page.getByRole("button", { name: "Edit /legacy" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit this route" });
  await expect(dialog.getByRole("button", {
    name: "Advanced settings",
  })).toHaveAttribute("aria-expanded", "false");
  await dialog.getByRole("button", { name: "Save" }).click();
  const routes = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key) ?? "[]") as ApiRouteContract[]
  ), apiRoutesStorage.key);
  expect(routes[0]).toMatchObject({
    behavior: { cache: "private", rateLimit: "100/min" },
    requestBody: {
      contentTypes: ["application/vnd.legacy+json"],
      example: { name: "Ada" },
      required: false,
      schema: {
        fields: [{
          maxLength: 40,
          name: "name",
          optional: false,
          type: "string",
        }],
        typeName: "LegacyRequest",
      },
    },
    responses: [{
      contentTypes: ["application/xml"],
      description: "Legacy XML response",
      example: { id: "legacy_1" },
      schema: {
        fields: [{
          name: "id",
          optional: false,
          pattern: "^legacy_",
          type: "string",
        }],
        typeName: "LegacyResponse",
      },
      status: "200",
    }],
    security: { scheme: "bearer" },
    tags: ["legacy"],
  });
});

test("keeps duplicate route identities blocked before opening the editor", async ({
  page,
}) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("users");
  await routeInput.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  const mainRouteInput = page.getByRole("main", { name: "API endpoint path" })
    .getByRole("textbox", { name: "API endpoint path" });
  await mainRouteInput.fill("users");
  await expect(mainRouteInput).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Add API route" }))
    .toBeDisabled();
  await expect(page.getByRole("main", { name: "API endpoint path" })
    .getByRole("alert")).toHaveText(
    "This HTTP method and path already exist.",
  );
});
