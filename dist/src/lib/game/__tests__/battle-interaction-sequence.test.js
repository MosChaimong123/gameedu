"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const battle_turn_engine_1 = require("../../../lib/game-engine/battle-turn-engine");
function createMockIO() {
    const emitted = [];
    return {
        emitted,
        to(room) {
            return {
                emit(event, payload) {
                    emitted.push({ room, event, payload });
                },
            };
        },
    };
}
function createMockSocket(id) {
    const emitted = [];
    return {
        id,
        emitted,
        emit(event, payload) {
            emitted.push({ event, payload });
        },
    };
}
function makePlayer(id, studentId = "student-1") {
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
function makeBoss() {
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
const TEST_SETTINGS = {
    winCondition: "TIME",
    timeLimitMinutes: 10,
    goldGoal: 1000,
    allowLateJoin: true,
    showInstructions: true,
    useRandomNames: false,
    allowStudentAccounts: true,
};
(0, vitest_1.describe)("Battle interaction sequence", () => {
    (0, vitest_1.it)("CO_OP_BOSS_RAID: attack emits runtime events and updates combat state", () => {
        const io = createMockIO();
        const socket = createMockSocket("socket-1");
        const engine = new battle_turn_engine_1.BattleTurnEngine("PIN1", "host-1", "set-1", TEST_SETTINGS, [], io);
        const player = makePlayer(socket.id);
        player.hasDarkPact = true;
        engine.players = [player];
        engine.battlePhase = "CO_OP_BOSS_RAID";
        engine.boss = makeBoss();
        engine.handleEvent("battle-action", { type: "ATTACK" }, socket);
        const battleEvents = io.emitted.filter((e) => e.event === "battle-event");
        const actionEvent = battleEvents.find((e) => { var _a; return ((_a = e.payload) === null || _a === void 0 ? void 0 : _a.type) === "ACTION_ATTACK"; });
        const damageEvent = battleEvents.find((e) => { var _a, _b; return ((_a = e.payload) === null || _a === void 0 ? void 0 : _a.type) === "DAMAGE_APPLIED" && ((_b = e.payload) === null || _b === void 0 ? void 0 : _b.targetId) === "boss-1"; });
        const darkPactEvent = battleEvents.find((e) => { var _a, _b; return ((_a = e.payload) === null || _a === void 0 ? void 0 : _a.type) === "DAMAGE_APPLIED" && ((_b = e.payload) === null || _b === void 0 ? void 0 : _b.targetId) === socket.id; });
        (0, vitest_1.expect)(actionEvent).toBeTruthy();
        (0, vitest_1.expect)(damageEvent).toBeTruthy();
        (0, vitest_1.expect)(darkPactEvent).toBeTruthy();
        (0, vitest_1.expect)(engine.boss.hp).toBeLessThan(500);
        (0, vitest_1.expect)(player.hp).toBe(95); // 5% of maxHp(100) drained by Dark Pact
    });
    (0, vitest_1.it)("CO_OP_BOSS_RAID: insufficient AP rejects action and emits no attack event", () => {
        var _a;
        const io = createMockIO();
        const socket = createMockSocket("socket-1");
        const engine = new battle_turn_engine_1.BattleTurnEngine("PIN1", "host-1", "set-1", TEST_SETTINGS, [], io);
        const player = makePlayer(socket.id);
        player.ap = 0;
        player.stamina = 0;
        engine.players = [player];
        engine.battlePhase = "CO_OP_BOSS_RAID";
        engine.boss = makeBoss();
        engine.handleEvent("battle-action", { type: "ATTACK" }, socket);
        const actionEvent = io.emitted.find((e) => { var _a; return e.event === "battle-event" && ((_a = e.payload) === null || _a === void 0 ? void 0 : _a.type) === "ACTION_ATTACK"; });
        const err = socket.emitted.find((e) => e.event === "error");
        (0, vitest_1.expect)(actionEvent).toBeFalsy();
        (0, vitest_1.expect)((_a = err === null || err === void 0 ? void 0 : err.payload) === null || _a === void 0 ? void 0 : _a.message).toContain("Insufficient Stamina");
    });
    (0, vitest_1.it)("SOLO_FARMING: correct answer progresses sequence and emits frame-critical events", () => {
        var _a;
        const io = createMockIO();
        const socket = createMockSocket("socket-1");
        const questions = [{ id: "q1", correctAnswer: 1, question: "Q", options: ["A", "B"] }];
        const engine = new battle_turn_engine_1.BattleTurnEngine("PIN1", "host-1", "set-1", TEST_SETTINGS, questions, io);
        const player = makePlayer(socket.id);
        player.soloMonster = { name: "Slime", hp: 10, maxHp: 10, atk: 5, wave: 1, statusEffects: [] };
        player.wave = 1;
        engine.players = [player];
        engine.battlePhase = "SOLO_FARMING";
        engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, socket);
        const answerResult = socket.emitted.find((e) => e.event === "answer-result");
        const monsterDefeated = io.emitted.find((e) => e.event === "monster-defeated");
        const nextWave = io.emitted.find((e) => e.event === "next-wave");
        const farmingState = io.emitted.find((e) => e.event === "farming-state");
        const actionEvent = io.emitted.find((e) => { var _a; return e.event === "battle-event" && ((_a = e.payload) === null || _a === void 0 ? void 0 : _a.type) === "ACTION_ATTACK"; });
        (0, vitest_1.expect)((_a = answerResult === null || answerResult === void 0 ? void 0 : answerResult.payload) === null || _a === void 0 ? void 0 : _a.correct).toBe(true);
        (0, vitest_1.expect)(actionEvent).toBeTruthy();
        (0, vitest_1.expect)(monsterDefeated).toBeTruthy();
        (0, vitest_1.expect)(nextWave).toBeTruthy();
        (0, vitest_1.expect)(farmingState).toBeTruthy();
        (0, vitest_1.expect)(player.wave).toBeGreaterThanOrEqual(2);
    });
});
