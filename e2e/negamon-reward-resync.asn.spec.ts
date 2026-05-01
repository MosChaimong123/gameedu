import { expect, test } from "@playwright/test";

const classId = process.env.ASN_E2E_CLASS_ID;
const rewardGamePin = process.env.ASN_E2E_REWARD_GAME_PIN ?? "QA-REWARD-PIN";
const economyAuthRedirectTest = classId ? test : test.skip;
const economyDeepLinkTest =
  classId && process.env.PLAYWRIGHT_STORAGE_STATE ? test : test.skip;

test.describe("Negamon reward re-sync smoke", () => {
  test("reward audit APIs require teacher authentication", async ({ request }) => {
    const fakeClassId = "000000000000000000000000";

    const audit = await request.get(`/api/classrooms/${fakeClassId}/negamon/reward-audit`);
    expect(audit.status()).toBe(401);

    const effectiveness = await request.get(
      `/api/classrooms/${fakeClassId}/negamon/reward-effectiveness`
    );
    expect(effectiveness.status()).toBe(401);

    const resync = await request.post(`/api/classrooms/${fakeClassId}/negamon/reward-resync`, {
      data: { gamePin: rewardGamePin },
    });
    expect(resync.status()).toBe(401);
  });

  economyAuthRedirectTest("economy deep-link auth gate preserves reward pin callback", async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.PLAYWRIGHT_STORAGE_STATE),
      "This unauthenticated redirect check runs only without PLAYWRIGHT_STORAGE_STATE."
    );

    const path =
      `/dashboard/classrooms/${classId}` +
      `?tab=economy&rewardGamePin=${encodeURIComponent(rewardGamePin)}`;
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/login\?/);
    await expect(page).toHaveURL(/tab=economy/);
    await expect(page).toHaveURL(new RegExp(`rewardGamePin=${encodeURIComponent(rewardGamePin)}`));
    await expect(page).toHaveURL(/callbackUrl=/);
  });

  economyDeepLinkTest("economy deep-link keeps Negamon reward pin query", async ({ page }) => {
    const path =
      `/dashboard/classrooms/${classId}` +
      `?tab=economy&rewardGamePin=${encodeURIComponent(rewardGamePin)}`;
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(new RegExp(`/dashboard/classrooms/${classId}\\?`));
    await expect(page).toHaveURL(/tab=economy/);
    await expect(page).toHaveURL(new RegExp(`rewardGamePin=${encodeURIComponent(rewardGamePin)}`));
  });
});
