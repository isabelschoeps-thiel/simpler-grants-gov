import * as path from "path";
import { test } from "@playwright/test";
import * as dotenv from "dotenv";
import { authenticator } from "otplib";

// Load environment variables from frontend/.env.local
// __dirname resolves to frontend/tests/e2e/login, so we need to go up 3 levels to frontend/
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

// Get environment selection
const testEnv = process.env.TEST_ENVIRONMENT || "staging";

// Determine which credentials to use based on environment
const isProductionEnv = testEnv === "production";
const credentialPrefix = isProductionEnv ? "PRODENV" : "LOWERENV";

// Validate and retrieve required env variables
const email = process.env[`${credentialPrefix}_TEST_USER_EMAIL`];
const password = process.env[`${credentialPrefix}_TEST_USER_PASSWORD`];
const authKey = process.env[`${credentialPrefix}_TEST_USER_MFA_KEY`];

// Get base URL based on environment
const baseUrlEnv = process.env[`${testEnv.toUpperCase()}_BASE_URL`];

// If secrets or base URL are missing, skip the spec to avoid failing CI on PRs without secrets
const envMissing = !email || !password || !authKey || !baseUrlEnv;
test.skip(envMissing, "Login E2E env not configured; skipping spec");

// Narrow types after skip to satisfy TypeScript
const requireEnv = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`${name} is not defined`);
  return value;
};

const loginEmail = requireEnv(email, `${credentialPrefix}_TEST_USER_EMAIL`);
const loginPassword = requireEnv(
  password,
  `${credentialPrefix}_TEST_USER_PASSWORD`,
);
const loginAuthKey = requireEnv(
  authKey,
  `${credentialPrefix}_TEST_USER_MFA_KEY`,
);
const baseUrl = requireEnv(baseUrlEnv, `${testEnv.toUpperCase()}_BASE_URL`);

test("Login.gov authentication with MFA", async ({ page }) => {
  // Navigate to staging site
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  // Take screenshot to see current state
  const step1Path = test.info().outputPath("step1-homepage.png");
  await page.screenshot({ path: step1Path, fullPage: true });
  await test
    .info()
    .attach("step1-homepage", { path: step1Path, contentType: "image/png" });

  // Click "Sign In" - try multiple selectors
  let signInButton = page.locator('button:has-text("Sign In")').first();
  let isVisible = await signInButton
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!isVisible) {
    signInButton = page.locator('a:has-text("Sign In")').first();
    isVisible = await signInButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }

  if (!isVisible) {
    const debugNoSignInPath = test
      .info()
      .outputPath("step1-debug-no-signin.png");
    await page.screenshot({ path: debugNoSignInPath, fullPage: true });
    await test
      .info()
      .attach("step1-debug-no-signin", {
        path: debugNoSignInPath,
        contentType: "image/png",
      });
    throw new Error("Could not find Sign In button or link");
  }

  await signInButton.click();
  // Wait for navigation - could go to Login.gov or a login page
  await page.waitForLoadState("networkidle");
  const step2Path = test.info().outputPath("step2-after-signin-click.png");
  await page.screenshot({ path: step2Path, fullPage: true });
  await test
    .info()
    .attach("step2-after-signin-click", {
      path: step2Path,
      contentType: "image/png",
    });

  // Fill login form
  await page.fill('input[name="user[email]"]', loginEmail);
  await page.fill('input[name="user[password]"]', loginPassword);
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for MFA input
  await page.waitForSelector('input[autocomplete="one-time-code"]', {
    state: "visible",
    timeout: 15000,
  });
  const step3Path = test.info().outputPath("step3-mfa-prompt.png");
  await page.screenshot({ path: step3Path, fullPage: true });
  await test
    .info()
    .attach("step3-mfa-prompt", { path: step3Path, contentType: "image/png" });

  // Generate MFA code and submit
  const oneTimeCode = authenticator.generate(loginAuthKey);
  await page.fill('input[autocomplete="one-time-code"]', oneTimeCode);
  // Find and click the submit button (not cancel) - look for button with "submit" or "verify" text
  const mfaSubmitButton = page
    .locator('button[type="submit"]:not(:has-text("Cancel"))')
    .first();
  await mfaSubmitButton.click();

  // Wait for redirect back to app and verify successful login
  await page.waitForURL(baseUrl, { timeout: 15000 });
  const step4Path = test.info().outputPath("step4-login-success.png");
  await page.screenshot({ path: step4Path, fullPage: true });
  await test
    .info()
    .attach("step4-login-success", {
      path: step4Path,
      contentType: "image/png",
    });
});
