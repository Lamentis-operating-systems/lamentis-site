import { expect, test } from "@playwright/test";

const documentPaths = [
  "/en/api-creator-studio",
  "/add-site",
] as const;

for (const path of documentPaths) {
  test(`${path} sends the application security headers`, async ({
    request,
  }) => {
    const response = await request.get(path);
    const headers = response.headers();

    expect(response.status()).toBe(200);
    expect(headers["permissions-policy"]).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
    expect(headers["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
}
