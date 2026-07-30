import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const useDevServer = process.env.PLAYWRIGHT_DEV_SERVER === "1";
const outputDirectory =
  process.env.PLAYWRIGHT_OUTPUT_DIR ?? "./test-results";
const htmlReportDirectory =
  process.env.PLAYWRIGHT_HTML_REPORT ?? "./playwright-report";
const requestedPort = Number(process.env.PLAYWRIGHT_PORT);
const serverPort = (
  Number.isSafeInteger(requestedPort)
  && requestedPort > 0
  && requestedPort <= 65_535
) ? requestedPort : 3000;
const baseUrl = `http://127.0.0.1:${serverPort}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: outputDirectory,
  fullyParallel: true,
  forbidOnly: isCi,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 2,
    },
  },
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  reporter: isCi
    ? [
        ["github"],
        [
        "html",
        { open: "never", outputFolder: htmlReportDirectory },
        ],
      ]
    : "list",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}",
  use: {
    baseURL: baseUrl,
    browserName: "chromium",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: useDevServer
      ? `./node_modules/.bin/next dev --hostname 127.0.0.1 --port ${serverPort}`
      : `./node_modules/.bin/next start --hostname 127.0.0.1 --port ${serverPort}`,
    url: `${baseUrl}/en`,
    reuseExistingServer: useDevServer && !isCi,
    timeout: 120_000,
  },
});
