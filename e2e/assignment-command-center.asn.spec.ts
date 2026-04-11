import { expect, test } from "@playwright/test";

const classId = process.env.ASN_E2E_CLASS_ID;
const assignmentId = process.env.ASN_E2E_ASSIGNMENT_ID;

test.describe("ASN assignment command center smoke", () => {
  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok(), `GET /api/health failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, status: "healthy" });
  });

  test("deep-link keeps assignment focus query", async ({ page }) => {
    test.skip(!classId, "Set ASN_E2E_CLASS_ID to enable this smoke check.");

    const path = `/dashboard/classrooms/${classId}?tab=classroom&focus=assignments`;
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(new RegExp(`/dashboard/classrooms/${classId}\\?`));
    await expect(page).toHaveURL(/tab=classroom/);
    await expect(page).toHaveURL(/focus=assignments/);
  });

  test("deep-link includes highlight assignment query", async ({ page }) => {
    test.skip(
      !classId || !assignmentId,
      "Set ASN_E2E_CLASS_ID and ASN_E2E_ASSIGNMENT_ID to enable this smoke check."
    );

    const path =
      `/dashboard/classrooms/${classId}` +
      `?tab=classroom&focus=assignments&highlightAssignmentId=${assignmentId}`;
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(new RegExp(`/dashboard/classrooms/${classId}\\?`));
    await expect(page).toHaveURL(/focus=assignments/);
    await expect(page).toHaveURL(new RegExp(`highlightAssignmentId=${assignmentId}`));
  });
});
