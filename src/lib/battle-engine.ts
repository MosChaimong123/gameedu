// ============================================================
// Negamon Battle Engine — pure, deterministic, no DB
// ============================================================
import type { MonsterMove, MonsterType, StatusEffect, MonsterStats, PassiveAbilityId } from "@/lib/types/negamon";
import type { StudentMonsterState } from "@/lib/types/negamon";
import { getTypeMultiplier } from "@/lib/classroom-utils";
import { getBattleItemById } from "@/lib/shop-items";
import { buildBasicAttackMove, NEGAMON_BASIC_ATTACK_MOVE_ID } from "@/lib/negamon-basic-move";
import { getEnergyProfileForSpecies, getMoveEnergyCost } from "@/lib/negamon-energy";

/** @deprecated ใช้ NEGAMON_BASIC_ATTACK_MOVE_ID จาก negamon-basic-move */
export const BASIC_ATTACK_MOVE_ID = NEGAMON_BASIC_ATTACK_MOVE_ID;

// ── In-battle types ──────────────────────────────────────────

export type EffectEntry = {
    effect: StatusEffect;
    turnsLeft: number; // -1 = permanent until battle ends (POISON)
};

/** Stat multiplier stages tracked per fighter */
export type StatStages = {
    atk: number;        // 1.0 = normal, 1.3 = +30%, 0.8 = -20%
    def: number;
    spd: number;
    waterDmg: number;   // extra multiplier on WATER moves
    ignoreDef: boolean; // next attack ignores DEF entirely
};

export type BattleFighter = {
    studentId: string;
    studentName: string;
    speciesId: string;
    formIcon: string;
    formName: string;
    speciesName: string;
    type: MonsterType;
    type2?: MonsterType;
    maxHp: number;
    currentHp: number;
    baseStats: MonsterStats;
    statStages: StatStages;
    effects: EffectEntry[];
    moves: MonsterMove[];
    rankIndex: number;
    badlyPoisonTick: number; // escalating poison counter
    immunities: string[];    // status effects this fighter is immune to
    activeItems: string[];   // item IDs currently providing effects
    goldBonus: number;       // flat bonus gold before multiplier if this fighter wins
    goldMultiplier: number; // product of item multipliers, capped (applied after flat bonus)
    ability?: PassiveAbilityId;  // passive ability of this species
    abilityUsed: boolean;        // for one-time abilities (rage_mode, guardian_scale)
    abilityName?: string;        // display name
    maxEnergy: number;
    currentEnergy: number;
    energyRegenPerTurn: number;
    actionMeter: number;
};

export type TurnEventKind =
    | "move_used"
    | "miss"
    | "damage"
    | "heal"
    | "status_apply"
    | "status_tick"
    | "status_end"
    | "skip_turn"
    | "confusion_hit"
    | "freeze_thaw"
    | "ability_trigger"
    | "faint"
    | "no_energy"
    | "extra_action";

export type TurnEvent = {
    kind: TurnEventKind;
    actorId: string;
    targetId?: string;
    moveName?: string;
    value?: number;
    effect?: StatusEffect;
    effectiveness?: "super" | "normal" | "weak";
    stab?: boolean;
    crit?: boolean;           // critical hit
    priorityOverride?: boolean; // move went first due to priority despite lower speed
    abilityId?: PassiveAbilityId; // ability that triggered
    abilityName?: string;
    requiredEnergy?: number;
    currentEnergy?: number;
};

export type BattleTurn = TurnEvent[];

export type BattleResult = {
    fighters: [BattleFighter, BattleFighter];
    turns: BattleTurn[];
    winnerId: string;
    goldReward: number;
    totalTurns: number;
};

// ── Constants ────────────────────────────────────────────────

const MAX_TURNS = 20;
const GOLD_REWARD_BASE = 30;
/** Cap on combined goldMultiplier from battle items (winner payout). */
export const BATTLE_GOLD_MULT_CAP = 2.5;
const BURN_DOT_RATE = 0.03;
const POISON_DOT_RATE = 0.0125;
const BADLY_POISON_STEP_RATE = 0.008;
const BADLY_POISON_MAX_RATE = 0.08;
const BOOST_STAT_MULTIPLIER = 1.25;
const LOWER_STAT_MULTIPLIER = 0.85;
const WATER_DAMAGE_BOOST_MULTIPLIER = 1.35;
const HEAL_FRACTION = 0.20;
const FLAME_BODY_TRIGGER_RATE = 0.10;
const STATIC_TRIGGER_RATE = 0.15;
const FREEZE_THAW_RATE = 0.20;
export const ACTION_METER_THRESHOLD = 100;
const MAX_ACTIONS_PER_TURN = 4;
const METER_FILL_ITERATION_GUARD = 32;
const DAMAGE_LEVEL_SCALE_BASE = 1.1;
const DAMAGE_LEVEL_SCALE_STEP = 0.07;
const BASIC_ATTACK_POWER_SCALE = 0.82;
const SKILL_POWER_SCALE = 0.94;
const BASIC_ATTACK_FLAT_BONUS = 8;
const SKILL_FLAT_BONUS = 12;
const SPEED_CRIT_BONUS_PER_POINT = 0.0006; // +0.06% crit per SPD advantage point
const SPEED_CRIT_BONUS_MAX = 0.12; // cap speed-derived crit bonus at +12%
const CRIT_RATE_MAX = 0.5; // hard cap 50%

// ── Initialisation ────────────────────────────────────────────

const DEFAULT_STAGES: StatStages = {
    atk: 1, def: 1, spd: 1, waterDmg: 1, ignoreDef: false,
};

