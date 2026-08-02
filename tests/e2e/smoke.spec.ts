import { test, expect } from "@playwright/test";

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
