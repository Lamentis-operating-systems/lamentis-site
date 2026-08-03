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

test("keeps the common GET flow to route, status, and response JSON", async ({
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
  await expect(dialog.getByRole("textbox", { name: "Request JSON" }))
    .toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "Response JSON" }))
    .toBeVisible();
  await expect(dialog.getByRole("button", { name: "HTTP status 200" }))
    .toBeVisible();
  await expect(dialog.getByText("Advanced settings")).toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "Response type" }))
    .toHaveCount(0);
});

test("creates, exports, and reopens an inferred JSON contract", async ({
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
  await dialog.getByRole("textbox", { name: "Request JSON" }).fill(
    '{"name":"Ada","roles":["admin"]}',
  );
  await dialog.getByRole("textbox", { name: "Response JSON" }).fill(
    '{"id":"user_1","profile":{"display-name":"Ada"}}',
  );
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
  expect(skill).toContain('"display-name": string;');
  expect(skill).toContain('"name": "Ada"');
  expect(skill).toContain('"id": "user_1"');

  await page.getByRole("button", { name: "Route actions /users" }).click();
  await page.getByRole("button", { name: "Edit /users" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit this route" });
  await expect(editDialog.getByRole("textbox", { name: "Request JSON" }))
    .toHaveValue(/"name": "Ada"/);
  await expect(editDialog.getByRole("textbox", { name: "Response JSON" }))
    .toHaveValue(/"id": "user_1"/);
});

test("reports invalid JSON without losing the draft", async ({ page }) => {
  await page.goto(studioPath);
  await selectMethod(page, "POST");
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("drafts");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  const requestJson = dialog.getByRole("textbox", { name: "Request JSON" });
  await requestJson.fill('{"title":');
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog.getByRole("alert")).toHaveText(
    "Enter valid JSON before saving.",
  );
  await expect(requestJson).toHaveAttribute("aria-invalid", "true");
  await expect(requestJson).toBeFocused();
  await expect(requestJson).toHaveValue('{"title":');
});

test("offers a compact no-content response", async ({ page }) => {
  await page.goto(studioPath);
  const routeInput = page.getByRole("textbox", {
    name: "API endpoint path",
  });
  await routeInput.fill("health");
  await routeInput.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Define this API route" });
  await dialog.getByRole("button", { name: "HTTP status 200" }).click();
  await dialog.getByRole("list", { name: "HTTP status" })
    .getByRole("button", { name: "204" }).click();
  await expect(dialog.getByRole("textbox", { name: "Response JSON" }))
    .toHaveCount(0);
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
    responses: [{
      contentTypes: ["application/xml"],
      description: "Legacy XML response",
      status: "200",
    }],
    security: { scheme: "bearer" },
    tags: ["legacy"],
  }]);
  await page.goto(studioPath);
  await page.getByRole("button", { name: "Route actions /legacy" }).click();
  await page.getByRole("button", { name: "Edit /legacy" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit this route" });
  await expect(dialog.getByText("Advanced settings")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save" }).click();
  const routes = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key) ?? "[]") as ApiRouteContract[]
  ), apiRoutesStorage.key);
  expect(routes[0]).toMatchObject({
    behavior: { cache: "private", rateLimit: "100/min" },
    responses: [{
      contentTypes: ["application/xml"],
      description: "Legacy XML response",
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