export function initBattleFighter(
    monster: StudentMonsterState,
    studentId: string,
    studentName: string,
    /** Battle item IDs equipped for this fight only (consumables / loadout). */
    battleItemIds: string[] = []
): BattleFighter {
    const stages = { ...DEFAULT_STAGES };
    const immunities: string[] = [];
    const activeItems: string[] = [];
    let goldBonus = 0;
    let goldMultiplier = 1;

    for (const itemId of battleItemIds) {
        const item = getBattleItemById(itemId);
        if (!item?.battleEffect) continue;
        const eff = item.battleEffect;
        if (eff.statBoost?.atk) stages.atk *= eff.statBoost.atk;
        if (eff.statBoost?.def) stages.def *= eff.statBoost.def;
        if (eff.statBoost?.spd) stages.spd *= eff.statBoost.spd;
        if (eff.immunity) immunities.push(...eff.immunity);
        if (eff.goldBonus) goldBonus += eff.goldBonus;
        if (eff.goldMultiplier && eff.goldMultiplier > 1) {
            goldMultiplier *= eff.goldMultiplier;
        }
        activeItems.push(itemId);
    }

    goldMultiplier = Math.min(BATTLE_GOLD_MULT_CAP, Math.max(1, goldMultiplier));

    // Apply tailwind ability: SPD ×1.1
    if (monster.ability?.id === "tailwind") {
        stages.spd *= 1.1;
    }

    const energy = getEnergyProfileForSpecies(monster.speciesId);

    return {
        studentId,
        studentName,
        speciesId: monster.speciesId,
        formIcon: monster.form.icon,
        formName: monster.form.name,
        speciesName: monster.speciesName,
        type: monster.type,
        type2: monster.type2,
        maxHp: monster.stats.hp,
        currentHp: monster.stats.hp,
        baseStats: monster.stats,
        statStages: stages,
        effects: [],
        moves: [buildBasicAttackMove(), ...monster.unlockedMoves],
        rankIndex: monster.rankIndex,
        badlyPoisonTick: 0,
        immunities,
        activeItems,
        goldBonus,
        goldMultiplier,
        ability: monster.ability?.id,
        abilityUsed: false,
        abilityName: monster.ability?.name,
        maxEnergy: energy.maxEnergy,
        currentEnergy: energy.maxEnergy,
        energyRegenPerTurn: energy.regenPerTurn,
        actionMeter: 0,
    };
}

// ── Helpers ───────────────────────────────────────────────────

/** Effective ATK/DEF/SPD after stage multipliers (matches damage/heal calculations). */
export function effectiveStat(base: number, stage: number) {
    return Math.max(1, Math.floor(base * stage));
}

/**
 * Predict who should act next from action meters + speed (no move priority).
 * Returns true when it's player's actionable turn.
 */
export function isPlayerActionTurn(player: BattleFighter, opponent: BattleFighter): boolean {
    const pSpd = effectiveStat(player.baseStats.spd, player.statStages.spd);
    const oSpd = effectiveStat(opponent.baseStats.spd, opponent.statStages.spd);
    if (pSpd !== oSpd) return pSpd > oSpd;
    return true;
}

function hasEffect(fighter: BattleFighter, eff: StatusEffect) {
    return fighter.effects.some((e) => e.effect === eff);
}

function addEffect(fighter: BattleFighter, eff: StatusEffect, turns: number) {
    // Don't stack same effect; respect immunity from held items
    if (!hasEffect(fighter, eff) && !fighter.immunities.includes(eff)) {
        fighter.effects.push({ effect: eff, turnsLeft: turns });
    }
}

const BASE_CRIT_RATE = 0.0625; // 6.25%

function calcDamageValue(
    attacker: BattleFighter,
    defender: BattleFighter,
    move: MonsterMove,
    rng: () => number,
    isPriorityMove = false
): { dmg: number; effectiveness: "super" | "normal" | "weak"; stab: boolean; crit: boolean } {
    const atkStat = effectiveStat(attacker.baseStats.atk, attacker.statStages.atk);
    const defStat = attacker.statStages.ignoreDef
        ? 1
        : effectiveStat(defender.baseStats.def, defender.statStages.def);

    let typeMult = getTypeMultiplier(move.type, defender.type);
    if (defender.type2) typeMult *= getTypeMultiplier(move.type, defender.type2);

    // STAB: move type matches attacker's primary or secondary type → ×1.5
    const stab = move.type === attacker.type || move.type === attacker.type2;
    const stabMult = stab ? 1.5 : 1;

    // Water bonus from BOOST_WATER_DMG
    const moveMult =
        move.type === "WATER" ? attacker.statStages.waterDmg : 1;

    // Passive: aerial_strike — priority moves deal +20% dmg
    const aerialMult = (attacker.ability === "aerial_strike" && isPriorityMove) ? 1.2 : 1;

    // Passive: iron_shell — defender takes -10% dmg
    const ironShellMult = defender.ability === "iron_shell" ? 0.9 : 1;

    // Critical hit: base + move bonus + speed advantage bonus (speed archetype identity).
    const attackerSpd = effectiveStat(attacker.baseStats.spd, attacker.statStages.spd);
    const defenderSpd = effectiveStat(defender.baseStats.spd, defender.statStages.spd);
    const spdAdvantage = Math.max(0, attackerSpd - defenderSpd);
    const speedCritBonus = Math.min(SPEED_CRIT_BONUS_MAX, spdAdvantage * SPEED_CRIT_BONUS_PER_POINT);
    const critRate = Math.min(
        CRIT_RATE_MAX,
        BASE_CRIT_RATE + (move.critBonus ?? 0) / 100 + speedCritBonus
    );
    const crit = rng() < critRate;
    const critMult = crit ? 1.5 : 1;

    // ±10% random variance
    const variance = 0.9 + rng() * 0.2;

    const avgRank = (attacker.rankIndex + defender.rankIndex) / 2;
    const levelScale = DAMAGE_LEVEL_SCALE_BASE + avgRank * DAMAGE_LEVEL_SCALE_STEP;
    const attackDefenseRatio = atkStat / Math.max(1, defStat);
    const isBasicAttack = move.id === NEGAMON_BASIC_ATTACK_MOVE_ID;
    const powerScale = isBasicAttack ? BASIC_ATTACK_POWER_SCALE : SKILL_POWER_SCALE;
    const flatBonus = isBasicAttack ? BASIC_ATTACK_FLAT_BONUS : SKILL_FLAT_BONUS;
    const rawBase = move.power * attackDefenseRatio * levelScale * powerScale + flatBonus;
    const modifiedDamage =
        rawBase * typeMult * stabMult * moveMult * aerialMult * ironShellMult * critMult * variance;
    // Keep guaranteed chip so high DEF never creates near-zero stalls.
    const minDamageFloor = Math.max(1, Math.floor(move.power * (isBasicAttack ? 0.18 : 0.22)));
    const base = Math.max(minDamageFloor, Math.floor(modifiedDamage));

    const effectiveness: "super" | "normal" | "weak" =
        typeMult >= 2 ? "super" : typeMult <= 0.5 ? "weak" : "normal";

    return { dmg: base, effectiveness, stab, crit };
}

