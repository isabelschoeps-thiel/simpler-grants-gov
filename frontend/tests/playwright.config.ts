import path from "path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

// Determine environment
const TEST_ENVIRONMENT = process.env.TEST_ENVIRONMENT || "local";

// Helper to read env variables
const getEnv = (name: string, required = true): string | undefined => {
  const value = process.env[name];
  if (required && !value) throw new Error(`${name} is not defined`);
  return value;
};

// Base URLs
const localBaseUrl =
  process.env.TEST_ENVIRONMENT !== "staging"
    ? getEnv("LOCAL_BASE_URL", false) || "http://127.0.0.1:3000"
    : undefined;

const stagingBaseUrl = getEnv("STAGING_BASE_URL", true);

// Environment variables for local web server
const webServerEnv: Record<string, string> = Object.fromEntries(
  Object.entries({
    ...process.env,
    NEW_RELIC_ENABLED: "false", // disable New Relic for E2E
  }).filter(([, value]) => typeof value === "string"),
);

/**
 * Playwright configuration
 */
export default defineConfig({
  timeout: 75000,
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: 10,
  reporter: process.env.CI ? "blob" : "html",
  use: {
    trace: "on-first-retry",
    screenshot: "on",
    video: "on-first-retry",
  },
  shard: {
    total: parseInt(process.env.TOTAL_SHARDS || "1"),
    current: parseInt(process.env.CURRENT_SHARD || "1"),
  },
  projects: [
    // Desktop Chrome for local tests (exclude login)
    {
      name: "local-e2e-chromium",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: localBaseUrl,
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },

    // Desktop Firefox
    {
      name: "local-e2e-firefox",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Desktop Firefox"],
        baseURL: localBaseUrl,
        permissions: [],
      },
    },

    // Desktop Safari
    {
      name: "local-e2e-webkit",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Desktop Safari"],
        baseURL: localBaseUrl,
        permissions: ["clipboard-read"],
      },
    },

    // Mobile Chrome
    {
      name: "local-e2e-mobile-chrome",
      testDir: "./e2e",
      grepInvert: /@login/,
      testIgnore: "login/**",
      use: {
        ...devices["Pixel 7"],
        baseURL: localBaseUrl,
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },

    // Login tests on staging
    {
      name: "login-staging-chromium",
      testDir: "./e2e/login",
      grep: /@login/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: stagingBaseUrl,
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],

  // Run local dev server only if environment is local
  webServer:
    TEST_ENVIRONMENT === "local"
      ? {
          command: "npm run start",
          url: localBaseUrl,
          reuseExistingServer: !process.env.CI,
          env: webServerEnv,
        }
      : undefined,
});
