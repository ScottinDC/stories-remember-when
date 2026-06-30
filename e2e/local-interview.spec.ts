import { expect, test } from "@playwright/test";

async function localServerUp(request: import("@playwright/test").APIRequestContext) {
  try {
    const health = await request.get("/api/health", { timeout: 5_000 });
    return health.ok();
  } catch {
    return false;
  }
}

test.describe("Local — authenticated interview UI (AUTH_DISABLED)", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    if (testInfo.project.name !== "local") {
      test.skip();
    }
    const up = await localServerUp(request);
    test.skip(!up, "Local dev server not running on 127.0.0.1:5173 — run: npm run dev:local");
  });

  test("8. Interview UI loads with header and questions (auth bypass)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Opening the interview|Family Oral History/i).first()).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Question Series")).toBeVisible();
    await expect(page.getByText("Current Question")).toBeVisible();
    await expect(page.getByRole("button", { name: /Record response/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Internal Error/i);
  });

  test("9. Foundation prompts are listed", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Question Series")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/earliest memories/i)).toBeVisible();
    await expect(page.getByText(/Kodak/i)).toBeVisible();
  });

  test("10. /api/interview returns thread + nodes locally", async ({ request }) => {
    const response = await request.get("/api/interview");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.thread?.title).toBeTruthy();
    expect(body.nodes?.length).toBeGreaterThanOrEqual(5);
    expect(body.nodes[0]?.question).toBeTruthy();
    expect(body.nodes[0]?.status).toBe("pending");
  });
});