/** Simple seeded pseudo-RNG (mulberry32) */
export function makePRNG(seed: number) {
    let s = seed;
    return () => {
        s |= 0; s = s + 0x6d2b79f5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 0xFFFFFFFF;
    };
}

/**
 * AI move selection — scoring-based.
 * Each move gets a score based on expected damage, type matchup, and situational value.
 * Adds a small random noise so the AI is not perfectly predictable.
 */
function selectMove(
    fighter: BattleFighter,
    rng: () => number,
    opponent?: BattleFighter
): MonsterMove | null {
    if (fighter.moves.length === 0) return null;

    const hpPct = fighter.currentHp / fighter.maxHp;
    const opponentHasStatus = opponent
        ? opponent.effects.some((e) => ["BURN","POISON","BADLY_POISON","PARALYZE","SLEEP","FREEZE","CONFUSE"].includes(e.effect))
        : false;
    const selfHasBoostAtk = fighter.effects.some((e) => e.effect === "BOOST_ATK");
    const selfHasBoostDef = fighter.effects.some((e) => e.effect === "BOOST_DEF");
    const selfHasBoostSpd = fighter.effects.some((e) => e.effect === "BOOST_SPD");

    const scored = fighter.moves.map((move) => {
        const energyCost = move.energyCost ?? getMoveEnergyCost(move, fighter.speciesId);
        if (fighter.currentEnergy < energyCost) {
            return { move, score: -9999 };
        }
        let score = 0;

        if (move.power > 0) {
            // Base: raw power
            score = move.power;

            // Type matchup bonus
            if (opponent) {
                const mult = getTypeMultiplier(move.type, opponent.type) *
                    (opponent.type2 ? getTypeMultiplier(move.type, opponent.type2) : 1);
                score *= mult;
            }

            // STAB bonus
            if (move.type === fighter.type || move.type === fighter.type2) {
                score *= 1.3;
            }

            // High crit chance moves slightly preferred
            if (move.critBonus) score += move.critBonus * 0.5;

        } else {
            // Utility / status moves
            switch (move.effect) {
                case "BOOST_ATK":
                    // Only useful if not already boosted and HP is decent
                    score = (!selfHasBoostAtk && hpPct > 0.4) ? 55 : 5;
                    break;
                case "BOOST_DEF":
                    score = (!selfHasBoostDef && hpPct < 0.6) ? 60 : 5;
                    break;
                case "BOOST_SPD":
                    score = (!selfHasBoostSpd && hpPct > 0.3) ? 50 : 5;
                    break;
                case "HEAL_25":
                    // More valuable when low HP
                    score = hpPct < 0.4 ? 90 : hpPct < 0.7 ? 50 : 20;
                    break;
                case "LOWER_ATK":
                case "LOWER_ATK_ALL":
                    // Useful early, less so if opponent already debuffed
                    score = hpPct > 0.5 ? 45 : 25;
                    break;
                case "LOWER_DEF":
                    score = 40;
                    break;
                case "BURN":
                case "POISON":
                case "BADLY_POISON":
                case "PARALYZE":
                case "SLEEP":
                case "FREEZE":
                case "CONFUSE":
                    // Don't re-apply status if opponent already has one
                    score = opponentHasStatus ? 5 : 65;
                    break;
                case "BOOST_WATER_DMG":
                    score = (fighter.type === "WATER" && !selfHasBoostAtk) ? 55 : 10;
                    break;
                default:
                    score = 30;
            }
        }

        // Small random noise ±15% — prevents perfect predictability
        score *= 0.85 + rng() * 0.30;

        return { move, score };
    });

    // Pick highest-scored move
    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
}

// ── End-of-turn effect processing ────────────────────────────

