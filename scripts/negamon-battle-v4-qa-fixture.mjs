import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const DEFAULTS = {
  baseUrl: "http://localhost:3000",
  classId: "6a12ee29a5e71c6c01a33947",
  challengerCode: "WUQADJEJY72J",
  defenderCode: "7FUM5RLTLA4C",
  challengerSpecies: "terranoir",
  defenderSpecies: "pyronox",
  maxPoints: 10000,
  seed: 3939001,
};

const SPECIES_SKILLS = {
  pyronox: ["basic-attack", "pyronox-ember-fang", "pyronox-war-cry", "pyronox-hell-dive"],
  aerolisk: ["basic-attack", "aerolisk-gale-cut", "aerolisk-tail-rush", "aerolisk-skybreaker"],
  terranoir: ["basic-attack", "terranoir-grave-slam", "terranoir-bastion-hide", "terranoir-catacomb-crush"],
  lumilune: ["basic-attack", "lumilune-moon-splash", "lumilune-soft-glow", "lumilune-tidal-mercy"],
  voltshade: ["basic-attack", "voltshade-static-bite", "voltshade-chain-shock", "voltshade-night-signal"],
  tidemaw: ["basic-attack", "tidemaw-riptide-jaw", "tidemaw-deep-feast", "tidemaw-reef-guard"],
};

const SPECIES_MAX_LEVEL_TEST_LOADOUT = {
  terranoir: ["basic-attack", "terranoir-grave-slam", "terranoir-bastion-hide", "terranoir-catacomb-crush"],
  pyronox: ["basic-attack", "pyronox-ember-fang", "pyronox-war-cry", "pyronox-hell-dive"],
};

function parseArgs() {
  const args = { ...DEFAULTS, allowRemote: false };
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "allow-remote") args.allowRemote = true;
    if (key === "base-url" && value) args.baseUrl = value;
    if (key === "class-id" && value) args.classId = value;
    if (key === "challenger-code" && value) args.challengerCode = value;
    if (key === "defender-code" && value) args.defenderCode = value;
    if (key === "challenger-species" && value) args.challengerSpecies = value;
    if (key === "defender-species" && value) args.defenderSpecies = value;
    if (key === "max-points" && value) args.maxPoints = Number(value);
    if (key === "seed" && value) args.seed = Number(value);
  }
  return args;
}

