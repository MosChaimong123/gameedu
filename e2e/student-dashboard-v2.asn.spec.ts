import { expect, test } from "@playwright/test";

const studentCode = process.env.ASN_E2E_STUDENT_CODE;
const studentDashboardTest = studentCode ? test : test.skip;

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth - metrics.width).toBeLessThanOrEqual(4);
}

async function openGameTab(page: import("@playwright/test").Page, tab: "monster" | "battle") {
  await page.goto(`/student/${encodeURIComponent(studentCode!)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("student-dashboard-mode-toggle").click();
  await page.getByTestId(`student-dashboard-tab-${tab}`).click();
}

test.describe("Student dashboard V2 smoke", () => {
  test("lite battle APIs expose stable invalid-request contracts", async ({ request }) => {
    const classId = "000000000000000000000000";

    const start = await request.post(`/api/classrooms/${classId}/battle/lite/start`, {
      data: {},
    });
    expect(start.status()).toBe(400);
    await expect(start.json()).resolves.toMatchObject({ error: "INVALID_REQUEST" });

    const session = await request.get(`/api/classrooms/${classId}/battle/lite/session`);
    expect(session.status()).toBe(400);
    await expect(session.json()).resolves.toMatchObject({ error: "INVALID_REQUEST" });

    const choice = await request.post(`/api/classrooms/${classId}/battle/lite/choice`, {
      data: {},
    });
    expect(choice.status()).toBe(400);
    await expect(choice.json()).resolves.toMatchObject({ error: "INVALID_REQUEST" });
  });

  studentDashboardTest("monster tab renders V2 panels on desktop and mobile", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await openGameTab(page, "monster");

      await expect(page.getByText("Monster V2")).toBeVisible();
      await expect(page.getByText("Skill Catalog")).toBeVisible();
      await expect(page.getByText("Inventory V2")).toBeVisible();
      await expect(page.getByText("Evolution")).toBeVisible();
      await expect(page.getByText(/Level|Starter skill/).first()).toBeVisible();
      await expect(page.getByText(/EN \d+/).first()).toBeVisible();
      await expect(page.getByText("HP")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(consoleErrors).toEqual([]);
  });

  studentDashboardTest("battle start screen renders without legacy fallback", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.setViewportSize({ width: 1366, height: 900 });
    await openGameTab(page, "battle");

    await expect(page.getByText("Battle Items")).toBeVisible();
    await expect(page.getByText("History")).toBeVisible();
    await expect(page.getByText("Legacy Interactive Battle")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(consoleErrors).toEqual([]);
  });

  studentDashboardTest("battle UI exposes skill, item, and readable effect surfaces", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await openGameTab(page, "battle");

      await expect(page.getByText("Battle Items")).toBeVisible();
      await expect(page.getByText("History")).toBeVisible();
      await expect(page.getByText(/Power|Heal|Immune|Gold|Energy|EN/).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(consoleErrors).toEqual([]);
  });
});
