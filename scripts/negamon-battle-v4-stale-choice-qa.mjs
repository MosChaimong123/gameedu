import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";

const DEFAULTS = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  classId: "6a12ee29a5e71c6c01a33947",
  studentCode: "WUQADJEJY72J",
  spawnServer: false,
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseArgs() {
  const args = { ...DEFAULTS };
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    if (key === "base-url" && value) args.baseUrl = value;
    if (key === "spawn-server") args.spawnServer = true;
  }
  return args;
}

async function waitForBaseUrl(baseUrl, timeoutMs = 20_000) {
  const startedAt = Date.now();
  let lastError = "UNKNOWN";
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok || response.status === 200 || response.status === 307 || response.status === 308) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError}`);
}

async function clickFirstVisible(page, patterns) {
  for (const pattern of patterns) {
    const locator = page.getByRole("button", { name: pattern }).first();
    if (await locator.count()) {
      if (await locator.isVisible()) {
        await locator.click();
        return pattern;
      }
    }
  }
  throw new Error(`No visible button matched patterns: ${patterns.map(String).join(", ")}`);
}

async function openBattleTab(page) {
  await page.waitForTimeout(1_000);

  let battleTab = page.getByTestId("student-dashboard-tab-battle");
  if (await battleTab.count()) {
    await battleTab.first().click();
    return;
  }

  const modeToggle = page.getByTestId("student-dashboard-mode-toggle");
  await modeToggle.waitFor({ state: "visible", timeout: 10_000 });
  await modeToggle.click();
  await page.waitForTimeout(1_000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));

  battleTab = page.getByTestId("student-dashboard-tab-battle");
  if (await battleTab.count()) {
    await battleTab.first().click();
    return;
  }

  const roleTab = page.getByRole("tab", { name: /ต่อสู้|Fight/i }).first();
  if (await roleTab.count()) {
    await roleTab.click();
    return;
  }

  const availableTestIds = await page.locator("[data-testid^='student-dashboard-tab-']").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-testid"))
  );
  throw new Error(`Battle tab was not rendered. Available dashboard tabs: ${availableTestIds.join(", ") || "(none)"}`);
}

async function main() {
  const args = parseArgs();
  let serverProcess = null;

  if (args.spawnServer) {
    const port = new URL(args.baseUrl).port || "3000";
    serverProcess = spawn(
      "powershell.exe",
      ["-NoProfile", "-Command", `$env:PORT='${port}'; npm.cmd run start`],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      }
    );
    await waitForBaseUrl(args.baseUrl, 30_000);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: args.baseUrl });
  const page = await context.newPage();
  const steps = [];
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  try {
    const startRequestPromise = page.waitForRequest((request) =>
      request.method() === "POST" &&
      request.url().includes(`/api/classrooms/${DEFAULTS.classId}/battle/v4/start`)
    );
    const startResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/classrooms/${DEFAULTS.classId}/battle/v4/start`)
    );

    await page.goto(`/qa/negamon-battle-v4`, { waitUntil: "networkidle" });
    steps.push({ step: "open_qa_harness", url: page.url() });
    await page.getByText(/Negamon Duel/i).waitFor({ timeout: 15_000 });
    steps.push({ step: "battle_tab_ready" });

    const startRequest = await startRequestPromise;
    const startResponse = await startResponsePromise;
    const startPayload = await startResponse.json();
    const startBody = startRequest.postDataJSON();

    if (!startPayload?.sessionId || !startPayload?.choiceRequestId || !Array.isArray(startPayload?.validChoices)) {
      throw new Error(`Unexpected battle start payload: ${JSON.stringify(startPayload)}`);
    }

    const chosenMove = startPayload.validChoices.find((choice) => choice.enabled && choice.moveId);
    if (!chosenMove) {
      throw new Error("No enabled move found in start payload");
    }

    steps.push({
      step: "battle_started",
      sessionId: startPayload.sessionId,
      choiceRequestId: startPayload.choiceRequestId,
      moveId: chosenMove.moveId,
      moveSlot: chosenMove.moveSlot ?? null,
      turn: startPayload.state?.turn ?? null,
    });

    const beforeUrl = page.url();
    const beforeNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);

    const outOfBandResponse = await page.request.post(
      `${args.baseUrl}/api/classrooms/${DEFAULTS.classId}/battle/v4/choice`,
      {
        data: {
          challengerId: startBody.challengerId,
          defenderId: startBody.defenderId,
          studentCode: startBody.studentCode ?? DEFAULTS.studentCode,
          sessionId: startPayload.sessionId,
          choiceRequestId: startPayload.choiceRequestId,
          moveId: chosenMove.moveId,
          moveSlot: chosenMove.moveSlot,
        },
      }
    );

    if (!outOfBandResponse.ok()) {
      throw new Error(`Out-of-band choice failed with ${outOfBandResponse.status()}: ${await outOfBandResponse.text()}`);
    }

    const turnAfterServerAdvance = (startPayload.state?.turn ?? 1) + 1;
    const staleRecoveryResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/classrooms/${DEFAULTS.classId}/battle/v4/choice`) &&
      response.status() === 409
    );
    const resyncResponse = page.waitForResponse((response) =>
      response.request().method() === "GET" &&
      response.url().includes(`/api/classrooms/${DEFAULTS.classId}/battle/v4/session?`)
    );

    const choiceButton = page.locator("button").filter({ hasText: new RegExp(escapeRegExp(chosenMove.label), "i") }).first();
    await choiceButton.click();

    await staleRecoveryResponse;
    await resyncResponse;

    await page.getByText(new RegExp(`Turn\\s+${turnAfterServerAdvance}\\b`, "i")).waitFor({ timeout: 10_000 });

    const afterUrl = page.url();
    const afterNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);
    const activeMoveButtons = await page.locator("button").filter({ hasText: /EN|PP|โจมตีธรรมดา|โจมตี|Slash|Snap|Knuckle|Bite|Glow|Tax|Rush|Break/i }).count();

    if (afterUrl !== beforeUrl) {
      throw new Error(`Battle UI changed URL during stale recovery: ${beforeUrl} -> ${afterUrl}`);
    }
    if (afterNavigationCount !== beforeNavigationCount) {
      throw new Error(`Battle UI performed a full navigation during stale recovery: ${beforeNavigationCount} -> ${afterNavigationCount}`);
    }
    if (activeMoveButtons <= 0) {
      throw new Error("Battle UI did not recover actionable move buttons after stale-choice resync");
    }

    steps.push({
      step: "stale_choice_recovered",
      turnAfterServerAdvance,
      url: afterUrl,
      navigationEntries: afterNavigationCount,
      activeMoveButtons,
      staleErrorVisible: true,
    });

    console.log(JSON.stringify({ ok: true, steps }, null, 2));
  } catch (error) {
    steps.push({
      step: "error",
      url: page.url(),
      message: error instanceof Error ? error.message : String(error),
      consoleErrors,
      body: (await page.locator("body").innerText().catch(() => Promise.resolve(""))).slice(0, 2000),
    });
    console.log(JSON.stringify({ ok: false, steps }, null, 2));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
    if (serverProcess && serverProcess.pid) {
      spawnSync("taskkill", ["/PID", String(serverProcess.pid), "/T", "/F"], { stdio: "ignore" });
    }
  }
}

await main();
