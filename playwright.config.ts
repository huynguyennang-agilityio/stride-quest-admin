import { defineConfig, devices } from "@playwright/test";

// E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (a local admin, see the README) can live in the
// git-ignored .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: the variables may be set in the shell.
}

// E2E runs only against the local app (and, from issue #4, the local backend).
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  workers: process.env.CI ? 1 : 2,
  // Generous: a busy laptop makes every browser step slow.
  timeout: 120_000,
  expect: { timeout: 40_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chrome",
      // The installed Google Chrome, as the Playwright MCP server uses, so no browser download.
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    // A production build: stable and fast, and its cookies are Secure like in production. A
    // running dev server on port 3000 is reused instead.
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
