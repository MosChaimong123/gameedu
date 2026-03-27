import { describe, it, expect } from "vitest";

import { BattleTurnEngine } from "../../../lib/game-engine/battle-turn-engine";
import type { BattlePlayer, BossState, GameSettings } from "../../../lib/types/game";

type EmittedRecord = {
  room: string;
  event: string;
  payload: any;
};

function createMockIO() {
  const emitted: EmittedRecord[] = [];
  return {
    emitted,
    to(room: string) {
      return {
        emit(event: string, payload: any) {
          emitted.push({ room, event, payload });
        },
      };
    },
  };
}

function createMockSocket(id: string) {
  const emitted: Array<{ event: string; payload: any }> = [];
  return {
    id,
    emitted,
    emit(event: string, payload: any) {
      emitted.push({ event, payload });
    },
  };
}

function makePlayer(id: string, studentId = "student-1"): BattlePlayer {
  return {
    id,
    name: "Tester",
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    hp: 100,
    maxHp: 100,
    ap: 50,
    maxAp: 100,
    stamina: 50,
    maxStamina: 100,
    mp: 40,
    maxMp: 50,
    atk: 30,
    def: 10,
    spd: 10,
    crit: 0,
    luck: 0,
    mag: 20,
    level: 1,
    jobClass: null,
    jobTier: "BASE",
    skills: ["mage_fireball"],
    isDefending: false,
    wave: 1,
    soloMonster: null,
    studentId,
    immortalUsed: false,
    hasLifesteal: false,
    hasImmortal: false,
    hasManaFlow: false,
    hasTimeWarp: false,
    hasToughSkin: false,
    hasTitanWill: false,
    hasHolyFury: false,
    hasArcaneSurge: false,
    hasDarkPact: false,
    hasHawkEye: false,
    hasShadowVeil: false,
    hasGodBlessing: false,
    hasLuckyStrike: false,
    chainLightningOnCrit: false,
    hasBerserkerRage: false,
    hasBattleFocus: false,
    hasEchoStrike: false,
    hasDragonBlood: false,
    hasCelestialGrace: false,
    hasVoidWalker: false,
    hasSoulEater: false,
    dodgeChance: 0,
    shadowVeilCritBuff: false,
    goldMultiplier: 0,
    xpMultiplier: 0,
    bossDamageMultiplier: 0,
    earnedGold: 0,
    earnedXp: 0,
    itemDrops: [],
    materialDrops: [],
    statusEffects: [],
  };
}

function makeBoss(): BossState {
  return {
    id: "boss-1",
    name: "Boss",
    hp: 500,
    maxHp: 500,
    atk: 80,
    lastAttackTick: Date.now(),
    attackIntervalMs: 15000,
    statusEffects: [],
  };
}

const TEST_SETTINGS: GameSettings = {
  winCondition: "TIME",
  timeLimitMinutes: 10,
  goldGoal: 1000,
  allowLateJoin: true,
  showInstructions: true,
  useRandomNames: false,
  allowStudentAccounts: true,
};

describe("Battle interaction sequence", () => {
  it("CO_OP_BOSS_RAID: attack emits runtime events and updates combat state", () => {
    const io = createMockIO();
    const socket = createMockSocket("socket-1");
    const engine = new BattleTurnEngine("PIN1", "host-1", "set-1", TEST_SETTINGS, [], io as any);
    const player = makePlayer(socket.id);

    player.hasDarkPact = true;
    (engine as any).players = [player];
    (engine as any).battlePhase = "CO_OP_BOSS_RAID";
    (engine as any).boss = makeBoss();

    engine.handleEvent("battle-action", { type: "ATTACK" }, socket as any);

    const battleEvents = io.emitted.filter((e) => e.event === "battle-event");
    const actionEvent = battleEvents.find((e) => e.payload?.type === "ACTION_ATTACK");
    const damageEvent = battleEvents.find((e) => e.payload?.type === "DAMAGE_APPLIED" && e.payload?.targetId === "boss-1");
    const darkPactEvent = battleEvents.find((e) => e.payload?.type === "DAMAGE_APPLIED" && e.payload?.targetId === socket.id);

    expect(actionEvent).toBeTruthy();
    expect(damageEvent).toBeTruthy();
    expect(darkPactEvent).toBeTruthy();
    expect((engine as any).boss.hp).toBeLessThan(500);
    expect(player.hp).toBe(95); // 5% of maxHp(100) drained by Dark Pact
  });

  it("CO_OP_BOSS_RAID: insufficient AP rejects action and emits no attack event", () => {
    const io = createMockIO();
    const socket = createMockSocket("socket-1");
    const engine = new BattleTurnEngine("PIN1", "host-1", "set-1", TEST_SETTINGS, [], io as any);
    const player = makePlayer(socket.id);
    player.ap = 0;
    player.stamina = 0;

    (engine as any).players = [player];
    (engine as any).battlePhase = "CO_OP_BOSS_RAID";
    (engine as any).boss = makeBoss();

    engine.handleEvent("battle-action", { type: "ATTACK" }, socket as any);

    const actionEvent = io.emitted.find(
      (e) => e.event === "battle-event" && e.payload?.type === "ACTION_ATTACK"
    );
    const err = socket.emitted.find((e) => e.event === "error");

    expect(actionEvent).toBeFalsy();
    expect(err?.payload?.message).toContain("Insufficient Stamina");
  });

  it("SOLO_FARMING: correct answer progresses sequence and emits frame-critical events", () => {
    const io = createMockIO();
    const socket = createMockSocket("socket-1");
    const questions = [{ id: "q1", correctAnswer: 1, question: "Q", options: ["A", "B"] }];
    const engine = new BattleTurnEngine("PIN1", "host-1", "set-1", TEST_SETTINGS, questions, io as any);
    const player = makePlayer(socket.id);
    player.soloMonster = { name: "Slime", hp: 10, maxHp: 10, atk: 5, wave: 1, statusEffects: [] };
    player.wave = 1;

    (engine as any).players = [player];
    (engine as any).battlePhase = "SOLO_FARMING";

    engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, socket as any);

    const answerResult = socket.emitted.find((e) => e.event === "answer-result");
    const monsterDefeated = io.emitted.find((e) => e.event === "monster-defeated");
    const nextWave = io.emitted.find((e) => e.event === "next-wave");
    const farmingState = io.emitted.find((e) => e.event === "farming-state");
    const actionEvent = io.emitted.find(
      (e) => e.event === "battle-event" && e.payload?.type === "ACTION_ATTACK"
    );

    expect(answerResult?.payload?.correct).toBe(true);
    expect(actionEvent).toBeTruthy();
    expect(monsterDefeated).toBeTruthy();
    expect(nextWave).toBeTruthy();
    expect(farmingState).toBeTruthy();
    expect(player.wave).toBeGreaterThanOrEqual(2);
  });
});

