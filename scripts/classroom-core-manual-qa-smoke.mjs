import { chromium } from "@playwright/test";

const teacherEmail = "qa.teacher.classroom@example.com";
const teacherPassword = "Classroom123!";
const coreClassroomId = "69f809ddb6be9839a2684b77";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();
  const steps = [];

  try {
    await page.goto("/login?audience=teacher", { waitUntil: "networkidle" });
    steps.push({ step: "open_login", url: page.url() });

    await page.locator('input[name="email"]').fill(teacherEmail);
    await page.locator('input[name="password"]').fill(teacherPassword);
    await page.getByRole("button", { name: /^Sign in$/ }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    steps.push({ step: "after_login", url: page.url() });

    await page.goto(`/dashboard/classrooms/${coreClassroomId}`, { waitUntil: "networkidle" });
    steps.push({
      step: "open_core_classroom",
      url: page.url(),
      body: (await page.locator("body").innerText()).slice(0, 1200),
    });

    console.log(JSON.stringify({ ok: true, steps }, null, 2));
  } catch (error) {
    steps.push({
      step: "error",
      url: page.url(),
      message: error instanceof Error ? error.message : String(error),
      body: (await page.locator("body").innerText()).slice(0, 1200),
    });
    console.log(JSON.stringify({ ok: false, steps }, null, 2));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

await main();