function processEndOfTurn(
    fighter: BattleFighter,
    events: TurnEvent[]
) {
    const toRemove: StatusEffect[] = [];

    for (const entry of fighter.effects) {
        switch (entry.effect) {
            case "BURN": {
                // 3% maxHp per turn × 3 turns = 9% total
                const dmg = Math.max(1, Math.floor(fighter.maxHp * BURN_DOT_RATE));
                fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
                events.push({ kind: "status_tick", actorId: fighter.studentId, value: dmg, effect: "BURN" });
                break;
            }
            case "POISON": {
                // 1.25% maxHp ต่อ turn ตลอดเกม
                const dmg = Math.max(1, Math.floor(fighter.maxHp * POISON_DOT_RATE));
                fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
                events.push({ kind: "status_tick", actorId: fighter.studentId, value: dmg, effect: "POISON" });
                break;
            }
            case "BADLY_POISON": {
                // Escalating: +0.8% maxHp per tick, capped at 8%
                fighter.badlyPoisonTick++;
                const pct = Math.min(BADLY_POISON_MAX_RATE, fighter.badlyPoisonTick * BADLY_POISON_STEP_RATE);
                const dmg = Math.max(1, Math.floor(fighter.maxHp * pct));
                fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
                events.push({ kind: "status_tick", actorId: fighter.studentId, value: dmg, effect: "BADLY_POISON" });
                break;
            }
        }
        if (entry.turnsLeft > 0) {
            entry.turnsLeft--;
            if (entry.turnsLeft === 0) toRemove.push(entry.effect);
        }
    }

    for (const eff of toRemove) {
        fighter.effects = fighter.effects.filter((e) => e.effect !== eff);
        events.push({ kind: "status_end", actorId: fighter.studentId, effect: eff });
        // Reset stat stages when boost ends
        if (eff === "BOOST_ATK")       fighter.statStages.atk = 1;
        if (eff === "BOOST_DEF")       fighter.statStages.def = 1;
        if (eff === "BOOST_SPD")       fighter.statStages.spd = 1;
        if (eff === "BOOST_WATER_DMG") fighter.statStages.waterDmg = 1;
        if (eff === "BADLY_POISON")    fighter.badlyPoisonTick = 0;
    }

    // Passive: rage_mode — HP drops below 50% → ATK ×1.25 (once)
    if (fighter.ability === "rage_mode" && !fighter.abilityUsed && fighter.currentHp / fighter.maxHp < 0.5) {
        fighter.statStages.atk *= BOOST_STAT_MULTIPLIER;
        fighter.abilityUsed = true;
        events.push({ kind: "ability_trigger", actorId: fighter.studentId, abilityId: "rage_mode", abilityName: fighter.abilityName });
    }
    // Passive: guardian_scale — HP drops below 30% → Heal 15% (once)
    if (fighter.ability === "guardian_scale" && !fighter.abilityUsed && fighter.currentHp / fighter.maxHp < 0.3) {
        const healAmt = Math.max(1, Math.floor(fighter.maxHp * 0.15));
        fighter.currentHp = Math.min(fighter.maxHp, fighter.currentHp + healAmt);
        fighter.abilityUsed = true;
        events.push({ kind: "ability_trigger", actorId: fighter.studentId, value: healAmt, abilityId: "guardian_scale", abilityName: fighter.abilityName });
    }
}

// ── Move execution ────────────────────────────────────────────

function executeMove(
    attacker: BattleFighter,
    defender: BattleFighter,
    move: MonsterMove,
    events: TurnEvent[],
    rng: () => number,
    priorityOverride = false
) {
    const executeBasicAttackFallback = () => {
        const basicMove = buildBasicAttackMove();
        const { dmg, effectiveness, stab, crit } = calcDamageValue(attacker, defender, basicMove, rng, false);
        events.push({
            kind: "move_used",
            actorId: attacker.studentId,
            targetId: defender.studentId,
            moveName: basicMove.name,
            priorityOverride: false,
        });
        defender.currentHp = Math.max(0, defender.currentHp - dmg);
        events.push({
            kind: "damage",
            actorId: attacker.studentId,
            targetId: defender.studentId,
            moveName: basicMove.name,
            value: dmg,
            effectiveness,
            stab,
            crit,
        });
    };

    events.push({
        kind: "move_used",
        actorId: attacker.studentId,
        targetId: defender.studentId,
        moveName: move.name,
        priorityOverride,
    });

    const energyCost = move.energyCost ?? getMoveEnergyCost(move, attacker.speciesId);
    if (attacker.currentEnergy < energyCost) {
        events.push({
            kind: "no_energy",
            actorId: attacker.studentId,
            moveName: move.name,
            requiredEnergy: energyCost,
            currentEnergy: attacker.currentEnergy,
        });
        executeBasicAttackFallback();
        return;
    }
    attacker.currentEnergy = Math.max(0, attacker.currentEnergy - energyCost);

    // Accuracy system disabled: moves do not miss.

    // Heal move
    if (move.category === "HEAL") {
        const healAmt = Math.max(1, Math.floor(attacker.maxHp * HEAL_FRACTION));
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmt);
        events.push({ kind: "heal", actorId: attacker.studentId, value: healAmt });
        return;
    }

    // Status-only move
    if (move.category === "STATUS") {
        if (move.effect) {
            applyEffect(move.effect, attacker, defender, events);
        }
        return;
    }

    // Physical / Special — apply damage
    const { dmg, effectiveness, stab, crit } = calcDamageValue(attacker, defender, move, rng, priorityOverride);
    defender.currentHp = Math.max(0, defender.currentHp - dmg);
    events.push({
        kind: "damage",
        actorId: attacker.studentId,
        targetId: defender.studentId,
        moveName: move.name,
        value: dmg,
        effectiveness,
        stab,
        crit,
    });

    // Consume armor-pierce from a prior setup (e.g. STATUS IGNORE_DEF). Clear before post-hit
    // effects so a move that grants IGNORE_DEF for the *next* hit still works.
    if (attacker.statStages.ignoreDef) {
        attacker.statStages.ignoreDef = false;
    }

    // Side effect on hit
    if (move.effect) {
        const chance = move.effectChance ?? 100;
        if (rng() * 100 < chance) {
            applyEffect(move.effect, attacker, defender, events);
        }
    }

    // Passive: flame_body — defender has 10% chance to burn attacker on hit
    if (defender.ability === "flame_body" && !hasEffect(attacker, "BURN") && rng() < FLAME_BODY_TRIGGER_RATE) {
        addEffect(attacker, "BURN", 3);
        events.push({ kind: "ability_trigger", actorId: defender.studentId, targetId: attacker.studentId, effect: "BURN", abilityId: "flame_body", abilityName: defender.abilityName });
    }
    // Passive: static — defender has 15% chance to paralyze attacker on hit
    if (defender.ability === "static" && !hasEffect(attacker, "PARALYZE") && rng() < STATIC_TRIGGER_RATE) {
        addEffect(attacker, "PARALYZE", 2);
        events.push({ kind: "ability_trigger", actorId: defender.studentId, targetId: attacker.studentId, effect: "PARALYZE", abilityId: "static", abilityName: defender.abilityName });
    }
}

