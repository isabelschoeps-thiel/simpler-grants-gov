import path from "path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

// Determine environment
const TEST_ENVIRONMENT = process.env.TEST_ENVIRONMENT || "local";

// Base URL selection
const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not defined`);
  return value;
};

let baseUrl: string;
switch (TEST_ENVIRONMENT) {
  case "staging":
    baseUrl = getEnv("STAGING_BASE_URL");
    break;
  case "training":
    baseUrl = getEnv("TRAINING_BASE_URL");
    break;
  case "production":
    baseUrl = getEnv("PRODUCTION_BASE_URL");
    break;
  case "local":
  default:
    baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
}

const webServerEnv: Record<string, string> = Object.fromEntries(
  Object.entries({
    ...process.env,

    // Explicitly disable New Relic for E2E
    NEW_RELIC_ENABLED: "false",
  }).filter(([, value]) => typeof value === "string"),
);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 75000,
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 0,
  workers: 10,
  // Use 'blob' for CI to allow merging of reports. See https://playwright.dev/docs/test-reporters
  reporter: process.env.CI ? "blob" : "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    screenshot: "on",
    video: "on-first-retry",
  },
  shard: {
    // Total number of shards
    total: parseInt(process.env.TOTAL_SHARDS || "1"),
    // Specifies which shard this job should execute
    current: parseInt(process.env.CURRENT_SHARD || "1"),
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: "local-e2e-chromium",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },

    {
      name: "local-e2e-firefox",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Desktop Firefox"], // firefox doesn't support clipboard-write or clipboard-read
        permissions: [],
      },
    },

    {
      name: "local-e2e-webkit",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Desktop Safari"],
        permissions: ["clipboard-read"], // webkit doesn't support clipboard-write
      },
    },

    /* Test against mobile viewports. */
    {
      name: "local-e2e-mobile-chrome",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Pixel 7"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "login-staging-chromium",
      testDir: "./e2e/login",
      grep: /@login/,
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer:
    TEST_ENVIRONMENT === "local"
      ? {
          command: "npm run start",
          url: baseUrl,
          reuseExistingServer: !process.env.CI,
          env: webServerEnv,
        }
      : undefined,
});
