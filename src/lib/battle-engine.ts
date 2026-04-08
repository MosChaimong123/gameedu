// ============================================================
// Negamon Battle Engine — pure, deterministic, no DB
// ============================================================
import type { MonsterMove, MonsterType, StatusEffect, MonsterStats, PassiveAbilityId } from "@/lib/types/negamon";
import type { StudentMonsterState } from "@/lib/types/negamon";
import { getTypeMultiplier } from "@/lib/classroom-utils";
import { getBattleItemById } from "@/lib/shop-items";

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
    goldBonus: number;       // bonus gold added to reward if this fighter wins
    ability?: PassiveAbilityId;  // passive ability of this species
    abilityUsed: boolean;        // for one-time abilities (rage_mode, guardian_scale)
    abilityName?: string;        // display name
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
    | "faint";

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

// ── Initialisation ────────────────────────────────────────────

const DEFAULT_STAGES: StatStages = {
    atk: 1, def: 1, spd: 1, waterDmg: 1, ignoreDef: false,
};

export function initBattleFighter(
    monster: StudentMonsterState,
    studentId: string,
    studentName: string,
    inventory: string[] = []
): BattleFighter {
    const stages = { ...DEFAULT_STAGES };
    const immunities: string[] = [];
    const activeItems: string[] = [];
    let goldBonus = 0;

    // Apply battle item effects from inventory
    for (const itemId of inventory) {
        const item = getBattleItemById(itemId);
        if (!item?.battleEffect) continue;
        const eff = item.battleEffect;
        if (eff.statBoost?.atk) stages.atk *= eff.statBoost.atk;
        if (eff.statBoost?.def) stages.def *= eff.statBoost.def;
        if (eff.statBoost?.spd) stages.spd *= eff.statBoost.spd;
        if (eff.immunity)       immunities.push(...eff.immunity);
        if (eff.goldBonus)      goldBonus += eff.goldBonus;
        activeItems.push(itemId);
    }

    // Apply tailwind ability: SPD ×1.1
    if (monster.ability?.id === "tailwind") {
        stages.spd *= 1.1;
    }

    return {
        studentId,
        studentName,
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
        moves: monster.unlockedMoves.length > 0 ? monster.unlockedMoves : [],
        rankIndex: monster.rankIndex,
        badlyPoisonTick: 0,
        immunities,
        activeItems,
        goldBonus,
        ability: monster.ability?.id,
        abilityUsed: false,
        abilityName: monster.ability?.name,
    };
}

// ── Helpers ───────────────────────────────────────────────────

function effectiveStat(base: number, stage: number) {
    return Math.max(1, Math.floor(base * stage));
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

    // Critical hit: base 6.25% + move.critBonus
    const critRate = BASE_CRIT_RATE + (move.critBonus ?? 0) / 100;
    const crit = rng() < critRate;
    const critMult = crit ? 1.5 : 1;

    // ±10% random variance
    const variance = 0.9 + rng() * 0.2;

    const base = Math.max(1, Math.floor(
        (atkStat / Math.max(defStat, 1)) * move.power * typeMult * stabMult * moveMult * aerialMult * ironShellMult * critMult * variance / 2
    ));

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
    events.push({
        kind: "move_used",
        actorId: attacker.studentId,
        targetId: defender.studentId,
        moveName: move.name,
        priorityOverride,
    });

    // Accuracy check
    if (move.accuracy < 100 && rng() * 100 > move.accuracy) {
        events.push({ kind: "miss", actorId: attacker.studentId, moveName: move.name });
        return;
    }

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

    // Reset IGNORE_DEF after use
    attacker.statStages.ignoreDef = false;
}

