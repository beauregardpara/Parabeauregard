import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      // Bureau : tout sauf la suite mobile dédiée.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "**/mobile.spec.ts",
    },
    {
      // Mobile : viewport/touch iPhone 12 mais moteur chromium installé.
      name: "mobile-iphone",
      use: { ...devices["iPhone 12"], defaultBrowserType: "chromium" },
      testMatch: "**/mobile.spec.ts",
    },
  ],
});
