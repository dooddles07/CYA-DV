import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // The PWA install prompt (src/components/pwa/install-prompt.tsx) is a
  // fixed, high z-index overlay that can appear at an unpredictable moment
  // once Chromium fires its native `beforeinstallprompt` event — pre-seed
  // the same "dismissed" flag the component itself checks so it never
  // mounts at all, rather than risk it intercepting a click.
  await page.addInitScript(() => localStorage.setItem("cya-install-dismissed", "1"));
});

/**
 * Core happy path: register -> auto-logged-in -> view daily verse -> mark
 * read -> streak increments -> dashboard reflects it. Runs against dev:local
 * (disposable in-memory Mongo) via playwright.config.ts's webServer.
 */
test("register, mark today's verse read, and see the streak increment", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByRole("textbox", { name: "Name" }).fill("E2E Smoke Test");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("e2e-smoke-pass-1234");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/verse");
  const markRead = page.getByRole("button", { name: "I read today's verse" });
  await expect(markRead).toBeVisible();
  await markRead.click();

  await expect(page.getByRole("button", { name: /streak saved/ })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText(/day streak/)).toBeVisible();
});
