import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";

const DEFAULTS = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  maxTurns: 20,
  spawnServer: false,
};

function parseArgs() {
  const args = { ...DEFAULTS };
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    if (key === "base-url" && value) args.baseUrl = value;
    if (key === "max-turns" && value) args.maxTurns = Number(value);
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
      if ([200, 307, 308].includes(response.status)) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function chooseAction(validChoices) {
  const enabled = (validChoices ?? []).filter((choice) => choice.enabled);
  if (enabled.length === 0) return null;
  const finisher = enabled.find((choice) => choice.moveId && !String(choice.moveId).includes("basic-attack") && choice.label);
  return finisher ?? enabled[0];
}

async function chooseActionFromDom(page) {
  const buttons = page.locator("button").filter({ hasText: /PP|EN|Slot/i });
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isDisabled()) continue;
    const text = await button.innerText();
    if (!/โจมตีธรรมดา/i.test(text)) {
      return { label: text.split("\n")[0]?.trim() ?? text.trim() };
    }
  }
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isDisabled()) continue;
    const text = await button.innerText();
    return { label: text.split("\n")[0]?.trim() ?? text.trim() };
  }
  return null;
}

async function clickChoiceButton(page, choice) {
  const button = page
    .locator("button")
    .filter({ hasText: new RegExp(escapeRegExp(choice.label), "i") })
    .first();
  await button.click();
}

async function main() {
  const args = parseArgs();
  let serverProcess = null;

  if (args.spawnServer) {
    const port = new URL(args.baseUrl).port || "3000";
    serverProcess = spawn(
      "cmd.exe",
      ["/c", `set PORT=${port}&& npm.cmd run start`],
      {
        cwd: process.cwd(),
        stdio: "ignore",
        detached: true,
        windowsHide: true,
      }
    );
    serverProcess.unref();
    await waitForBaseUrl(args.baseUrl, 30_000);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: args.baseUrl });
  const page = await context.newPage();
  const steps = [];
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  try {
    await page.goto("/qa/negamon-battle-v4", { waitUntil: "networkidle" });
    steps.push({ step: "open_qa_harness", url: page.url() });

    const startPayload =
      (await page
        .evaluate(() => window.__NEGAMON_BATTLE_V4_QA__ ?? null)
        .catch(() => null)) ??
      (await page
        .waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/battle/v4/start"), {
          timeout: 8_000,
        })
        .then((response) => response.json())
        .catch(() => null));

    let current = startPayload?.state && startPayload?.choiceRequestId ? startPayload : null;
    const beforeUrl = page.url();
    const beforeNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);
    steps.push({
      step: "battle_started",
      source: current ? "serialized_session" : "dom_only",
      sessionId: current?.sessionId ?? null,
      turn: current?.state?.turn ?? null,
      player: current?.state
        ? {
            hp: `${current.state.sides.player.hp}/${current.state.sides.player.maxHp}`,
            energy: `${current.state.sides.player.energy}/${current.state.sides.player.maxEnergy}`,
          }
        : null,
      opponent: current?.state
        ? {
            hp: `${current.state.sides.opponent.hp}/${current.state.sides.opponent.maxHp}`,
            energy: `${current.state.sides.opponent.energy}/${current.state.sides.opponent.maxEnergy}`,
          }
        : null,
    });

    for (let turnIndex = 0; turnIndex < args.maxTurns; turnIndex += 1) {
      if (current?.state?.phase === "ended" || current?.final?.winnerId) break;
      const action = current?.validChoices ? chooseAction(current.validChoices) : await chooseActionFromDom(page);
      if (!action) {
        throw new Error(`No enabled choices remained at turn ${current?.state?.turn ?? "?"}`);
      }

      const choiceResponsePromise = page.waitForResponse((response) =>
        response.request().method() === "POST" &&
        response.url().includes("/battle/v4/choice")
      );
      await clickChoiceButton(page, action);
      const choiceResponse = await choiceResponsePromise;
      const data = await choiceResponse.json();

      if (choiceResponse.status() === 409 && data?.error === "STALE_CHOICE") {
        const resyncResponse = await page.waitForResponse((response) =>
          response.request().method() === "GET" &&
          response.url().includes("/battle/v4/session?")
        );
        current = await resyncResponse.json();
        steps.push({
          step: "stale_choice_recovered",
          turn: current.state?.turn ?? null,
          choiceRequestId: current.choiceRequestId ?? null,
        });
        continue;
      }

      if (!choiceResponse.ok()) {
        throw new Error(`Choice route failed with ${choiceResponse.status()}: ${JSON.stringify(data)}`);
      }

      current = data;
      steps.push({
        step: "turn_resolved",
        turn: current.state?.turn ?? null,
        phase: current.state?.phase ?? null,
        move: action.moveId,
        player: {
          hp: `${current.state?.sides?.player?.hp}/${current.state?.sides?.player?.maxHp}`,
          energy: `${current.state?.sides?.player?.energy}/${current.state?.sides?.player?.maxEnergy}`,
        },
        opponent: {
          hp: `${current.state?.sides?.opponent?.hp}/${current.state?.sides?.opponent?.maxHp}`,
          energy: `${current.state?.sides?.opponent?.energy}/${current.state?.sides?.opponent?.maxEnergy}`,
        },
        final: current.final ?? null,
      });
    }

    const afterUrl = page.url();
    const afterNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);
    if (afterUrl !== beforeUrl) {
      throw new Error(`Battle UI changed URL during full QA: ${beforeUrl} -> ${afterUrl}`);
    }
    if (afterNavigationCount !== beforeNavigationCount) {
      throw new Error(`Battle UI performed full navigation during full QA: ${beforeNavigationCount} -> ${afterNavigationCount}`);
    }

    if (!(current.state?.phase === "ended" || current.final?.winnerId)) {
      throw new Error(`Battle did not finish within ${args.maxTurns} turns`);
    }

    if (!current.final?.winnerId) {
      throw new Error("Battle ended without final winner payload");
    }

    steps.push({
      step: "battle_finished",
      turn: current.state?.turn ?? null,
      winnerId: current.final.winnerId,
      requestedGoldReward: current.final.requestedGoldReward ?? null,
      goldReward: current.final.goldReward ?? null,
      rewardBlockedReason: current.final.rewardBlockedReason ?? null,
      progression: current.final.progression ?? null,
    });

    console.log(JSON.stringify({ ok: true, steps }, null, 2));
  } catch (error) {
    steps.push({
      step: "error",
      url: page.url(),
      message: error instanceof Error ? error.message : String(error),
      consoleErrors,
      body: (await page.locator("body").innerText().catch(() => Promise.resolve(""))).slice(0, 4000),
    });
    console.log(JSON.stringify({ ok: false, steps }, null, 2));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
    if (serverProcess?.pid) {
      spawnSync("taskkill", ["/PID", String(serverProcess.pid), "/T", "/F"], { stdio: "ignore" });
    }
  }
}

await main();
process.exit(process.exitCode ?? 0);