function assertLocalDatabase(allowRemote) {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (allowRemote) return;
  if (!/localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error("Refusing to mutate a non-local DATABASE_URL. Pass --allow-remote only for an intentional staging fixture.");
  }
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function getNegamonSettings(gamifiedSettings) {
  if (!gamifiedSettings || typeof gamifiedSettings !== "object") return null;
  const settings = gamifiedSettings.negamon;
  return settings && typeof settings === "object" ? settings : null;
}

function withFixtureNegamonSettings(gamifiedSettings, input) {
  const next = cloneJson(gamifiedSettings) ?? {};
  const current = getNegamonSettings(next) ?? {};
  next.negamon = {
    ...current,
    enabled: true,
    studentMonsters: {
      ...(current.studentMonsters ?? {}),
      [input.challengerId]: input.challengerSpecies,
      [input.defenderId]: input.defenderSpecies,
    },
  };
  return next;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { ok: response.ok, status: response.status, data };
}

function fighterSummary(fighter) {
  return {
    id: fighter?.id,
    name: fighter?.name,
    speciesId: fighter?.speciesId,
    level: fighter?.level,
    hp: `${fighter?.hp}/${fighter?.maxHp}`,
    energy: `${fighter?.energy}/${fighter?.maxEnergy}`,
    speed: fighter?.speed,
    statSnapshot: fighter?.statSnapshot,
    types: fighter?.types,
    moves: fighter?.moveIds,
    statuses: fighter?.statusIds,
  };
}

function choiceSummary(choice) {
  return {
    slot: choice.moveSlot,
    moveId: choice.moveId,
    label: choice.label,
    enabled: choice.enabled,
    reason: choice.reason ?? null,
    cost: choice.cost ?? null,
  };
}

function formulaSummary(entry) {
  return {
    slot: entry.moveSlot,
    moveId: entry.moveId,
    power: entry.formulaInput?.power,
    category: entry.formulaInput?.category,
    type: entry.formulaInput?.moveType,
    typeMultiplier: entry.result?.typeMultiplier,
    stab: entry.result?.stab,
    damage: entry.result?.damage,
    rawDamage: Math.round((entry.result?.rawDamage ?? 0) * 100) / 100,
    capped: entry.result?.capped,
  };
}

function printStateSummary(label, body) {
  const state = body.state;
  console.log(`\n=== ${label} ===`);
  console.log("sessionId:", body.sessionId ?? state?.battleId ?? "(none)");
  console.log("choiceRequestId:", body.choiceRequestId ?? state?.choiceRequestId ?? "(none)");
  console.log("phase:", state?.phase, "turn:", state?.turn, "stateVersion:", state?.stateVersion);
  console.log("player:", JSON.stringify(fighterSummary(state?.sides?.player), null, 2));
  console.log("opponent:", JSON.stringify(fighterSummary(state?.sides?.opponent), null, 2));
  console.log("player choices:", JSON.stringify((body.validChoices ?? state?.choices?.player ?? []).map(choiceSummary), null, 2));
  console.log("last events:", JSON.stringify((state?.events ?? []).slice(-5), null, 2));
  const p1Team = state?.metadata?.showdown?.p1Team;
  const p2Team = state?.metadata?.showdown?.p2Team;
  if (p1Team || p2Team) {
    console.log("showdown p1Team:", JSON.stringify(p1Team, null, 2));
    console.log("showdown p2Team:", JSON.stringify(p2Team, null, 2));
  }
  const formula = state?.metadata?.negamonFormula;
  if (formula) {
    console.log("formula decision:", JSON.stringify({
      resolverDecision: formula.resolverDecision,
      sameTypeAttackBonus: formula.sameTypeAttackBonus,
      criticalMode: formula.criticalMode,
      randomMultiplier: formula.randomMultiplier,
      maxBurstTargetHpRatio: formula.maxBurstTargetHpRatio,
    }, null, 2));
    console.log("player formula expectations:", JSON.stringify((formula.expectations?.player ?? []).map(formulaSummary), null, 2));
  }
}

function expectedStartStateSummary(body) {
  const state = body.state;
  const player = state?.sides?.player;
  const opponent = state?.sides?.opponent;
  const playerChoices = body.validChoices ?? state?.choices?.player ?? [];
  return {
    seed: state?.seed,
    phase: state?.phase,
    turn: state?.turn,
    player: {
      speciesId: player?.speciesId,
      level: player?.level,
      hp: player?.maxHp,
      speed: player?.speed,
      types: player?.types,
      skillSlots: player?.moveIds,
      energy: player?.maxEnergy,
    },
    opponent: {
      speciesId: opponent?.speciesId,
      level: opponent?.level,
      hp: opponent?.maxHp,
      speed: opponent?.speed,
      types: opponent?.types,
      skillSlots: opponent?.moveIds,
      energy: opponent?.maxEnergy,
    },
    choices: playerChoices.map((choice) => ({
      slot: choice.moveSlot,
      moveId: choice.moveId,
      energy: choice.cost?.energy ?? null,
      pp: choice.cost?.pp ?? null,
      enabled: choice.enabled,
    })),
    formulaExpectations: (state?.metadata?.negamonFormula?.expectations?.player ?? []).map(formulaSummary),
  };
}

function assertStartState(body, input) {
  const summary = expectedStartStateSummary(body);
  const failures = [];
  if (summary.seed !== input.seed) failures.push(`seed expected ${input.seed}, got ${summary.seed}`);
  if (summary.phase !== "choosing") failures.push(`phase expected choosing, got ${summary.phase}`);
  if (summary.turn !== 1) failures.push(`turn expected 1, got ${summary.turn}`);
  if (summary.player.speciesId !== input.challengerSpecies) {
    failures.push(`player species expected ${input.challengerSpecies}, got ${summary.player.speciesId}`);
  }
  if (summary.opponent.speciesId !== input.defenderSpecies) {
    failures.push(`opponent species expected ${input.defenderSpecies}, got ${summary.opponent.speciesId}`);
  }
  if (summary.player.level !== 60) failures.push(`player level expected 60, got ${summary.player.level}`);
  if (summary.opponent.level !== 60) failures.push(`opponent level expected 60, got ${summary.opponent.level}`);
  if (!Array.isArray(summary.player.types) || summary.player.types.length === 0) failures.push("player types missing");
  if (!Array.isArray(summary.opponent.types) || summary.opponent.types.length === 0) failures.push("opponent types missing");
  if (!Array.isArray(summary.player.skillSlots) || summary.player.skillSlots.length === 0) failures.push("player skill slots missing");
  if (!Array.isArray(summary.opponent.skillSlots) || summary.opponent.skillSlots.length === 0) failures.push("opponent skill slots missing");
  if (!Number.isFinite(summary.player.hp) || summary.player.hp <= 0) failures.push(`player HP invalid: ${summary.player.hp}`);
  if (!Number.isFinite(summary.opponent.hp) || summary.opponent.hp <= 0) failures.push(`opponent HP invalid: ${summary.opponent.hp}`);
  if (!Number.isFinite(summary.player.speed) || summary.player.speed <= 0) failures.push(`player speed invalid: ${summary.player.speed}`);
  if (!Number.isFinite(summary.opponent.speed) || summary.opponent.speed <= 0) failures.push(`opponent speed invalid: ${summary.opponent.speed}`);
  if (!Number.isFinite(summary.player.energy) || summary.player.energy <= 0) failures.push(`player energy invalid: ${summary.player.energy}`);
  if (!Number.isFinite(summary.opponent.energy) || summary.opponent.energy <= 0) failures.push(`opponent energy invalid: ${summary.opponent.energy}`);
  if (!Array.isArray(summary.choices) || summary.choices.length === 0) failures.push("player choices missing");
  if (!Array.isArray(summary.formulaExpectations) || summary.formulaExpectations.length === 0) failures.push("formula expectations missing");
  for (const choice of summary.choices) {
    if (!Number.isFinite(choice.energy)) failures.push(`choice ${choice.moveId} energy missing`);
    if (!Number.isFinite(choice.pp)) failures.push(`choice ${choice.moveId} pp missing`);
  }
  for (const entry of summary.formulaExpectations) {
    if (!Number.isFinite(entry.damage)) failures.push(`formula ${entry.moveId} damage missing`);
    if (!Number.isFinite(entry.typeMultiplier)) failures.push(`formula ${entry.moveId} type multiplier missing`);
  }

  console.log("\nExpected start-state fields:");
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length > 0) {
    throw new Error(`Start-state assertion failed:\n- ${failures.join("\n- ")}`);
  }
}