function regenEnergy(fighter: BattleFighter) {
    fighter.currentEnergy = Math.min(
        fighter.maxEnergy,
        fighter.currentEnergy + fighter.energyRegenPerTurn
    );
}

function addActionMeter(fighter: BattleFighter) {
    fighter.actionMeter += effectiveStat(fighter.baseStats.spd, fighter.statStages.spd);
}

function addActionMeterBySpdDelta(fighter: BattleFighter, prevSpdStage: number, nextSpdStage: number) {
    const prevSpd = effectiveStat(fighter.baseStats.spd, prevSpdStage);
    const nextSpd = effectiveStat(fighter.baseStats.spd, nextSpdStage);
    const delta = Math.max(0, nextSpd - prevSpd);
    fighter.actionMeter += delta;
}

function isReadyByMeter(fighter: BattleFighter): boolean {
    return fighter.actionMeter >= ACTION_METER_THRESHOLD;
}

function chooseActorByMeter(
    a: BattleFighter,
    b: BattleFighter,
    aMove: MonsterMove | null,
    bMove: MonsterMove | null,
    rng: () => number
): { actor: BattleFighter; move: MonsterMove | null; defender: BattleFighter; priorityOverride: boolean } | null {
    const aReady = isReadyByMeter(a);
    const bReady = isReadyByMeter(b);
    if (!aReady && !bReady) return null;

    if (aReady && !bReady) {
        return { actor: a, move: aMove, defender: b, priorityOverride: false };
    }
    if (!aReady && bReady) {
        return { actor: b, move: bMove, defender: a, priorityOverride: false };
    }

    const aPrio = aMove?.priority ?? 0;
    const bPrio = bMove?.priority ?? 0;
    if (aPrio !== bPrio) {
        const actor = aPrio > bPrio ? a : b;
        const move = actor === a ? aMove : bMove;
        const defender = actor === a ? b : a;
        const priorityOverride = (actor === a ? a.actionMeter : b.actionMeter) < (actor === a ? b.actionMeter : a.actionMeter);
        return { actor, move, defender, priorityOverride };
    }

    if (a.actionMeter !== b.actionMeter) {
        const actor = a.actionMeter > b.actionMeter ? a : b;
        const move = actor === a ? aMove : bMove;
        const defender = actor === a ? b : a;
        return { actor, move, defender, priorityOverride: false };
    }

    const aSpd = effectiveStat(a.baseStats.spd, a.statStages.spd);
    const bSpd = effectiveStat(b.baseStats.spd, b.statStages.spd);
    if (aSpd !== bSpd) {
        const actor = aSpd > bSpd ? a : b;
        const move = actor === a ? aMove : bMove;
        const defender = actor === a ? b : a;
        return { actor, move, defender, priorityOverride: false };
    }

    const actor = rng() < 0.5 ? a : b;
    const move = actor === a ? aMove : bMove;
    const defender = actor === a ? b : a;
    return { actor, move, defender, priorityOverride: false };
}

function resolveMeterStep(
    a: BattleFighter,
    b: BattleFighter,
    aMove: MonsterMove | null,
    bMove: MonsterMove | null,
    events: TurnEvent[],
    rng: () => number
): { faintedId: string | null; acted: boolean } {
    let guard = METER_FILL_ITERATION_GUARD;
    while (!isReadyByMeter(a) && !isReadyByMeter(b) && guard > 0) {
        addActionMeter(a);
        addActionMeter(b);
        guard--;
    }

    const chosen = chooseActorByMeter(a, b, aMove, bMove, rng);
    if (!chosen) return { faintedId: null, acted: false };

    const { actor, move, defender, priorityOverride } = chosen;
    actor.actionMeter = Math.max(0, actor.actionMeter - ACTION_METER_THRESHOLD);

    if (!checkSkip(actor, events, rng) && !checkConfusion(actor, events, rng)) {
        if (move) executeMove(actor, defender, move, events, rng, priorityOverride);
    }

    if (a.currentHp <= 0) {
        events.push({ kind: "faint", actorId: a.studentId });
        return { faintedId: a.studentId, acted: true };
    }
    if (b.currentHp <= 0) {
        events.push({ kind: "faint", actorId: b.studentId });
        return { faintedId: b.studentId, acted: true };
    }
    return { faintedId: null, acted: true };
}

