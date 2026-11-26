import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173/advent-2026/";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: true,
  workers: 3,
  use: { baseURL, timezoneId: "America/Los_Angeles" },
  webServer: { command: "node tests/static-server.js", port: 4173 },
});
