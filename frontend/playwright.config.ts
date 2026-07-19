import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const useProductionServer = isCi || process.env.PLAYWRIGHT_PRODUCTION === "1";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  reporter: isCi ? [["github"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    locale: "en-US",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: useProductionServer
      ? "npm run start -- --hostname 127.0.0.1"
      : "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/en",
    reuseExistingServer: !useProductionServer,
    timeout: 120_000,
  },
});