function applyEffect(
    eff: StatusEffect,
    attacker: BattleFighter,
    defender: BattleFighter,
    events: TurnEvent[]
) {
    let applied = true;
    switch (eff) {
        case "BURN":         addEffect(defender, "BURN",         3);  break;
        case "PARALYZE":     addEffect(defender, "PARALYZE",     2);  break;
        case "SLEEP":        addEffect(defender, "SLEEP",        2);  break;
        case "POISON":       addEffect(defender, "POISON",      -1);  break;
        case "BADLY_POISON": addEffect(defender, "BADLY_POISON",-1);  break;
        case "FREEZE":       addEffect(defender, "FREEZE",      -1);  break;
        case "CONFUSE":      addEffect(defender, "CONFUSE",      3);  break;

        case "BOOST_ATK":
            if (attacker.statStages.atk < BOOST_STAT_MULTIPLIER) {
                attacker.statStages.atk = BOOST_STAT_MULTIPLIER;
                addEffect(attacker, "BOOST_ATK", 2);
            } else {
                applied = false;
            }
            break;
        case "BOOST_DEF":
            if (attacker.statStages.def < BOOST_STAT_MULTIPLIER) {
                attacker.statStages.def = BOOST_STAT_MULTIPLIER;
                addEffect(attacker, "BOOST_DEF", 2);
            } else {
                applied = false;
            }
            break;
        case "BOOST_SPD":
            {
                if (attacker.statStages.spd < BOOST_STAT_MULTIPLIER) {
                    const prevSpdStage = attacker.statStages.spd;
                    attacker.statStages.spd = BOOST_STAT_MULTIPLIER;
                    // QoL: speed buff immediately advances action meter by true SPD delta.
                    addActionMeterBySpdDelta(attacker, prevSpdStage, attacker.statStages.spd);
                    addEffect(attacker, "BOOST_SPD", 2);
                } else {
                    applied = false;
                }
            break;
            }
        case "BOOST_WATER_DMG":
            if (attacker.statStages.waterDmg < WATER_DAMAGE_BOOST_MULTIPLIER) {
                attacker.statStages.waterDmg = WATER_DAMAGE_BOOST_MULTIPLIER;
                addEffect(attacker, "BOOST_WATER_DMG", 2);
            } else {
                applied = false;
            }
            break;

        case "LOWER_ATK":
            if (defender.statStages.atk > LOWER_STAT_MULTIPLIER) {
                defender.statStages.atk = LOWER_STAT_MULTIPLIER;
            } else {
                applied = false;
            }
            break;
        case "LOWER_ATK_ALL": // In 1v1 affects only defender
            if (defender.statStages.atk > LOWER_STAT_MULTIPLIER) {
                defender.statStages.atk = LOWER_STAT_MULTIPLIER;
            } else {
                applied = false;
            }
            break;
        case "LOWER_DEF":
            if (defender.statStages.def > LOWER_STAT_MULTIPLIER) {
                defender.statStages.def = LOWER_STAT_MULTIPLIER;
            } else {
                applied = false;
            }
            break;
        case "HEAL_25": {
            const amt = Math.max(1, Math.floor(attacker.maxHp * HEAL_FRACTION));
            attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + amt);
            events.push({ kind: "heal", actorId: attacker.studentId, value: amt });
            return; // no status_apply event needed
        }
        case "IGNORE_DEF":
            attacker.statStages.ignoreDef = true;
            break;
    }
    if (applied) {
        events.push({ kind: "status_apply", actorId: attacker.studentId, targetId: defender.studentId, effect: eff });
    }
}

// ── Check skip conditions ─────────────────────────────────────

function checkSkip(
    fighter: BattleFighter,
    events: TurnEvent[],
    rng: () => number
): boolean {
    const sleepEntry = fighter.effects.find((e) => e.effect === "SLEEP");
    if (sleepEntry) {
        events.push({ kind: "skip_turn", actorId: fighter.studentId, effect: "SLEEP" });
        return true;
    }
    const paraEntry = fighter.effects.find((e) => e.effect === "PARALYZE");
    if (paraEntry && rng() < 0.5) {
        events.push({ kind: "skip_turn", actorId: fighter.studentId, effect: "PARALYZE" });
        return true;
    }
    const freezeEntry = fighter.effects.find((e) => e.effect === "FREEZE");
    if (freezeEntry) {
        if (rng() < FREEZE_THAW_RATE) {
            // Thaw — remove FREEZE and continue to move this turn
            fighter.effects = fighter.effects.filter((e) => e.effect !== "FREEZE");
            events.push({ kind: "freeze_thaw", actorId: fighter.studentId, effect: "FREEZE" });
            return false;
        }
        events.push({ kind: "skip_turn", actorId: fighter.studentId, effect: "FREEZE" });
        return true;
    }
    return false;
}

/** Returns true if the fighter hit themselves and should skip their regular move */
function checkConfusion(
    fighter: BattleFighter,
    events: TurnEvent[],
    rng: () => number
): boolean {
    const confEntry = fighter.effects.find((e) => e.effect === "CONFUSE");
    if (!confEntry) return false;
    if (rng() < 0.33) {
        // Self-hit: flat ATK-based damage, no type multiplier
        const selfDmg = Math.max(1, Math.floor(fighter.baseStats.atk * fighter.statStages.atk * 0.5));
        fighter.currentHp = Math.max(0, fighter.currentHp - selfDmg);
        events.push({ kind: "confusion_hit", actorId: fighter.studentId, value: selfDmg });
        return true;
    }
    return false;
}

// ── Main resolver ─────────────────────────────────────────────

/**
 * Resolve an entire battle between two fighters.
 * Deterministic given the same seed.
 */
