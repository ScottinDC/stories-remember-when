import { expect, test } from "@playwright/test";

const INTERNAL_ERROR = /Internal Error/i;

test.describe("Production — full unauthenticated flow", () => {
  test("1. Homepage loads (no Netlify Internal Error)", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "homepage HTTP status").toBe(200);
    await expect(page.locator("body")).not.toContainText(INTERNAL_ERROR);
  });

  test("2. Login screen renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Remember When" })).toBeVisible();
    await expect(page.getByText("Private Family Archive")).toBeVisible();
    await expect(page.getByText(/Sign in with Google/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(INTERNAL_ERROR);
  });

  test("3. /api/health returns configured auth + storage", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status(), "health HTTP status").toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.authRequired).toBe(true);
    expect(body.authConfigured).toBe(true);
    expect(body.allowlistCount).toBeGreaterThan(0);
    expect(body.storageBackend).toBe("gcs");
    expect(body.storageConfigured).toBe(true);
    const text = JSON.stringify(body);
    expect(text).not.toMatch(INTERNAL_ERROR);
  });

  test("4. Google OAuth redirect initiates", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: /Continue with Google/i });
    await expect(button).toBeEnabled({ timeout: 20_000 });

    await Promise.all([
      page.waitForURL(/accounts\.google\.com|\.netlify\/identity\/authorize/, { timeout: 20_000 }),
      button.click()
    ]);

    const url = page.url();
    expect(url).toMatch(/accounts\.google\.com|\.netlify\/identity\/authorize/);
    await expect(page.locator("body")).not.toContainText(INTERNAL_ERROR);
  });

  test("5. /api/interview without auth returns 401 JSON (not Internal Error)", async ({ request }) => {
    const response = await request.get("/api/interview");
    expect(response.status(), "interview unauthenticated status").toBe(401);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("application/json");
    const body = await response.json();
    expect(body.error).toMatch(/sign in required/i);
    const text = JSON.stringify(body);
    expect(text).not.toMatch(INTERNAL_ERROR);
  });

  test("6. Netlify Identity settings endpoint responds", async ({ request }) => {
    const response = await request.get("/.netlify/identity/settings");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeTruthy();
  });

  test("7. Static assets load (JS bundle)", async ({ page }) => {
    await page.goto("/");
    const script = page.locator('script[type="module"]');
    await expect(script).toHaveCount(1);
    const src = await script.getAttribute("src");
    expect(src).toBeTruthy();
    const assetResponse = await page.request.get(src!);
    expect(assetResponse.status()).toBe(200);
  });
});
