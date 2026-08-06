import { test, expect } from "@playwright/test";
import { totpCode } from "../../src/server/utils/totp.js";

// Matches the fixture seeded by scripts/seed-e2e-admin.mjs (dev-local only).
const ADMIN_EMAIL = "e2e-admin@example.com";
const ADMIN_PASSWORD = "e2e-admin-pass-1234";

test.beforeEach(async ({ page }) => {
  // The PWA install prompt (src/components/pwa/install-prompt.tsx) is a
  // fixed, high z-index overlay that can appear at an unpredictable moment
  // once Chromium fires its native `beforeinstallprompt` event — pre-seed
  // the same "dismissed" flag the component itself checks so it never
  // mounts at all, rather than racing a dismiss click against its timing.
  await page.addInitScript(() => localStorage.setItem("cya-install-dismissed", "1"));
});

test("admin-role login enrolls in MFA, then a later login verifies it", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login\/mfa-setup/);
  const secret = (await page.locator("p.font-mono").first().textContent())?.trim();
  expect(secret).toBeTruthy();

  await page.getByRole("button", { name: /saved my backup codes/i }).click();
  // pressSequentially (real keystrokes) rather than fill() — this input
  // combines inputMode="numeric" with autoComplete="one-time-code", and
  // fill()'s lower-level value-set doesn't reliably stick for that
  // combination; genuine typing (what a real user does) always works.
  const setupInput = page.getByRole("textbox", { name: "Authentication code" });
  await setupInput.click();
  await setupInput.pressSequentially(totpCode(secret!), { delay: 20 });
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Second login: already enrolled, so this goes through verify, not setup.
  // Logout is CSRF-protected like every other mutating endpoint, and
  // page.request doesn't add the double-submit header automatically.
  const csrfCookie = (await page.context().cookies()).find((c) => c.name === "cya-csrf");
  await page.request.post("/api/auth/logout", { headers: { "X-CSRF-Token": csrfCookie!.value } });
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login\/mfa-verify/);
  const verifyInput = page.getByRole("textbox", { name: "Authentication code" });
  await verifyInput.click();
  await verifyInput.pressSequentially(totpCode(secret!), { delay: 20 });
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