function applyEffect(
    eff: StatusEffect,
    attacker: BattleFighter,
    defender: BattleFighter,
    events: TurnEvent[]
) {
    switch (eff) {
        case "BURN":         addEffect(defender, "BURN",         3);  break;
        case "PARALYZE":     addEffect(defender, "PARALYZE",     2);  break;
        case "SLEEP":        addEffect(defender, "SLEEP",        2);  break;
        case "POISON":       addEffect(defender, "POISON",      -1);  break;
        case "BADLY_POISON": addEffect(defender, "BADLY_POISON",-1);  break;
        case "FREEZE":       addEffect(defender, "FREEZE",      -1);  break;
        case "CONFUSE":      addEffect(defender, "CONFUSE",      3);  break;

        case "BOOST_ATK":
            attacker.statStages.atk = BOOST_STAT_MULTIPLIER;
            addEffect(attacker, "BOOST_ATK", 2);
            break;
        case "BOOST_DEF":
            attacker.statStages.def = BOOST_STAT_MULTIPLIER;
            addEffect(attacker, "BOOST_DEF", 2);
            break;
        case "BOOST_SPD":
            attacker.statStages.spd = BOOST_STAT_MULTIPLIER;
            addEffect(attacker, "BOOST_SPD", 2);
            break;
        case "BOOST_WATER_DMG":
            attacker.statStages.waterDmg = WATER_DAMAGE_BOOST_MULTIPLIER;
            addEffect(attacker, "BOOST_WATER_DMG", 2);
            break;

        case "LOWER_ATK":
            defender.statStages.atk = Math.max(0.2, defender.statStages.atk * LOWER_STAT_MULTIPLIER);
            break;
        case "LOWER_ATK_ALL": // In 1v1 affects only defender
            defender.statStages.atk = Math.max(0.2, defender.statStages.atk * LOWER_STAT_MULTIPLIER);
            break;
        case "LOWER_DEF":
            defender.statStages.def = Math.max(0.2, defender.statStages.def * LOWER_STAT_MULTIPLIER);
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
    events.push({ kind: "status_apply", actorId: attacker.studentId, targetId: defender.studentId, effect: eff });
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

        // Pre-select moves for both so we can compare priority
        const m1 = selectMove(f1, rng, f2);
        const m2 = selectMove(f2, rng, f1);
        const p1 = m1?.priority ?? 0;
        const p2 = m2?.priority ?? 0;

        // Turn order: priority DESC → speed DESC → random on tie
        const f1Spd = effectiveStat(f1.baseStats.spd, f1.statStages.spd);
        const f2Spd = effectiveStat(f2.baseStats.spd, f2.statStages.spd);

        // True when f1 goes first
        const f1First =
            p1 !== p2 ? p1 > p2 :
            f1Spd !== f2Spd ? f1Spd > f2Spd :
            rng() < 0.5;

        const [first, firstMove, second, secondMove] = f1First
            ? [f1, m1, f2, m2]
            : [f2, m2, f1, m1];

        // priorityOverride = move's priority tier is higher BUT fighter is slower than opponent
        const firstPriorityOverride =
            (firstMove?.priority ?? 0) > (secondMove?.priority ?? 0) &&
            effectiveStat(first.baseStats.spd, first.statStages.spd) <
            effectiveStat(second.baseStats.spd, second.statStages.spd);

        // First actor's move
        if (!checkSkip(first, events, rng) && !checkConfusion(first, events, rng)) {
            if (firstMove) executeMove(first, second, firstMove, events, rng, firstPriorityOverride);
        }

        // Check faint after first action (confusion self-hit can KO)
        if (second.currentHp <= 0 || first.currentHp <= 0) {
            const fainted = first.currentHp <= 0 ? first : second;
            events.push({ kind: "faint", actorId: fainted.studentId });
            turns.push(events);
            break;
        }

        // Second actor's move
        if (!checkSkip(second, events, rng) && !checkConfusion(second, events, rng)) {
            if (secondMove) executeMove(second, first, secondMove, events, rng, false);
        }

        // Check faint after second action
        if (first.currentHp <= 0) {
            events.push({ kind: "faint", actorId: first.studentId });
            turns.push(events);
            break;
        }

        // End-of-turn: apply DoT effects
        processEndOfTurn(first, events);
        if (first.currentHp <= 0) {
            events.push({ kind: "faint", actorId: first.studentId });
            turns.push(events);
            break;
        }
        processEndOfTurn(second, events);
        if (second.currentHp <= 0) {
            events.push({ kind: "faint", actorId: second.studentId });
            turns.push(events);
            break;
        }

        turns.push(events);
    }

    // Determine winner (most HP remaining; on exact draw, use seeded RNG to avoid challenger bias)
    const winnerId =
        f1.currentHp > f2.currentHp  ? f1.studentId :
        f2.currentHp > f1.currentHp  ? f2.studentId :
        (rng() < 0.5 ? f1.studentId : f2.studentId);

    const winner = winnerId === f1.studentId ? f1 : f2;
    const goldReward = GOLD_REWARD_BASE + winner.goldBonus;

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

/**
 * Resolve one turn with the player's explicit move choice.
 * Mutates `player` and `opponent` in-place (same as resolveBattle internals).
 * Returns the events for this turn and the ID of the fainted fighter (if any).
 */
export function resolveOneTurn(
    player: BattleFighter,
    opponent: BattleFighter,
    playerMoveId: string,
    rng: () => number
): OneTurnResult {
    const events: TurnEvent[] = [];

    const playerMove  = player.moves.find((m) => m.id === playerMoveId) ?? player.moves[0];
    const opponentMove = selectMove(opponent, rng, player);

    if (!playerMove) return { events, faintedId: null };

    const p1 = playerMove?.priority  ?? 0;
    const p2 = opponentMove?.priority ?? 0;
    const playerSpd   = effectiveStat(player.baseStats.spd,   player.statStages.spd);
    const opponentSpd = effectiveStat(opponent.baseStats.spd, opponent.statStages.spd);

    const playerFirst =
        p1 !== p2      ? p1 > p2 :
        playerSpd !== opponentSpd ? playerSpd > opponentSpd :
        rng() < 0.5;

    const [first, firstMove, second, secondMove] = playerFirst
        ? [player, playerMove, opponent, opponentMove]
        : [opponent, opponentMove, player, playerMove];

    const firstPriorityOverride =
        (firstMove?.priority ?? 0) > (secondMove?.priority ?? 0) &&
        effectiveStat(first.baseStats.spd,  first.statStages.spd) <
        effectiveStat(second.baseStats.spd, second.statStages.spd);

    // First actor
    if (!checkSkip(first, events, rng) && !checkConfusion(first, events, rng)) {
        if (firstMove) executeMove(first, second, firstMove, events, rng, firstPriorityOverride);
    }

    // Faint check after first action
    const faintedFirst = first.currentHp <= 0 ? first : second.currentHp <= 0 ? second : null;
    if (faintedFirst) {
        events.push({ kind: "faint", actorId: faintedFirst.studentId });
        return { events, faintedId: faintedFirst.studentId };
    }

    // Second actor
    if (!checkSkip(second, events, rng) && !checkConfusion(second, events, rng)) {
        if (secondMove) executeMove(second, first, secondMove, events, rng, false);
    }

    // Faint check after second action
    if (first.currentHp <= 0) {
        events.push({ kind: "faint", actorId: first.studentId });
        return { events, faintedId: first.studentId };
    }
    if (second.currentHp <= 0) {
        events.push({ kind: "faint", actorId: second.studentId });
        return { events, faintedId: second.studentId };
    }

    // End-of-turn: status DoT + passive abilities
    processEndOfTurn(first, events);
    if (first.currentHp <= 0) {
        events.push({ kind: "faint", actorId: first.studentId });
        return { events, faintedId: first.studentId };
    }
    processEndOfTurn(second, events);
    if (second.currentHp <= 0) {
        events.push({ kind: "faint", actorId: second.studentId });
        return { events, faintedId: second.studentId };
    }

    return { events, faintedId: null };
}

/** Compute the gold reward for a completed interactive battle */
export function calcGoldReward(winner: BattleFighter, loser: BattleFighter): number {
    void loser;
    return GOLD_REWARD_BASE + winner.goldBonus;
}




