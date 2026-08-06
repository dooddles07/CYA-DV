import { test, expect } from "@playwright/test";

// Matches the fixture seeded by scripts/seed-e2e-member.mjs (dev-local only).
// Posting to the wall requires emailVerified=true, which a freshly registered
// account never has in dev-local (no SMTP configured to click a real link)
// — this fixture is the only way to exercise that flow end-to-end.
const MEMBER_EMAIL = "e2e-member@example.com";
const MEMBER_PASSWORD = "e2e-member-pass-1234";

test.beforeEach(async ({ page }) => {
  // See smoke.spec.ts — pre-seed the install prompt's dismissed flag so the
  // fixed-position overlay can't intercept a click mid-test.
  await page.addInitScript(() => localStorage.setItem("cya-install-dismissed", "1"));
});

/**
 * Prayer wall happy path: sign in as a verified member -> submit a request ->
 * it appears on the wall -> pray for it -> the button reflects the toggle.
 * Was previously untested end-to-end (only covered by service-level
 * integration tests).
 */
test("post a prayer request and pray for one on the wall", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(MEMBER_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(MEMBER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/prayer");
  const requestText = `E2E prayer request ${Date.now()}`;
  await page.getByLabel("Prayer request").fill(requestText);
  await page.getByRole("button", { name: "Share prayer request" }).click();

  const requestParagraph = page.getByText(requestText, { exact: true });
  await expect(requestParagraph).toBeVisible();

  // The card is the request paragraph's immediate parent (Card renders one
  // outer div holding the name row, the request text, and the button row).
  const card = requestParagraph.locator("..");
  const prayButton = card.getByRole("button", { name: "I prayed" });
  await prayButton.click();

  const prayingButton = card.getByRole("button", { name: "Praying" });
  await expect(prayingButton).toBeVisible();
  await expect(prayingButton).toHaveAttribute("aria-pressed", "true");
});

/**
 * A signed-in but unverified member is blocked from posting, with a clear
 * error — this enforcement (prayer.service.js's emailVerified gate) had no
 * end-to-end coverage.
 */
test("an unverified member cannot post to the prayer wall", async ({ page }) => {
  const email = `e2e-unverified-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByRole("textbox", { name: "Name" }).fill("E2E Unverified");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("e2e-unverified-pass-1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/prayer");
  await page.getByLabel("Prayer request").fill(`Unverified attempt ${Date.now()}`);
  await page.getByRole("button", { name: "Share prayer request" }).click();

  await expect(page.getByText("Please confirm your email before posting to the prayer wall.")).toBeVisible();
});
