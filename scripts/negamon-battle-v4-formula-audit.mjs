import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const DEFAULTS = {
  baseUrl: "http://localhost:3000",
  classId: "6a12ee29a5e71c6c01a33947",
  challengerCode: "WUQADJEJY72J",
  defenderCode: "7FUM5RLTLA4C",
  maxTurns: 6,
};

function parseArgs() {
  const args = { ...DEFAULTS };
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "base-url" && value) args.baseUrl = value;
    if (key === "class-id" && value) args.classId = value;
    if (key === "challenger-code" && value) args.challengerCode = value;
    if (key === "defender-code" && value) args.defenderCode = value;
    if (key === "max-turns" && value) args.maxTurns = Number(value);
  }
  return args;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    data: text ? JSON.parse(text) : {},
  };
}

function chooseAction(validChoices) {
  const enabled = (validChoices ?? []).filter((choice) => choice.enabled);
  const preferred = enabled.find((choice) => choice.moveId && !String(choice.moveId).includes("basic-attack"));
  return preferred ?? enabled[0] ?? null;
}

function extractResourceSnapshot(state, side) {
  const fighter = state?.sides?.[side];
  const resources = state?.metadata?.resources?.[side];
  return {
    hp: fighter?.hp ?? null,
    maxHp: fighter?.maxHp ?? null,
    energy: fighter?.energy ?? null,
    maxEnergy: fighter?.maxEnergy ?? null,
    speed: fighter?.speed ?? null,
    ppByMoveId: resources?.ppByMoveId ?? {},
    cooldownByMoveId: resources?.cooldownByMoveId ?? {},
  };
}

function createTurnAudit(input) {
  const { beforeState, afterState, chosenMoveId } = input;
  const beforePlayer = extractResourceSnapshot(beforeState, "player");
  const afterPlayer = extractResourceSnapshot(afterState, "player");
  const beforeOpponent = extractResourceSnapshot(beforeState, "opponent");
  const afterOpponent = extractResourceSnapshot(afterState, "opponent");
  const expectation = (beforeState?.metadata?.negamonFormula?.expectations?.player ?? []).find(
    (entry) => entry.moveId === chosenMoveId
  );
  const lastEvents = (afterState?.events ?? []).slice(-6);
  const anomalies = [];

  if (beforePlayer.energy != null && afterPlayer.energy != null && afterPlayer.energy > beforePlayer.energy && beforeState?.phase !== "ended") {
    anomalies.push(`player energy increased unexpectedly on move ${chosenMoveId}`);
  }
  if (
    beforePlayer.ppByMoveId?.[chosenMoveId] != null &&
    afterPlayer.ppByMoveId?.[chosenMoveId] != null &&
    afterPlayer.ppByMoveId[chosenMoveId] > beforePlayer.ppByMoveId[chosenMoveId]
  ) {
    anomalies.push(`PP increased unexpectedly for ${chosenMoveId}`);
  }
  if (expectation?.result?.damage != null && beforeOpponent.hp != null && afterOpponent.hp != null) {
    const observedDamage = Math.max(0, beforeOpponent.hp - afterOpponent.hp);
    if (observedDamage === 0 && expectation.result.damage > 0) {
      anomalies.push(`expected damage for ${chosenMoveId} was ${expectation.result.damage} but observed 0`);
    }
  }
  if (lastEvents.length === 0) {
    anomalies.push(`no battle events recorded for move ${chosenMoveId}`);
  }

  return {
    moveId: chosenMoveId,
    expected: expectation
      ? {
          power: expectation.formulaInput?.power ?? null,
          typeMultiplier: expectation.result?.typeMultiplier ?? null,
          damage: expectation.result?.damage ?? null,
          category: expectation.formulaInput?.category ?? null,
        }
      : null,
    observed: {
      opponentHpBefore: beforeOpponent.hp,
      opponentHpAfter: afterOpponent.hp,
      playerEnergyBefore: beforePlayer.energy,
      playerEnergyAfter: afterPlayer.energy,
      playerPpBefore: beforePlayer.ppByMoveId?.[chosenMoveId] ?? null,
      playerPpAfter: afterPlayer.ppByMoveId?.[chosenMoveId] ?? null,
      playerCooldownAfter: afterPlayer.cooldownByMoveId?.[chosenMoveId] ?? null,
      events: lastEvents,
    },
    anomalies,
  };
}

async function main() {
  const args = parseArgs();
  const prisma = new PrismaClient();
  try {
    const students = await prisma.student.findMany({
      where: {
        classId: args.classId,
        loginCode: { in: [args.challengerCode, args.defenderCode] },
      },
      select: { id: true, loginCode: true, name: true },
    });
    const challenger = students.find((student) => student.loginCode === args.challengerCode);
    const defender = students.find((student) => student.loginCode === args.defenderCode);
    if (!challenger || !defender) {
      throw new Error("Could not resolve fixture students from login codes");
    }

    const start = await postJson(`${args.baseUrl}/api/classrooms/${args.classId}/battle/v4/start`, {
      challengerId: challenger.id,
      defenderId: defender.id,
      studentCode: args.challengerCode,
      seed: 3939001,
    });
    if (!start.ok) {
      throw new Error(`battle start failed: ${start.status} ${JSON.stringify(start.data)}`);
    }

    const audits = [];
    let current = start.data;
    for (let i = 0; i < args.maxTurns; i += 1) {
      if (current.state?.phase === "ended" || current.final?.winnerId) break;
      const action = chooseAction(current.validChoices);
      if (!action) {
        audits.push({ moveId: null, expected: null, observed: null, anomalies: ["no enabled moves available"] });
        break;
      }

      const beforeState = current.state;
      const turn = await postJson(`${args.baseUrl}/api/classrooms/${args.classId}/battle/v4/choice`, {
        challengerId: challenger.id,
        defenderId: defender.id,
        studentCode: args.challengerCode,
        sessionId: current.sessionId,
        choiceRequestId: current.choiceRequestId,
        moveId: action.moveId,
        moveSlot: action.moveSlot,
      });
      if (!turn.ok) {
        audits.push({
          moveId: action.moveId,
          expected: null,
          observed: turn.data,
          anomalies: [`choice failed: ${turn.status} ${turn.data?.error ?? "UNKNOWN"}`],
        });
        break;
      }
      current = { ...turn.data, sessionId: current.sessionId };
      audits.push(
        createTurnAudit({
          beforeState,
          afterState: current.state,
          chosenMoveId: action.moveId,
        })
      );
    }

    const summary = {
      ok: current.state?.phase === "ended" || Boolean(current.final?.winnerId),
      sessionId: current.sessionId ?? start.data.sessionId ?? null,
      startState: {
        player: extractResourceSnapshot(start.data.state, "player"),
        opponent: extractResourceSnapshot(start.data.state, "opponent"),
      },
      final: current.final ?? null,
      audits,
      correctnessAnomalies: audits.flatMap((audit) => audit.anomalies),
      balanceNotes: audits
        .filter((audit) => audit.expected?.damage != null && audit.observed?.opponentHpBefore != null && audit.observed?.opponentHpAfter != null)
        .map((audit) => {
          const observedDamage = Math.max(0, (audit.observed.opponentHpBefore ?? 0) - (audit.observed.opponentHpAfter ?? 0));
          return {
            moveId: audit.moveId,
            expectedDamage: audit.expected.damage,
            observedDamage,
            typeMultiplier: audit.expected.typeMultiplier,
          };
        }),
    };

    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