export function resolveBattle(
    f1: BattleFighter,
    f2: BattleFighter,
    seed?: number
): BattleResult {
    const rng = makePRNG(seed ?? Date.now());
    const turns: BattleTurn[] = [];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        const events: TurnEvent[] = [];
        let faintedId: string | null = null;
        let lastActorId: string | null = null;
        for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
            const m1 = selectMove(f1, rng, f2);
            const m2 = selectMove(f2, rng, f1);
            const beforeLen = events.length;
            const step = resolveMeterStep(f1, f2, m1, m2, events, rng);
            if (!step.acted) break;

            const moveEvt = events.slice(beforeLen).find((e) => e.kind === "move_used");
            if (moveEvt && lastActorId === moveEvt.actorId) {
                events.push({ kind: "extra_action", actorId: moveEvt.actorId });
            }
            if (moveEvt) lastActorId = moveEvt.actorId;
            if (step.faintedId) {
                faintedId = step.faintedId;
                break;
            }
        }

        if (faintedId) {
            turns.push(events);
            break;
        }

        // End-of-turn: apply DoT effects
        processEndOfTurn(f1, events);
        if (f1.currentHp <= 0) {
            events.push({ kind: "faint", actorId: f1.studentId });
            turns.push(events);
            break;
        }
        processEndOfTurn(f2, events);
        if (f2.currentHp <= 0) {
            events.push({ kind: "faint", actorId: f2.studentId });
            turns.push(events);
            break;
        }

        regenEnergy(f1);
        regenEnergy(f2);

        turns.push(events);
    }

    // Determine winner (most HP remaining; on exact draw, use seeded RNG to avoid challenger bias)
    const winnerId =
        f1.currentHp > f2.currentHp  ? f1.studentId :
        f2.currentHp > f1.currentHp  ? f2.studentId :
        (rng() < 0.5 ? f1.studentId : f2.studentId);

    const winner = winnerId === f1.studentId ? f1 : f2;
    const loser = winnerId === f1.studentId ? f2 : f1;
    const goldReward = calcGoldReward(winner, loser);

    return {
        fighters: [f1, f2],
        turns,
        winnerId,
        goldReward,
        totalTurns: turns.length,
    };
}

// ── Interactive (single-turn) API ─────────────────────────────

export type OneTurnResult = {
    events: TurnEvent[];
    faintedId: string | null;
};

export type ServerOwnedInteractiveTurnResult = OneTurnResult & {
    actorSide: "player" | "opponent";
};

function chooseServerOwnedActorByMeter(
    player: BattleFighter,
    opponent: BattleFighter,
    rng: () => number
): { actor: BattleFighter; defender: BattleFighter; actorSide: "player" | "opponent" } {
    let guard = METER_FILL_ITERATION_GUARD;
    while (!isReadyByMeter(player) && !isReadyByMeter(opponent) && guard > 0) {
        addActionMeter(player);
        addActionMeter(opponent);
        guard--;
    }

    const playerReady = isReadyByMeter(player);
    const opponentReady = isReadyByMeter(opponent);
    let actorSide: "player" | "opponent";

    if (playerReady && !opponentReady) {
        actorSide = "player";
    } else if (!playerReady && opponentReady) {
        actorSide = "opponent";
    } else if (player.actionMeter !== opponent.actionMeter) {
        actorSide = player.actionMeter > opponent.actionMeter ? "player" : "opponent";
    } else {
        const playerSpd = effectiveStat(player.baseStats.spd, player.statStages.spd);
        const opponentSpd = effectiveStat(opponent.baseStats.spd, opponent.statStages.spd);
        if (playerSpd !== opponentSpd) {
            actorSide = playerSpd > opponentSpd ? "player" : "opponent";
        } else {
            actorSide = rng() < 0.5 ? "player" : "opponent";
        }
    }

    const actor = actorSide === "player" ? player : opponent;
    const defender = actorSide === "player" ? opponent : player;
    return { actor, defender, actorSide };
}

function findPlayerMoveOrBasic(player: BattleFighter, playerMoveId: string | undefined): MonsterMove {
    const basicMove = buildBasicAttackMove();
    if (!playerMoveId || playerMoveId === NEGAMON_BASIC_ATTACK_MOVE_ID) return basicMove;
    return player.moves.find((m) => m.id === playerMoveId) ?? player.moves[0] ?? basicMove;
}

/**
 * Server-authoritative interactive action.
 * The server decides which side acts from action meter/SPD and ignores client move input
 * whenever the opponent owns the next action.
 */
export function resolveServerOwnedInteractiveTurn(
    player: BattleFighter,
    opponent: BattleFighter,
    playerMoveId: string | undefined,
    rng: () => number
): ServerOwnedInteractiveTurnResult {
    const events: TurnEvent[] = [];
    const { actor, defender, actorSide } = chooseServerOwnedActorByMeter(player, opponent, rng);
    const move = actorSide === "player"
        ? findPlayerMoveOrBasic(player, playerMoveId)
        : (selectMove(opponent, rng, player) ?? buildBasicAttackMove());

    actor.actionMeter = Math.max(0, actor.actionMeter - ACTION_METER_THRESHOLD);

    if (!checkSkip(actor, events, rng) && !checkConfusion(actor, events, rng)) {
        executeMove(actor, defender, move, events, rng, false);
    }

    let faintedId: string | null = null;
    if (player.currentHp <= 0) {
        events.push({ kind: "faint", actorId: player.studentId });
        faintedId = player.studentId;
    } else if (opponent.currentHp <= 0) {
        events.push({ kind: "faint", actorId: opponent.studentId });
        faintedId = opponent.studentId;
    }

    if (!faintedId) {
        processEndOfTurn(player, events);
        if (player.currentHp <= 0) {
            events.push({ kind: "faint", actorId: player.studentId });
            faintedId = player.studentId;
        }
    }
    if (!faintedId) {
        processEndOfTurn(opponent, events);
        if (opponent.currentHp <= 0) {
            events.push({ kind: "faint", actorId: opponent.studentId });
            faintedId = opponent.studentId;
        }
    }

    if (!faintedId) {
        regenEnergy(player);
        regenEnergy(opponent);
    }

    return { events, faintedId, actorSide };
}

