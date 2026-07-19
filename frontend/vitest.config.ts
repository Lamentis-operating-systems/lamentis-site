import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/**/*.test.tsx",
      "tests/**/*.test.ts",
      "app/**/*.test.tsx",
      "app/**/*.test.ts",
      "components/**/*.test.tsx",
      "components/**/*.test.ts",
    ],
  },
});