async function main() {
  const args = parseArgs();
  assertLocalDatabase(args.allowRemote);

  const prisma = new PrismaClient();
  const createdSessionIds = new Set();
  let classroomBackup = null;
  let challengerBackup = null;
  let defenderBackup = null;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: args.classId },
      select: { id: true, gamifiedSettings: true },
    });
    if (!classroom) throw new Error(`Classroom not found: ${args.classId}`);

    const students = await prisma.student.findMany({
      where: {
        classId: args.classId,
        loginCode: { in: [args.challengerCode, args.defenderCode] },
      },
      select: {
        id: true,
        name: true,
        loginCode: true,
        behaviorPoints: true,
        inventory: true,
        battleLoadout: true,
        negamonSkills: true,
      },
    });
    const challenger = students.find((student) => student.loginCode === args.challengerCode);
    const defender = students.find((student) => student.loginCode === args.defenderCode);
    if (!challenger) throw new Error(`Challenger student not found: ${args.challengerCode}`);
    if (!defender) throw new Error(`Defender student not found: ${args.defenderCode}`);
    if (challenger.id === defender.id) throw new Error("Challenger and defender must be different students.");

    classroomBackup = { id: classroom.id, gamifiedSettings: cloneJson(classroom.gamifiedSettings) };
    challengerBackup = cloneJson(challenger);
    defenderBackup = cloneJson(defender);

    const challengerSkills = SPECIES_SKILLS[args.challengerSpecies];
    const defenderSkills = SPECIES_SKILLS[args.defenderSpecies];
    if (!challengerSkills) throw new Error(`No fixture skills for species: ${args.challengerSpecies}`);
    if (!defenderSkills) throw new Error(`No fixture skills for species: ${args.defenderSpecies}`);
    const challengerSkillLoadout = SPECIES_MAX_LEVEL_TEST_LOADOUT[args.challengerSpecies] ?? challengerSkills.slice(0, 4);
    const defenderSkillLoadout = SPECIES_MAX_LEVEL_TEST_LOADOUT[args.defenderSpecies] ?? defenderSkills.slice(0, 4);

    await prisma.classroom.update({
      where: { id: classroom.id },
      data: {
        gamifiedSettings: withFixtureNegamonSettings(classroom.gamifiedSettings, {
          challengerId: challenger.id,
          defenderId: defender.id,
          challengerSpecies: args.challengerSpecies,
          defenderSpecies: args.defenderSpecies,
        }),
      },
    });
    await prisma.student.update({
      where: { id: challenger.id },
      data: {
        behaviorPoints: args.maxPoints,
        negamonSkills: challengerSkills,
        negamonSkillLoadout: challengerSkillLoadout,
      },
    });
    await prisma.student.update({
      where: { id: defender.id },
      data: {
        behaviorPoints: args.maxPoints,
        negamonSkills: defenderSkills,
        negamonSkillLoadout: defenderSkillLoadout,
      },
    });

    console.log("Negamon Battle V4 QA fixture prepared.");
    console.log("classId:", args.classId);
    console.log("challenger:", challenger.name, challenger.id, args.challengerSpecies);
    console.log("defender:", defender.name, defender.id, args.defenderSpecies);

    const startUrl = `${args.baseUrl}/api/classrooms/${args.classId}/battle/v4/start`;
    const choiceUrl = `${args.baseUrl}/api/classrooms/${args.classId}/battle/v4/choice`;
    const startBody = {
      challengerId: challenger.id,
      defenderId: defender.id,
      studentCode: args.challengerCode,
      seed: args.seed,
    };

    const initial = await postJson(startUrl, startBody);
    if (!initial.ok) {
      throw new Error(`Start route failed (${initial.status}): ${JSON.stringify(initial.data)}`);
    }
    if (initial.data.sessionId) createdSessionIds.add(initial.data.sessionId);
    printStateSummary("Initial V4 battle state", initial.data);
    assertStartState(initial.data, {
      seed: args.seed,
      challengerSpecies: args.challengerSpecies,
      defenderSpecies: args.defenderSpecies,
    });

    const initialChoices = (initial.data.validChoices ?? []).filter((choice) => choice.enabled && choice.kind === "move");
    for (const choice of initialChoices) {
      const fresh = await postJson(startUrl, startBody);
      if (!fresh.ok) {
        console.warn(`Skipping slot ${choice.moveSlot}: fresh start failed (${fresh.status})`, fresh.data);
        continue;
      }
      if (fresh.data.sessionId) createdSessionIds.add(fresh.data.sessionId);

      const matchingChoice = (fresh.data.validChoices ?? []).find((entry) => entry.moveSlot === choice.moveSlot);
      if (!matchingChoice?.enabled) {
        console.warn(`Skipping slot ${choice.moveSlot}: choice is not enabled on fresh session.`);
        continue;
      }

      const beforePlayerHp = fresh.data.state?.sides?.player?.hp;
      const beforeOpponentHp = fresh.data.state?.sides?.opponent?.hp;
      const resolved = await postJson(choiceUrl, {
        ...startBody,
        sessionId: fresh.data.sessionId,
        choiceRequestId: fresh.data.choiceRequestId,
        moveId: matchingChoice.moveId,
        moveSlot: matchingChoice.moveSlot,
      });
      if (!resolved.ok) {
        console.warn(`Choice slot ${choice.moveSlot} failed (${resolved.status})`, resolved.data);
        continue;
      }

      const afterPlayerHp = resolved.data.state?.sides?.player?.hp;
      const afterOpponentHp = resolved.data.state?.sides?.opponent?.hp;
      console.log(`\n--- Move slot ${choice.moveSlot}: ${matchingChoice.moveId} ---`);
      console.log("player HP delta:", beforePlayerHp, "->", afterPlayerHp);
      console.log("opponent HP delta:", beforeOpponentHp, "->", afterOpponentHp);
      console.log("events:", JSON.stringify((resolved.data.state?.events ?? []).slice(-6), null, 2));
      console.log("next choices:", JSON.stringify((resolved.data.validChoices ?? []).map(choiceSummary), null, 2));
    }

    console.log("\nQA fixture completed. Restoring local DB fixture data...");
  } finally {
    if (createdSessionIds.size > 0) {
      await prisma.battleSession.deleteMany({
        where: { id: { in: [...createdSessionIds] } },
      });
    }
    if (classroomBackup) {
      await prisma.classroom.update({
        where: { id: classroomBackup.id },
        data: { gamifiedSettings: classroomBackup.gamifiedSettings },
      });
    }
    if (challengerBackup) {
      await prisma.student.update({
        where: { id: challengerBackup.id },
        data: {
          behaviorPoints: challengerBackup.behaviorPoints,
          inventory: challengerBackup.inventory,
          battleLoadout: challengerBackup.battleLoadout,
          negamonSkills: challengerBackup.negamonSkills,
        },
      });
    }
    if (defenderBackup) {
      await prisma.student.update({
        where: { id: defenderBackup.id },
        data: {
          behaviorPoints: defenderBackup.behaviorPoints,
          inventory: defenderBackup.inventory,
          battleLoadout: defenderBackup.battleLoadout,
          negamonSkills: defenderBackup.negamonSkills,
        },
      });
    }
    await prisma.$disconnect();
    console.log("Local DB fixture data restored.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