/**
 * Resolve exactly one forced action from the chosen actor.
 * Used by UI turn-lock flows where actor order is controlled outside the meter system.
 */
export function resolveForcedAction(
    actor: BattleFighter,
    defender: BattleFighter,
    actorMoveId: string | undefined,
    rng: () => number
): OneTurnResult {
    const events: TurnEvent[] = [];
    const basicMove = buildBasicAttackMove();
    const chosenMove = actorMoveId
        ? (actorMoveId === NEGAMON_BASIC_ATTACK_MOVE_ID
            ? basicMove
            : actor.moves.find((m) => m.id === actorMoveId) ?? actor.moves[0] ?? basicMove)
        : (selectMove(actor, rng, defender) ?? basicMove);

    if (!checkSkip(actor, events, rng) && !checkConfusion(actor, events, rng)) {
        executeMove(actor, defender, chosenMove, events, rng, false);
    }

    if (actor.currentHp <= 0) {
        events.push({ kind: "faint", actorId: actor.studentId });
        return { events, faintedId: actor.studentId };
    }
    if (defender.currentHp <= 0) {
        events.push({ kind: "faint", actorId: defender.studentId });
        return { events, faintedId: defender.studentId };
    }
    return { events, faintedId: null };
}

/** Carries state between first and second half of an interactive turn (same RNG stream). */
export type InteractiveTurnPending = {
    player: BattleFighter;
    opponent: BattleFighter;
    playerMove: MonsterMove;
    actionsTaken: number;
    lastActorId: string | null;
};

export type InteractiveFirstHalfResult = {
    events: TurnEvent[];
    faintedId: string | null;
    pending: InteractiveTurnPending | null;
};

/**
 * First half of an interactive turn: only the faster / priority actor acts.
 * Mutates fighters in-place. If no faint, `pending` is set for {@link resolveInteractiveTurnSecondHalf}.
 */
export function resolveInteractiveTurnFirstHalf(
    player: BattleFighter,
    opponent: BattleFighter,
    playerMoveId: string,
    rng: () => number
): InteractiveFirstHalfResult {
    const events: TurnEvent[] = [];
    const basicAttackMove = buildBasicAttackMove();
    const playerMove =
        playerMoveId === NEGAMON_BASIC_ATTACK_MOVE_ID
            ? basicAttackMove
            : player.moves.find((m) => m.id === playerMoveId) ?? player.moves[0];
    if (!playerMove) return { events, faintedId: null, pending: null };
    const opponentMove = selectMove(opponent, rng, player);
    const step = resolveMeterStep(player, opponent, playerMove, opponentMove, events, rng);
    if (step.faintedId) {
        return { events, faintedId: step.faintedId, pending: null };
    }

    const firstActorMove = events.find((e) => e.kind === "move_used");
    const lastActorId = firstActorMove?.actorId ?? null;

    return {
        events,
        faintedId: null,
        pending: { player, opponent, playerMove, actionsTaken: 1, lastActorId },
    };
}

/**
 * Second half + end-of-turn ticks (DoT, passives). Mutates fighters in-place.
 */
export function resolveInteractiveTurnSecondHalf(
    pending: InteractiveTurnPending,
    rng: () => number
): OneTurnResult {
    const events: TurnEvent[] = [];
    const { player, opponent, playerMove } = pending;
    let actionsTaken = pending.actionsTaken;
    let lastActorId = pending.lastActorId;

    while (actionsTaken < MAX_ACTIONS_PER_TURN) {
        const beforeLen = events.length;
        const opponentMove = selectMove(opponent, rng, player);
        const step = resolveMeterStep(player, opponent, playerMove, opponentMove, events, rng);
        if (!step.acted) break;
        actionsTaken += 1;

        const moveEvt = events.slice(beforeLen).find((e) => e.kind === "move_used");
        if (moveEvt && lastActorId === moveEvt.actorId) {
            events.push({ kind: "extra_action", actorId: moveEvt.actorId });
        }
        if (moveEvt) lastActorId = moveEvt.actorId;
        if (step.faintedId) {
            return { events, faintedId: step.faintedId };
        }
    }

    processEndOfTurn(player, events);
    if (player.currentHp <= 0) {
        events.push({ kind: "faint", actorId: player.studentId });
        return { events, faintedId: player.studentId };
    }
    processEndOfTurn(opponent, events);
    if (opponent.currentHp <= 0) {
        events.push({ kind: "faint", actorId: opponent.studentId });
        return { events, faintedId: opponent.studentId };
    }

    regenEnergy(player);
    regenEnergy(opponent);

    return { events, faintedId: null };
}

/**
 * Resolve one full interactive turn (both halves + end-of-turn). For tests and batch UIs.
 * Mutates `player` and `opponent` in-place.
 */
export function resolveOneTurn(
    player: BattleFighter,
    opponent: BattleFighter,
    playerMoveId: string,
    rng: () => number
): OneTurnResult {
    const h1 = resolveInteractiveTurnFirstHalf(player, opponent, playerMoveId, rng);
    const all = [...h1.events];
    if (h1.faintedId) {
        return { events: all, faintedId: h1.faintedId };
    }
    if (!h1.pending) {
        return { events: all, faintedId: null };
    }
    const h2 = resolveInteractiveTurnSecondHalf(h1.pending, rng);
    return { events: [...all, ...h2.events], faintedId: h2.faintedId };
}

/** Compute the gold reward for a completed interactive battle */
export function calcGoldReward(winner: BattleFighter, loser: BattleFighter): number {
    void loser;
    const base = GOLD_REWARD_BASE + winner.goldBonus;
    const mult = Math.min(BATTLE_GOLD_MULT_CAP, Math.max(1, winner.goldMultiplier));
    return Math.floor(base * mult);
}




