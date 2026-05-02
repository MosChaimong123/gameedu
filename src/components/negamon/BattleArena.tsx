"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RotateCcw, ChevronRight } from "lucide-react";
import { getBattleItemById } from "@/lib/shop-items";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import type { BattleFighter, BattleResult, TurnEvent } from "@/lib/battle-engine";
import {
    effectiveStat,
    normalizeBattleFighterTurns,
} from "@/lib/battle-engine";
import { BattleField, FloatingText } from "@/components/negamon/BattleField";
import {
    PlayerHud,
    OpponentHud,
    type ActiveStatusView,
    BATTLE_HUD_DISPLAYABLE_EFFECTS,
} from "@/components/negamon/PokemonHud";
import { DialogueBox, type DialogueLine } from "@/components/negamon/DialogueBox";
import { ActionMenu } from "@/components/negamon/ActionMenu";
import { BattleResultScreen, type BattleStats } from "@/components/negamon/BattleResultScreen";
import { OpponentPicker } from "@/components/negamon/OpponentPicker";
import { BattleHistoryPanel } from "@/components/negamon/BattleHistoryPanel";
import { BattleItemBagPanel, BattlePrepDialog } from "@/components/negamon/battle-inventory-ui";
import type { BattleTabProps, Opponent } from "@/components/negamon/battle-tab.types";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { buildBasicAttackMove } from "@/lib/negamon-basic-move";
import { getMoveEnergyCost } from "@/lib/negamon-energy";
import { sanitizeLoadoutAgainstInventory, validateBattleLoadout } from "@/lib/battle-loadout";

function fighterHudCombatStats(f: BattleFighter) {
    return {
        baseStats: f.baseStats,
        statStages: {
            atk: f.statStages.atk,
            def: f.statStages.def,
            spd: f.statStages.spd,
        },
    };
}

// ── HP Bar ───────────────────────────────────────────────────

function HpBar({
    current, max, side,
}: {
    current: number; max: number; side: "left" | "right";
}) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const color = pct > 50 ? "from-emerald-400 to-green-500"
        : pct > 25 ? "from-yellow-400 to-amber-500"
        : "from-red-400 to-rose-500";

    return (
        <div className="space-y-1">
            <div className={cn("flex items-center gap-2 text-[11px] font-black", side === "right" && "flex-row-reverse")}>
                <span className="tabular-nums text-slate-700">{current}/{max}</span>
                <span className="text-slate-400">HP</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
                <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", color)}
                />
            </div>
        </div>
    );
}

// ── Fighter card ─────────────────────────────────────────────

// Reserved for future alternate battle card layouts.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FighterCard({
    fighter, side, isAttacking, isHurt,
}: {
    fighter: BattleFighter;
    side: "left" | "right";
    isAttacking: boolean;
    isHurt: boolean;
}) {
    return (
        <motion.div
            animate={
                isAttacking ? { x: side === "left" ? 20 : -20 } :
                isHurt      ? { x: [0, -8, 8, -4, 0] } :
                { x: 0 }
            }
            transition={{ duration: 0.25 }}
            className={cn(
                "flex flex-col items-center gap-2 rounded-[1.5rem] border-2 bg-white/90 p-3 shadow-md w-[48%]",
                isHurt ? "border-rose-300" : "border-slate-100"
            )}
        >
            {/* Avatar */}
            <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-100 bg-gradient-to-b from-slate-50 to-white shadow-sm"
            >
                <NegamonFormIcon
                    icon={fighter.formIcon}
                    label={fighter.formName}
                    className="h-full w-full"
                    emojiClassName="text-3xl"
                    width={56}
                    height={56}
                    imageClassName="h-full w-full object-contain"
                />
            </motion.div>

            {/* Name */}
            <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 leading-none">{fighter.formName}</p>
                <p className="text-xs font-black text-slate-700 leading-tight">{fighter.studentName}</p>
            </div>

            {/* HP */}
            <div className="w-full">
                <HpBar current={fighter.currentHp} max={fighter.maxHp} side={side} />
            </div>

            {/* Ability badge */}
            {fighter.abilityName && (
                <span className="rounded-full bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[9px] font-black text-violet-600">
                    ✨ {fighter.abilityName}
                </span>
            )}

            {/* Held items */}
            {fighter.activeItems.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                    {fighter.activeItems.map((itemId) => {
                        const item = getBattleItemById(itemId);
                        if (!item) return null;
                        return (
                            <span key={itemId} className="rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-black text-indigo-600">
                                {item.icon}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Active status badges */}
            {fighter.effects.filter((e) => STATUS_LABEL[e.effect]).length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                    {fighter.effects
                        .filter((e) => STATUS_LABEL[e.effect])
                        .map((e, i) => {
                            const color =
                                e.effect === "BURN"         ? "bg-orange-100 text-orange-600" :
                                e.effect === "FREEZE"       ? "bg-sky-100 text-sky-600" :
                                e.effect === "PARALYZE"     ? "bg-yellow-100 text-yellow-700" :
                                e.effect === "SLEEP"        ? "bg-indigo-100 text-indigo-600" :
                                e.effect === "CONFUSE"      ? "bg-pink-100 text-pink-600" :
                                e.effect === "POISON" || e.effect === "BADLY_POISON"
                                    ? "bg-purple-100 text-purple-600" :
                                "bg-slate-100 text-slate-500";
                            return (
                                <span key={i} className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-black", color)}>
                                    {EFFECT_ICON[e.effect]} {STATUS_LABEL[e.effect]}
                                    {e.turnsLeft > 0 && <span className="opacity-60"> ×{e.turnsLeft}</span>}
                                </span>
                            );
                        })}
                </div>
            )}
        </motion.div>
    );
}

const EFFECT_ICON: Partial<Record<string, string>> = {
    BOOST_WATER_DMG: "WTR+",
    LOWER_ATK: "ATK-",
    LOWER_DEF: "DEF-",
    LOWER_SPD: "SPD-",
    LOWER_EN_REGEN: "EN-",
    IGNORE_DEF: "BRK",
    BURN: "🔥", POISON: "☠️", BADLY_POISON: "☠️☠️",
    PARALYZE: "⚡", SLEEP: "💤", FREEZE: "❄️", CONFUSE: "😵",
    BOOST_ATK: "⬆️ATK",
    BOOST_DEF: "⬆️DEF",
    BOOST_DEF_20: "⬆️DEF",
    BOOST_SPD: "⬆️SPD",
    BOOST_SPD_30: "⬆️SPD",
    BOOST_SPD_100: "⬆️SPD",
};

const STATUS_LABEL: Partial<Record<string, string>> = {
    BOOST_ATK: "บัฟโจมตี",
    BOOST_DEF: "บัฟป้องกัน",
    BOOST_DEF_20: "บัฟป้องกัน",
    BOOST_SPD: "บัฟความเร็ว",
    BOOST_SPD_30: "บัฟความเร็ว",
    BOOST_SPD_100: "บัฟความเร็ว",
    BOOST_WATER_DMG: "บัฟน้ำ",
    LOWER_ATK: "ลดโจมตี",
    LOWER_DEF: "ลดป้องกัน",
    LOWER_SPD: "ลดความเร็ว",
    LOWER_EN_REGEN: "ดูด EN",
    IGNORE_DEF: "เจาะเกราะ",
    BURN: "ไหม้", POISON: "พิษ", BADLY_POISON: "พิษหนัก",
    PARALYZE: "อัมพาต", SLEEP: "นอนหลับ", FREEZE: "แข็งตัว", CONFUSE: "สับสน",
};

// ── Event log row ─────────────────────────────────────────────

function effectivenessLabel(
    eff: TurnEvent["effectiveness"],
    t: (key: string, params?: Record<string, string | number>) => string
) {
    if (eff === "super") return <span className="text-amber-500 font-black text-[10px]">{t("battleEffectivenessSuper")}</span>;
    if (eff === "weak")  return <span className="text-slate-400 font-bold text-[10px]">{t("battleEffectivenessWeak")}</span>;
    return null;
}

function getStatusLabel(
    effect: string | undefined,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    if (!effect) return "?";
    const key = `battleStatus${effect}`;
    const translated = t(key);
    return translated === key ? STATUS_LABEL[effect] ?? effect : translated;
}

function battleStatusApplyMessage(
    effect: string | undefined,
    targetName: string | undefined,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const name = targetName ?? "?";
    const icon = EFFECT_ICON[effect ?? ""] ?? "";
    switch (effect) {
        case "BURN": return t("battleLogApplyBURN", { name, icon });
        case "POISON": return t("battleLogApplyPOISON", { name, icon });
        case "BADLY_POISON": return t("battleLogApplyBADLY_POISON", { name, icon });
        case "PARALYZE": return t("battleLogApplyPARALYZE", { name, icon });
        case "SLEEP": return t("battleLogApplySLEEP", { name, icon });
        case "FREEZE": return t("battleLogApplyFREEZE", { name, icon });
        case "CONFUSE": return t("battleLogApplyCONFUSE", { name, icon });
        case "LOWER_ATK":
        case "LOWER_ATK_ALL": return t("battleLogApplyLowerAtk", { name, icon });
        case "LOWER_DEF": return t("battleLogApplyLowerDef", { name, icon });
        case "LOWER_SPD": return t("battleLogApplyLowerSpd", { name, icon });
        case "LOWER_EN_REGEN": return t("battleLogApplyLowerEnRegen", { name, icon });
        case "BOOST_ATK": return t("battleLogApplyBoostAtk", { name, icon });
        case "BOOST_DEF":
        case "BOOST_DEF_20": return t("battleLogApplyBoostDef", { name, icon });
        case "BOOST_SPD":
        case "BOOST_SPD_30":
        case "BOOST_SPD_100": return t("battleLogApplyBoostSpd", { name, icon });
        case "IGNORE_DEF": return t("battleLogApplyIgnoreDef", { name, icon });
        default: return t("battleLogApplyGeneric", { name });
    }
}

function battleStatusTickMessage(
    effect: string | undefined,
    actorName: string | undefined,
    value: number | undefined,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const name = actorName ?? "?";
    const icon = EFFECT_ICON[effect ?? ""] ?? "";
    const tickValue = value ?? 0;
    switch (effect) {
        case "BURN": return t("battleLogTickBURN", { name, value: tickValue, icon });
        case "POISON": return t("battleLogTickPOISON", { name, value: tickValue, icon });
        case "BADLY_POISON": return t("battleLogTickBADLY_POISON", { name, value: tickValue, icon });
        default: return t("battleLogTickGeneric", { name, value: tickValue });
    }
}

function battleSkipMessage(
    effect: string | undefined,
    actorName: string | undefined,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const name = actorName ?? "?";
    const icon = EFFECT_ICON[effect ?? ""] ?? "";
    switch (effect) {
        case "SLEEP": return t("battleLogSkipSLEEP", { name, icon });
        case "PARALYZE": return t("battleLogSkipPARALYZE", { name, icon });
        case "FREEZE": return t("battleLogSkipFREEZE", { name, icon });
        default: return t("battleLogSkipGeneric", { name });
    }
}

function battleAbilityMessage(
    event: TurnEvent,
    actorName: string,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const ability = event.abilityName ?? "Ability";
    switch (event.abilityId) {
        case "rage_mode":
            return t("battleAbilityRageMode", { ability, name: actorName, icon: "ATK+" });
        case "guardian_scale":
            return t("battleAbilityGuardianScale", { ability, name: actorName, value: event.value ?? 0, icon: "DEF" });
        default:
            return t("battleAbilityDefault", { ability });
    }
}

/** Secondary line for status_apply: turns + optional EffectEntry numbers */
function formatStatusApplyMetaLine(
    event: TurnEvent,
    t: (key: string, params?: Record<string, string | number>) => string
): string | undefined {
    const parts: string[] = [];
    if (event.turnsLeft != null) {
        parts.push(t("battleStatusMetaTurnsLeft", { n: event.turnsLeft }));
    }
    if (event.regenPenalty != null && event.regenPenalty > 0) {
        parts.push(t("battleStatusMetaEnDrain", { value: event.regenPenalty }));
    }
    if (event.burnDotRate != null) {
        parts.push(t("battleStatusMetaBurnRate", { pct: Math.round(event.burnDotRate * 100) }));
    }
    if (event.ignoreDefRetained != null) {
        parts.push(t("battleStatusMetaIgnoreDef", { mult: Number(event.ignoreDefRetained.toFixed(2)) }));
    }
    return parts.length ? parts.join(" · ") : undefined;
}

// Reserved for future compact event log rendering.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EventRow({ event, fighters }: { event: TurnEvent; fighters: [BattleFighter, BattleFighter] }) {
    const { t } = useLanguage();
    const actor  = fighters.find((f) => f.studentId === event.actorId);
    const target = fighters.find((f) => f.studentId === event.targetId);

    const icon =
        event.kind === "damage"          ? "⚔️" :
        event.kind === "miss"            ? "💨" :
        event.kind === "heal"            ? "💚" :
        event.kind === "status_apply"    ? "✨" :
        event.kind === "status_tick"     ? "💢" :
        event.kind === "status_end"      ? "🔄" :
        event.kind === "skip_turn"       ? "😴" :
        event.kind === "confusion_hit"   ? "😵" :
        event.kind === "freeze_thaw"     ? "❄️" :
        event.kind === "ability_trigger" ? "🌟" :
        event.kind === "faint"           ? "💀" :
        event.kind === "extra_action"    ? "💨" :
        event.kind === "no_energy"       ? "🔋" : "▶️";

    const abilityMsg = event.kind === "ability_trigger"
        ? battleAbilityMessage(event, actor?.studentName ?? "?", t)
        : null;

    const msg = abilityMsg ??
        (event.kind === "move_used"     ? t("battleLogMoveUsed", { name: actor?.studentName ?? "?", move: event.moveName ?? "?" }) :
        event.kind === "miss"           ? t("battleLogMiss", { name: actor?.studentName ?? "?" }) :
        event.kind === "damage"         ? t("battleLogDamage", { target: target?.studentName ?? "?", value: event.value ?? 0 }) :
        event.kind === "heal"           ? t("battleLogHeal", { name: actor?.studentName ?? "?", value: event.value ?? 0 }) :
        event.kind === "status_apply"   ? battleStatusApplyMessage(event.effect, target?.studentName ?? actor?.studentName, t) :
        event.kind === "status_tick"    ? battleStatusTickMessage(event.effect, actor?.studentName, event.value, t) :
        event.kind === "status_end"     ? t("battleLogStatusEnd", { status: getStatusLabel(event.effect, t), name: actor?.studentName ?? "?" }) :
        event.kind === "skip_turn"      ? battleSkipMessage(event.effect, actor?.studentName, t) :
        event.kind === "confusion_hit"  ? t("battleLogConfusionHit", { name: actor?.studentName ?? "?", value: event.value ?? 0 }) :
        event.kind === "freeze_thaw"    ? t("battleLogFreezeThaw", { name: actor?.studentName ?? "?" }) :
        event.kind === "extra_action"   ? t("battleExtraAction", { name: actor?.studentName ?? "?" }) :
        event.kind === "no_energy"      ? t("battleNoEnergyMove", {
            name: actor?.studentName ?? "?",
            move: event.moveName ?? "?",
            current: event.currentEnergy ?? 0,
            required: event.requiredEnergy ?? 0,
        }) :
        event.kind === "faint"          ? t("battleLogFaint", { name: actor?.studentName ?? "?" }) : "");

    return (
        <div className="flex items-start gap-2 py-0.5">
            <span className="text-sm shrink-0">{icon}</span>
            <div className="min-w-0 flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-slate-700">{msg}</span>
                {event.kind === "move_used" && event.priorityOverride && (
                    <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-black text-sky-600">{t("battleBadgePriority")}</span>
                )}
                {event.kind === "damage" && event.stab && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">{t("battleBadgeStab")}</span>
                )}
                {event.kind === "damage" && event.crit && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-600">{t("battleBadgeCrit")}</span>
                )}
                {event.effectiveness && effectivenessLabel(event.effectiveness, t)}
            </div>
        </div>
    );
}

// ── Opponent picker ───────────────────────────────────────────

const TURN_DELAY_MS = 900;

function cloneBattleFighter(fighter: BattleFighter): BattleFighter {
    return normalizeBattleFighterTurns(JSON.parse(JSON.stringify(fighter)) as BattleFighter);
}

/** Approximate per-actor completed steps for replay (matches engine: one increment per action resolution). */
function replayActorStepCount(
    turns: BattleResult["turns"],
    upToTurnExclusive: number,
    studentId: string
): number {
    let n = 0;
    for (let ti = 0; ti < upToTurnExclusive; ti++) {
        for (const e of turns[ti]) {
            if (e.actorId !== studentId) continue;
            if (e.kind === "move_used" || e.kind === "skip_turn" || e.kind === "confusion_hit") {
                n += 1;
            }
        }
    }
    return n;
}

/** Reconstruct live HP for both fighters up to turnIndex (exclusive) */
function computeHpAtTurn(
    fighters: [BattleFighter, BattleFighter],
    turns: BattleFighter["effects"] extends unknown ? ReturnType<() => BattleResult["turns"]> : never,
    upToTurn: number
): [number, number] {
    let hp0 = fighters[0].maxHp;
    let hp1 = fighters[1].maxHp;
    const id0 = fighters[0].studentId;

    for (let t = 0; t < upToTurn; t++) {
        for (const evt of turns[t]) {
            if (evt.kind === "damage" || evt.kind === "status_tick" || evt.kind === "confusion_hit") {
                const v = evt.value ?? 0;
                if (evt.actorId === id0 && (evt.kind === "status_tick" || evt.kind === "confusion_hit")) hp0 = Math.max(0, hp0 - v);
                else if (evt.targetId === id0 && evt.kind === "damage") hp0 = Math.max(0, hp0 - v);
                else if (evt.actorId !== id0 && (evt.kind === "status_tick" || evt.kind === "confusion_hit")) hp1 = Math.max(0, hp1 - v);
                else if (evt.targetId !== id0 && evt.kind === "damage") hp1 = Math.max(0, hp1 - v);
            }
            if (evt.kind === "heal" || (evt.kind === "ability_trigger" && evt.value)) {
                const v = evt.value ?? 0;
                if (evt.actorId === id0) hp0 = Math.min(fighters[0].maxHp, hp0 + v);
                else hp1 = Math.min(fighters[1].maxHp, hp1 + v);
            }
        }
    }
    return [hp0, hp1];
}

// ── Event → Dialogue lines ────────────────────────────────────

function eventToDialogueLines(
    event: TurnEvent,
    fighters: [BattleFighter, BattleFighter],
    t: (key: string, params?: Record<string, string | number>) => string
): DialogueLine[] {
    const actor  = fighters.find((f) => f.studentId === event.actorId);
    const target = fighters.find((f) => f.studentId === event.targetId);
    const aName  = actor?.studentName  ?? "?";
    const tName  = target?.studentName ?? "?";

    switch (event.kind) {
        case "move_used": {
            const badges: DialogueLine["badges"] = [];
            if (event.priorityOverride) badges.push({ label: t("battleBadgePriority"), color: "bg-sky-100 text-sky-700" });
            return [{
                text: t("battleLogMoveUsed", { name: aName, move: event.moveName ?? "?" }),
                actor: aName,
                actorIcon: actor?.formIcon,
                skill: event.moveName ?? "?",
                damageText: t("battleDialoguePreparingAttack"),
                badges,
            }];
        }
        case "damage": {
            const badges: DialogueLine["badges"] = [];
            if (event.crit) badges.push({ label: t("battleBadgeCrit"), color: "bg-red-100 text-red-600" });
            if (event.stab) badges.push({ label: t("battleBadgeStab"), color: "bg-amber-100 text-amber-700" });
            if (event.effectiveness === "super") badges.push({ label: t("battleBadgeSuper"), color: "bg-orange-100 text-orange-600" });
            if (event.effectiveness === "weak") badges.push({ label: t("battleBadgeWeak"), color: "bg-slate-100 text-slate-500" });
            return [{
                text: t("battleLogDamage", { target: tName, value: event.value ?? 0 }),
                actor: aName,
                actorIcon: actor?.formIcon,
                skill: event.moveName ?? t("battleDialogueBasicAttack"),
                damageText: `-${event.value ?? 0} HP`,
                statusText: t("battleDialogueTarget", { name: tName }),
                badges,
            }];
        }
        case "miss":
            return [{ text: t("battleLogMiss", { name: aName }) }];
        case "heal":
            return [{
                text: t("battleLogHeal", { name: aName, value: event.value ?? 0 }),
                actor: aName,
                actorIcon: actor?.formIcon,
                skill: t("battleDialogueHealSkill"),
                damageText: `+${event.value ?? 0} HP`,
            }];
        case "faint":
            return [{ text: t("battleLogFaint", { name: aName }) }];
        case "status_apply": {
            const statusMessage = battleStatusApplyMessage(event.effect, tName || aName, t);
            const metaLine = formatStatusApplyMetaLine(event, t);
            const turnsChip =
                event.turnsLeft != null
                    ? t("battleStatusMetaTurnsShort", { n: event.turnsLeft })
                    : event.effect
                      ? EFFECT_ICON[event.effect] ?? t("battleDialogueStatusSkill")
                      : t("battleDialogueStatusSkill");
            return [{
                text: statusMessage,
                actor: aName,
                actorIcon: actor?.formIcon,
                skill: event.moveName ?? t("battleDialogueStatusSkill"),
                damageText: turnsChip,
                statusText: metaLine ?? statusMessage,
            }];
        }
        case "status_tick":
            return [{
                text: battleStatusTickMessage(event.effect, aName, event.value, t),
                actor: aName,
                actorIcon: actor?.formIcon,
                skill: t("battleDialogueOngoingEffect"),
                damageText: `-${event.value ?? 0} HP`,
                statusText: event.effect ? getStatusLabel(event.effect, t) : undefined,
            }];
        case "status_end":
            return [{ text: t("battleLogStatusEnd", { status: getStatusLabel(event.effect, t), name: aName }) }];
        case "skip_turn":
            return [{ text: battleSkipMessage(event.effect, aName, t) }];
        case "confusion_hit":
            return [{ text: t("battleLogConfusionHit", { name: aName, value: event.value ?? 0 }) }];
        case "freeze_thaw":
            return [{ text: t("battleLogFreezeThaw", { name: aName }) }];
        case "ability_trigger":
            return [{ text: battleAbilityMessage(event, aName, t) }];
        case "no_energy":
            return [{
                text: t("battleNoEnergyMove", {
                    name: aName,
                    move: event.moveName ?? "?",
                    current: event.currentEnergy ?? 0,
                    required: event.requiredEnergy ?? 0,
                }),
                actor: aName,
                actorIcon: actor?.formIcon,
                skill: event.moveName ?? t("battleDialogueStatusSkill"),
                damageText: `EN ${event.currentEnergy ?? 0}/${event.requiredEnergy ?? 0}`,
                statusText: t("battleDialogueNoEnergyAttack"),
            }];
        default:
            return [];
    }
}

function pickDamageEventForAnimation(events: TurnEvent[]): TurnEvent | null {
    // Anchor on the last move_used in this batch, then take the first matching damage after it.
    // This prevents damage text from jumping to the wrong side when mixed events are present.
    for (let i = events.length - 1; i >= 0; i -= 1) {
        const evt = events[i];
        if (evt.kind !== "move_used") continue;
        for (let j = i + 1; j < events.length; j += 1) {
            const cand = events[j];
            if (cand.kind !== "damage") continue;
            if (!cand.targetId) continue;
            if (cand.actorId === evt.actorId) {
                return cand;
            }
        }
    }

    for (let i = events.length - 1; i >= 0; i -= 1) {
        const evt = events[i];
        if (evt.kind === "damage" && evt.targetId) return evt;
    }
    return null;
}

function pickAutoMoveId(fighter: BattleFighter): string {
    let bestId = fighter.moves[0]?.id ?? buildBasicAttackMove().id;
    let bestScore = -1;
    for (const move of fighter.moves) {
        const energyCost = move.energyCost ?? getMoveEnergyCost(move, fighter.speciesId);
        if (fighter.currentEnergy < energyCost) continue;
        const score = (move.power ?? 0) + ((move.critBonus ?? 0) * 0.2);
        if (score > bestScore) {
            bestScore = score;
            bestId = move.id;
        }
    }
    return bestId;
}

// ── Battle replay ─────────────────────────────────────────────

function BattleReplay({
    result,
    myId,
    onReset,
}: {
    result: BattleResult;
    myId: string;
    onReset: () => void;
}) {
    const { t } = useLanguage();
    const [shownTurns, setShownTurns] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [attackingId, setAttackingId] = useState<string | null>(null);
    const [hurtId, setHurtId] = useState<string | null>(null);
    const [flashId, setFlashId] = useState<string | null>(null);
    const [faintedId, setFaintedId] = useState<string | null>(null);
    const [floatingDmg, setFloatingDmg] = useState<{ id: string; value: number; crit?: boolean } | null>(null);
    const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);
    const fighters = result.fighters;

    const isWinner = result.winnerId === myId;
    const allDone = shownTurns >= result.turns.length;

    // Live HP reconstructed from events
    const [liveHp0, liveHp1] = computeHpAtTurn(fighters, result.turns, shownTurns);

    // Determine player vs opponent (myId = player)
    const playerIdx = fighters[0].studentId === myId ? 0 : 1;
    const opponentIdx = playerIdx === 0 ? 1 : 0;
    const player   = fighters[playerIdx];
    const opponent = fighters[opponentIdx];
    const playerHp   = playerIdx === 0 ? liveHp0 : liveHp1;
    const opponentHp = playerIdx === 0 ? liveHp1 : liveHp0;

    // Animate through turns
    useEffect(() => {
        if (!playing || allDone) return;
        const timer = setTimeout(() => {
            const turnEvents = result.turns[shownTurns];

            // Trigger animations from events
            const dmgEvt = pickDamageEventForAnimation(turnEvents);
            if (dmgEvt) {
                setAttackingId(dmgEvt.actorId);
                setFlashId(dmgEvt.targetId ?? null);
                setHurtId(dmgEvt.targetId ?? null);
                setFloatingDmg({
                    id: dmgEvt.targetId ?? "",
                    value: dmgEvt.value ?? 0,
                    crit: dmgEvt.crit,
                });
                setTimeout(() => {
                    setAttackingId(null);
                    setHurtId(null);
                    setFlashId(null);
                }, 500);
            }

            const faintEvt = turnEvents.find((e) => e.kind === "faint");
            if (faintEvt) setFaintedId(faintEvt.actorId);

            // Append dialogue lines for this turn
            const newLines: DialogueLine[] = turnEvents.flatMap((evt) =>
                eventToDialogueLines(evt, fighters, t)
            );
            if (newLines.length > 0) {
                setDialogueLines((prev) => [...prev, ...newLines]);
            }

            setShownTurns((n) => n + 1);
        }, TURN_DELAY_MS);
        return () => clearTimeout(timer);
        // Replay animation is keyed by replay state and turn stream; `fighters` is immutable replay input here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing, shownTurns, allDone, result.turns]);

    // Active statuses at current turn
    function getStatuses(fighter: BattleFighter): ActiveStatusView[] {
        return fighter.effects
            .filter((e) => BATTLE_HUD_DISPLAYABLE_EFFECTS.has(e.effect))
            .map((e) => ({ effect: e.effect, turnsLeft: e.turnsLeft }));
    }

    return (
        <div className="space-y-3">

            {/* ── Pokémon-style Battle Scene ── */}
            <div className="relative">
                <BattleField
                    player={{
                        studentId: player.studentId,
                        formIcon:  player.formIcon,
                        formName:  player.formName,
                        type:      player.type,
                        currentHp: playerHp,
                        maxHp:     player.maxHp,
                    }}
                    opponent={{
                        studentId: opponent.studentId,
                        formIcon:  opponent.formIcon,
                        formName:  opponent.formName,
                        type:      opponent.type,
                        currentHp: opponentHp,
                        maxHp:     opponent.maxHp,
                    }}
                    attackingId={attackingId}
                    hurtId={hurtId}
                    flashId={flashId}
                    faintedId={faintedId}
                />

                {/* HUD overlay */}
                {/* Opponent HUD — top-right (same side as opponent sprite) */}
                <div className="pointer-events-none absolute top-2 right-2 z-20">
                    <OpponentHud
                        name={opponent.studentName}
                        formName={opponent.formName}
                        rankIndex={opponent.rankIndex}
                        turnsCompleted={replayActorStepCount(result.turns, shownTurns, opponent.studentId)}
                        currentHp={opponentHp}
                        maxHp={opponent.maxHp}
                        activeStatuses={getStatuses(opponent)}
                        abilityName={opponent.abilityName}
                        combatStats={fighterHudCombatStats(opponent)}
                        currentEnergy={opponent.currentEnergy}
                        maxEnergy={opponent.maxEnergy}
                    />
                </div>

                {/* Player HUD — bottom-left (same side as player sprite) */}
                <div className="pointer-events-none absolute bottom-2 left-2 z-20">
                    <PlayerHud
                        name={player.studentName}
                        formName={player.formName}
                        rankIndex={player.rankIndex}
                        turnsCompleted={replayActorStepCount(result.turns, shownTurns, player.studentId)}
                        currentHp={playerHp}
                        maxHp={player.maxHp}
                        activeStatuses={getStatuses(player)}
                        abilityName={player.abilityName}
                        activeItemIcons={player.activeItems.map((id) => getBattleItemById(id)?.icon ?? "").filter(Boolean)}
                        combatStats={fighterHudCombatStats(player)}
                        currentEnergy={player.currentEnergy}
                        maxEnergy={player.maxEnergy}
                    />
                </div>

                {floatingDmg ? (
                    <div className="pointer-events-none absolute inset-0 z-[45] overflow-visible">
                        <FloatingText
                            text={
                                floatingDmg.crit
                                    ? `💥 ${floatingDmg.value}!!`
                                    : `−${floatingDmg.value}`
                            }
                            side={floatingDmg.id === player.studentId ? "player" : "opponent"}
                            color={floatingDmg.crit ? "#fbbf24" : "#f87171"}
                            show
                        />
                    </div>
                ) : null}

                {/* Turn counter — below floating damage layer (z-45) */}
                <div className="absolute top-2 right-2 z-30 rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-black text-white/80">
                    T{shownTurns}/{result.turns.length}
                </div>
            </div>

            {/* Result banner */}
            <AnimatePresence>
                {allDone && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "rounded-2xl border-4 p-4 text-center",
                            isWinner
                                ? "border-yellow-400 bg-yellow-50"
                                : "border-slate-200 bg-slate-50"
                        )}
                    >
                        <p className="text-2xl mb-1">{isWinner ? "🏆" : "💀"}</p>
                        <p className="text-base font-black text-slate-800">
                            {isWinner ? t("battleResultWin") : t("battleResultLose")}
                        </p>
                        {isWinner && (
                            <div className="mt-2 flex items-center justify-center gap-1">
                                <Coins className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-black text-yellow-700">+{result.goldReward}G</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dialogue box */}
            {dialogueLines.length > 0 && (
                <DialogueBox
                    lines={dialogueLines}
                    cps={38}
                    autoAdvanceMs={allDone ? 0 : 1300}
                />
            )}
            {!allDone && playing && dialogueLines.length === 0 && (
                <div className="rounded-2xl border-[3px] border-slate-800 bg-white px-4 py-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.35)] min-h-[64px] flex items-center">
                    <p className="text-sm font-bold text-slate-400 animate-pulse">{t("battleStarting")}</p>
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-2">
                {!allDone && (
                    <button
                        type="button"
                        onClick={() => setPlaying(!playing)}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-black text-slate-600"
                    >
                        {playing ? t("battleReplayPause") : t("battleReplayPlay")}
                    </button>
                )}
                {!allDone && (
                    <button
                        type="button"
                        onClick={() => {
                            const allLines = result.turns.flatMap((turn) =>
                                turn.flatMap((evt) => eventToDialogueLines(evt, fighters, t))
                            );
                            setDialogueLines(allLines);
                            setShownTurns(result.turns.length);
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-black text-slate-600 flex items-center justify-center gap-1"
                    >
                        <ChevronRight className="h-3.5 w-3.5" /> {t("battleSkipResult")}
                    </button>
                )}
                {allDone && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex-1 rounded-xl border-b-2 border-indigo-600 bg-gradient-to-b from-indigo-400 to-indigo-500 py-2 text-xs font-black text-white flex items-center justify-center gap-1 active:translate-y-px active:border-b-0"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> {t("battleRematch")}
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Interactive Battle (Phase 3 / 4) ─────────────────────────

const ANIM_DELAY_MS = 1600; // ms between turn events during animation phase
const BATTLE_SPEED_STORAGE_KEY = "negamon_battle_speed_multiplier";
const BATTLE_AUTO_MODE_STORAGE_KEY = "negamon_battle_auto_mode";

function readStoredBattleSpeed(): 1 | 2 | 3 {
    if (typeof window === "undefined") return 1;
    try {
        const raw = window.localStorage.getItem(BATTLE_SPEED_STORAGE_KEY);
        return raw === "1" || raw === "2" || raw === "3" ? (Number(raw) as 1 | 2 | 3) : 1;
    } catch {
        return 1;
    }
}

function readStoredBattleAutoMode(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(BATTLE_AUTO_MODE_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

type IBPhase = "picking" | "animating" | "result";

interface InteractiveBattleProps {
    /** Player's initialized fighter (mutable — will be updated in place via ref) */
    initialPlayer: BattleFighter;
    /** Opponent's initialized fighter */
    initialOpponent: BattleFighter;
    myId: string;
    classId: string;
    challengerId: string;
    defenderId: string;
    studentCode: string;
    sessionId: string;
    onFinish: (winnerId: string, goldReward: number) => void;
    onReset: () => void;
}

type InteractiveTurnResponse = {
    events: TurnEvent[];
    faintedId: string | null;
    player: BattleFighter;
    opponent: BattleFighter;
    totalTurns: number;
    actorSide: "player" | "opponent";
    final: null | {
        winnerId: string;
        requestedGoldReward: number;
        goldReward: number;
        rewardBlockedReason: string | null;
    };
};

type InteractiveTurnFailure = {
    error: string;
    actorSide?: "player" | "opponent";
};

function isInteractiveTurnFailure(
    turn: InteractiveTurnResponse | InteractiveTurnFailure
): turn is InteractiveTurnFailure {
    return "error" in turn;
}

function InteractiveBattle({
    initialPlayer,
    initialOpponent,
    myId,
    classId,
    challengerId,
    defenderId,
    studentCode,
    sessionId,
    onFinish,
    onReset,
}: InteractiveBattleProps) {
    const { t } = useLanguage();

    // Deep-copy fighters into refs so we can mutate them across turns
    const playerRef   = useRef<BattleFighter>(JSON.parse(JSON.stringify(initialPlayer)));
    const opponentRef = useRef<BattleFighter>(JSON.parse(JSON.stringify(initialOpponent)));
    const turnRef     = useRef(0);

    const isChallenger = myId === challengerId;
    const [renderFighters, setRenderFighters] = useState(() => ({
        player: cloneBattleFighter(isChallenger ? initialPlayer : initialOpponent),
        opponent: cloneBattleFighter(isChallenger ? initialOpponent : initialPlayer),
    }));

    const [phase, setPhase]           = useState<IBPhase>("picking");
    const [started, setStarted]       = useState(false);
    const [turnIndex, setTurnIndex]   = useState(0);
    const [subStep, setSubStep]       = useState(1);
    const [nextActor, setNextActor] = useState<"player" | "opponent">("player");
    const [autoMode, setAutoMode] = useState(readStoredBattleAutoMode);
    const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 3>(readStoredBattleSpeed);
    const [dialogueLines, setDialogue] = useState<DialogueLine[]>([]);
    const [faintedId, setFaintedId]   = useState<string | null>(null);
    const [winnerId, setWinnerId]     = useState<string | null>(null);
    const [goldReward, setGoldReward] = useState(0);

    // Battle stats
    const statsRef = useRef<BattleStats>({
        damageDealt: 0, damageReceived: 0, healsUsed: 0, critCount: 0, turnCount: 0,
    });
    const [finalStats, setFinalStats] = useState<BattleStats | null>(null);

    // Flash / hurt animation state
    const [flashId, setFlashId]       = useState<string | null>(null);
    const [hurtId, setHurtId]         = useState<string | null>(null);
    const [attackingId, setAttackingId] = useState<string | null>(null);
    const [floatingDmg, setFloatingDmg] = useState<{ id: string; value: number; crit?: boolean } | null>(null);

    function getStatuses(fighter: BattleFighter): ActiveStatusView[] {
        return fighter.effects
            .filter((e) => BATTLE_HUD_DISPLAYABLE_EFFECTS.has(e.effect))
            .map((e) => ({ effect: e.effect, turnsLeft: e.turnsLeft }));
    }

    const syncRenderFighters = useCallback(() => {
        setRenderFighters({
            player: cloneBattleFighter(isChallenger ? playerRef.current : opponentRef.current),
            opponent: cloneBattleFighter(isChallenger ? opponentRef.current : playerRef.current),
        });
    }, [isChallenger]);

    const renderPlayer = renderFighters.player;
    const renderOpponent = renderFighters.opponent;
    const getDelay = useCallback((ms: number) => Math.max(120, Math.floor(ms / speedMultiplier)), [speedMultiplier]);
    const playerOpeningSpd = effectiveStat(renderPlayer.baseStats.spd, renderPlayer.statStages.spd);
    const opponentOpeningSpd = effectiveStat(renderOpponent.baseStats.spd, renderOpponent.statStages.spd);
    const playerOpeningQueue = playerOpeningSpd >= opponentOpeningSpd ? 1 : 2;
    const openingStarterName = playerOpeningQueue === 1 ? renderPlayer.studentName : renderOpponent.studentName;
    const playerCanAct = started && phase === "picking" && nextActor === "player";

    function handleStartBattle() {
        setStarted(true);
        setNextActor(playerOpeningQueue === 1 ? "player" : "opponent");
        setDialogue([{
            text:
                playerOpeningQueue === 1
                    ? t("battleOpeningTurn", { name: openingStarterName })
                    : t("battleOpeningTurnQueued", {
                        name: openingStarterName,
                        other: renderPlayer.studentName,
                    }),
            actor: openingStarterName,
            actorIcon: playerOpeningQueue === 1 ? renderPlayer.formIcon : renderOpponent.formIcon,
            skill: t("battleDialogueOpeningSkill"),
            damageText: t("battleDialogueQueueShort", { position: playerOpeningQueue === 1 ? 1 : 2 }),
            statusText: t("battleDialogueSpdCompare", {
                player: playerOpeningSpd,
                opponent: opponentOpeningSpd,
            }),
        }]);
    }

    async function requestServerTurn(moveId?: string): Promise<InteractiveTurnResponse | InteractiveTurnFailure | null> {
        try {
            const res = await fetch(`/api/classrooms/${classId}/battle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challengerId,
                    defenderId,
                    studentCode,
                    mode: "turnInteractive",
                    sessionId,
                    moveId,
                }),
            });
            const json = await res.json();
            if (!res.ok) return json as InteractiveTurnFailure;
            return json as InteractiveTurnResponse;
        } catch {
            return null;
        }
    }

    function accumulateBattleStats(events: TurnEvent[]) {
        const activePlayer = isChallenger ? playerRef.current : opponentRef.current;
        for (const evt of events) {
            if (evt.kind === "damage") {
                if (evt.actorId === activePlayer.studentId) {
                    statsRef.current.damageDealt += evt.value ?? 0;
                } else {
                    statsRef.current.damageReceived += evt.value ?? 0;
                }
                if (evt.crit) statsRef.current.critCount += 1;
            }
            if (evt.kind === "heal" && evt.actorId === activePlayer.studentId) {
                statsRef.current.healsUsed += evt.value ?? 0;
            }
            if (evt.kind === "confusion_hit" && evt.actorId === activePlayer.studentId) {
                statsRef.current.damageReceived += evt.value ?? 0;
            }
        }
    }

    function appendDialogueForEvents(events: TurnEvent[]) {
        const pair: [BattleFighter, BattleFighter] = [playerRef.current, opponentRef.current];
        const lines = events.flatMap((evt) => eventToDialogueLines(evt, pair, t));
        setDialogue((prev) => [...prev, ...lines]);
    }

    function playHalfTurnAnimations(events: TurnEvent[], onDone: () => void) {
        const dmgEvt = pickDamageEventForAnimation(events);
        if (dmgEvt) {
            setAttackingId(dmgEvt.actorId);
            setFlashId(dmgEvt.targetId ?? null);
            setHurtId(dmgEvt.targetId ?? null);
            setFloatingDmg({
                id: dmgEvt.targetId ?? "",
                value: dmgEvt.value ?? 0,
                crit: dmgEvt.crit,
            });
            setTimeout(() => {
                setAttackingId(null);
                setHurtId(null);
                setFlashId(null);
                onDone();
            }, getDelay(500));
        } else {
            setTimeout(onDone, getDelay(350));
        }
    }

    function applyServerFighters(serverPlayer: BattleFighter, serverOpponent: BattleFighter) {
        if (isChallenger) {
            playerRef.current = cloneBattleFighter(serverPlayer);
            opponentRef.current = cloneBattleFighter(serverOpponent);
        } else {
            playerRef.current = cloneBattleFighter(serverOpponent);
            opponentRef.current = cloneBattleFighter(serverPlayer);
        }
        syncRenderFighters();
    }

    function finishRoundAndMaybeEndBattle(
        faintId: string | null,
        final: InteractiveTurnResponse["final"] = null,
        actorSide: InteractiveTurnResponse["actorSide"] = "player"
    ) {
        turnRef.current = Math.max(turnRef.current + 1, turnRef.current);
        statsRef.current.turnCount = turnRef.current;
        setTurnIndex((i) => i + 1);

        if (faintId && final) {
            setFaintedId(faintId);
            setWinnerId(final.winnerId);
            setGoldReward(final.goldReward);
            if (final.rewardBlockedReason) {
                setDialogue((prev) => [
                    ...prev,
                    {
                        text:
                            final.rewardBlockedReason === "daily_cap"
                                ? t("battleRewardBlockedDailyCap")
                                : t("battleRewardBlockedCooldown"),
                    },
                ]);
            }
            setTimeout(() => {
                setFinalStats({ ...statsRef.current });
                setFloatingDmg(null);
                setPhase("result");
                onFinish(final.winnerId, final.goldReward);
            }, getDelay(ANIM_DELAY_MS * 2));
            return;
        }

        setTimeout(() => {
            setFloatingDmg(null);
            setNextActor(actorSide === "player" ? "opponent" : "player");
            setPhase("picking");
        }, getDelay(ANIM_DELAY_MS));
        setSubStep(1);
    }

    async function executePlayerAction(moveId: string) {
        setPhase("animating");
        setSubStep(1);

        const turn = await requestServerTurn(moveId);
        if (!turn) {
            setDialogue((prev) => [...prev, { text: t("battleTurnSaveFailed") }]);
            setPhase("picking");
            return;
        }
        if (isInteractiveTurnFailure(turn)) {
            setNextActor(turn.actorSide === "opponent" ? "opponent" : "player");
            setPhase("picking");
            return;
        }
        turnRef.current = turn.totalTurns - 1;
        accumulateBattleStats(turn.events);
        appendDialogueForEvents(turn.events);
        applyServerFighters(turn.player, turn.opponent);

        playHalfTurnAnimations(turn.events, () => {
            finishRoundAndMaybeEndBattle(turn.faintedId, turn.final, turn.actorSide);
        });
    }

    function handleMoveSelect(moveId: string) {
        if (phase !== "picking" || !playerCanAct) return;
        executePlayerAction(moveId);
    }

    async function handleAutoOpponentAction() {
        if (phase !== "picking" || !started || nextActor !== "opponent") return;
        setPhase("animating");
        setSubStep(1);

        const turn = await requestServerTurn();
        if (!turn) {
            setDialogue((prev) => [...prev, { text: t("battleTurnSaveFailed") }]);
            setPhase("picking");
            return;
        }
        if (isInteractiveTurnFailure(turn)) {
            setNextActor(turn.actorSide === "opponent" ? "opponent" : "player");
            setPhase("picking");
            return;
        }
        turnRef.current = turn.totalTurns - 1;
        accumulateBattleStats(turn.events);
        appendDialogueForEvents(turn.events);
        applyServerFighters(turn.player, turn.opponent);

        playHalfTurnAnimations(turn.events, () => {
            finishRoundAndMaybeEndBattle(turn.faintedId, turn.final, turn.actorSide);
        });
    }

    const executePlayerActionRef = useRef(executePlayerAction);
    const handleAutoOpponentActionRef = useRef(handleAutoOpponentAction);

    useEffect(() => {
        executePlayerActionRef.current = executePlayerAction;
        handleAutoOpponentActionRef.current = handleAutoOpponentAction;
    });

    function handleResetBattlePreferences() {
        setAutoMode(false);
        setSpeedMultiplier(1);
        try {
            window.localStorage.removeItem(BATTLE_SPEED_STORAGE_KEY);
            window.localStorage.removeItem(BATTLE_AUTO_MODE_STORAGE_KEY);
        } catch {
            // ignore storage errors
        }
    }

    useEffect(() => {
        try {
            window.localStorage.setItem(BATTLE_SPEED_STORAGE_KEY, String(speedMultiplier));
        } catch {
            // ignore storage errors
        }
    }, [speedMultiplier]);

    useEffect(() => {
        try {
            window.localStorage.setItem(BATTLE_AUTO_MODE_STORAGE_KEY, autoMode ? "1" : "0");
        } catch {
            // ignore storage errors
        }
    }, [autoMode]);

    useEffect(() => {
        if (!started || phase !== "picking") return;
        const canAct = nextActor === "player";
        if (!canAct) {
            const timer = window.setTimeout(() => {
                handleAutoOpponentActionRef.current();
            }, getDelay(250));
            return () => window.clearTimeout(timer);
        }
    }, [started, phase, nextActor, getDelay]);

    useEffect(() => {
        if (!started || phase !== "picking" || !autoMode || !playerCanAct) return;
        const timer = window.setTimeout(() => {
            executePlayerActionRef.current(pickAutoMoveId(playerRef.current));
        }, getDelay(300));
        return () => window.clearTimeout(timer);
    }, [started, phase, autoMode, playerCanAct, getDelay]);

    const isWinner = winnerId === myId;

    return (
        <div className="space-y-3">
            {/* ── Battle Scene ── */}
            <div className="relative">
                <BattleField
                    player={{
                        studentId: renderPlayer.studentId,
                        formIcon:  renderPlayer.formIcon,
                        formName:  renderPlayer.formName,
                        type:      renderPlayer.type,
                        currentHp: renderPlayer.currentHp,
                        maxHp:     renderPlayer.maxHp,
                    }}
                    opponent={{
                        studentId: renderOpponent.studentId,
                        formIcon:  renderOpponent.formIcon,
                        formName:  renderOpponent.formName,
                        type:      renderOpponent.type,
                        currentHp: renderOpponent.currentHp,
                        maxHp:     renderOpponent.maxHp,
                    }}
                    attackingId={attackingId}
                    hurtId={hurtId}
                    flashId={flashId}
                    faintedId={faintedId}
                />

                {/* Opponent HUD — top-right (same side as opponent sprite) */}
                <div className="pointer-events-none absolute top-2 right-2 z-20">
                    <OpponentHud
                        name={renderOpponent.studentName}
                        formName={renderOpponent.formName}
                        rankIndex={renderOpponent.rankIndex}
                        turnsCompleted={renderOpponent.turnsCompleted ?? 0}
                        currentHp={renderOpponent.currentHp}
                        maxHp={renderOpponent.maxHp}
                        activeStatuses={getStatuses(renderOpponent)}
                        abilityName={renderOpponent.abilityName}
                        combatStats={fighterHudCombatStats(renderOpponent)}
                        currentEnergy={renderOpponent.currentEnergy}
                        maxEnergy={renderOpponent.maxEnergy}
                    />
                </div>

                {/* Player HUD — bottom-left (same side as player sprite) */}
                <div className="pointer-events-none absolute bottom-2 left-2 z-20">
                    <PlayerHud
                        name={renderPlayer.studentName}
                        formName={renderPlayer.formName}
                        rankIndex={renderPlayer.rankIndex}
                        turnsCompleted={renderPlayer.turnsCompleted ?? 0}
                        currentHp={renderPlayer.currentHp}
                        maxHp={renderPlayer.maxHp}
                        activeStatuses={getStatuses(renderPlayer)}
                        abilityName={renderPlayer.abilityName}
                        activeItemIcons={renderPlayer.activeItems.map((id) => {
                            const item = getBattleItemById(id);
                            return item?.icon ?? "";
                        }).filter(Boolean)}
                        combatStats={fighterHudCombatStats(renderPlayer)}
                        currentEnergy={renderPlayer.currentEnergy}
                        maxEnergy={renderPlayer.maxEnergy}
                    />
                </div>

                {floatingDmg ? (
                    <div className="pointer-events-none absolute inset-0 z-[45] overflow-visible">
                        <FloatingText
                            text={
                                floatingDmg.crit
                                    ? `💥 ${floatingDmg.value}!!`
                                    : `−${floatingDmg.value}`
                            }
                            side={
                                floatingDmg.id === renderPlayer.studentId ? "player" : "opponent"
                            }
                            color={floatingDmg.crit ? "#fbbf24" : "#f87171"}
                            show
                        />
                    </div>
                ) : null}

                {/* Turn counter — below floating damage layer (z-45) */}
                {started && (
                    <div className="absolute top-2 right-2 z-30 rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-black text-white/80">
                        R{turnIndex + 1}
                    </div>
                )}
            </div>

            {/* ── Result screen (Phase 5) ── */}
            <AnimatePresence>
                {phase === "result" && finalStats && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <BattleResultScreen
                            isWinner={isWinner}
                            goldReward={goldReward}
                            stats={finalStats}
                            playerName={renderPlayer.studentName}
                            playerFormIcon={renderPlayer.formIcon}
                            opponentName={renderOpponent.studentName}
                            opponentFormIcon={renderOpponent.formIcon}
                            onRematch={onReset}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {!started && phase !== "result" && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-[3px] border-slate-800 bg-white p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.35)]"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-black text-slate-800">{t("battleReadyTitle")}</p>
                            <p className="text-xs font-semibold text-slate-600">
                                {t("battleReadyQueue", { name: openingStarterName })}
                                {playerOpeningQueue === 2
                                    ? ` (${t("battleQueuePosition", { name: renderPlayer.studentName, position: 2 })})`
                                    : ""}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleStartBattle}
                            className="rounded-xl border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-500 px-4 py-2 text-xs font-black text-white active:translate-y-px active:border-b-0"
                        >
                            {t("battleStartButton")}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ── Action menu (left) + dialogue (right) ── */}
            <AnimatePresence>
                {phase !== "result" && started && (
                    <motion.div
                        key="combat-panels"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr]"
                    >
                        <div>
                            <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setAutoMode((v) => !v)}
                                        className={cn(
                                            "rounded-lg px-2 py-1 text-[11px] font-black",
                                            autoMode ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                                        )}
                                    >
                                        {autoMode ? t("battleAutoOn") : t("battleAutoOff")}
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-500">
                                        {playerCanAct ? t("battleYourTurn") : t("battleOpponentTurn")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setSpeedMultiplier(s as 1 | 2 | 3)}
                                            className={cn(
                                                "rounded-md px-2 py-0.5 text-[10px] font-black",
                                                speedMultiplier === s
                                                    ? "bg-indigo-500 text-white"
                                                    : "bg-slate-100 text-slate-600"
                                            )}
                                        >
                                            x{s}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={handleResetBattlePreferences}
                                        className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700 hover:bg-slate-300"
                                    >
                                        {t("battleResetButton")}
                                    </button>
                                </div>
                            </div>
                            <ActionMenu
                                player={renderPlayer}
                                turnIndex={turnIndex}
                                subStep={subStep}
                                maxTurns={999}
                                playerQueue={playerOpeningQueue}
                                disabled={phase === "animating" || !playerCanAct}
                                onMoveSelect={handleMoveSelect}
                            />
                        </div>
                        <div>
                            {dialogueLines.length > 0 ? (
                                <DialogueBox
                                    lines={dialogueLines}
                                    cps={42}
                                    autoAdvanceMs={phase === "animating" ? 1100 : 0}
                                    showHistory
                                    historyLimit={10}
                                    className="min-h-[220px]"
                                />
                            ) : (
                                <div className="flex min-h-[64px] items-center rounded-2xl border-[3px] border-slate-800 bg-white px-4 py-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.35)]">
                                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
                                        <NegamonFormIcon
                                            icon={renderOpponent.formIcon}
                                            label={renderOpponent.studentName}
                                            className="h-8 w-8 shrink-0"
                                            emojiClassName="text-2xl leading-none"
                                            width={32}
                                            height={32}
                                            imageClassName="h-full w-full object-contain"
                                        />
                                        <span>
                                            {t("battleOpponentPrompt", { name: renderOpponent.studentName })}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Battle History ────────────────────────────────────────────

type BattleView = "fight" | "history";

function battleStartErrorMessage(
    error: string | undefined,
    t: (key: string, params?: Record<string, string | number>) => string,
    retryAfterSeconds?: number
) {
    if (error === "NO_MONSTER") return t("battleErrNoMonster");
    if (error === "NO_MOVES") return t("battleErrNoMoves");
    if (error === "NEGAMON_DISABLED") return t("battleErrDisabled");
    if (error === "INVALID_LOADOUT") return t("battleErrInvalidLoadout");
    if (error === "BATTLE_RATE_LIMITED") {
        return t("battleErrRateLimited", { seconds: retryAfterSeconds ?? 60 });
    }
    if (error === "INTERACTIVE_SESSION_LIMIT") return t("battleErrSessionLimit");
    if (error === "INVENTORY_MISMATCH") return t("battleErrInventoryChanged");
    return t("battleErrGeneric");
}

export function BattleTab({
    classId,
    myStudentId,
    myStudentCode,
    myMonster,
    currentGold = 0,
    inventory,
    onGoldChange,
    onBattleConsumablesSpent,
}: BattleTabProps) {
    const { t } = useLanguage();
    const [view, setView] = useState<BattleView>("fight");
    const [opponents, setOpponents] = useState<Opponent[]>([]);
    const [loadingOpponents, setLoadingOpponents] = useState(true);
    const [challenging, setChallenging] = useState<string | null>(null);
    const [result, setResult] = useState<BattleResult | null>(null);
    const [interactiveFighters, setInteractiveFighters] = useState<{
        player: BattleFighter;
        opponent: BattleFighter;
        defenderId: string;
        sessionId: string;
        challengerLoadout: string[];
    } | null>(null);
    const [prepOpen, setPrepOpen] = useState(false);
    const [prepTargetId, setPrepTargetId] = useState<string | null>(null);
    const [lastAttackLoadout, setLastAttackLoadout] = useState<string[]>([]);
    const interactiveRef = useRef(interactiveFighters);
    interactiveRef.current = interactiveFighters;
    const [error, setError] = useState<string | null>(null);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams({
            studentId: myStudentId,
            studentCode: myStudentCode,
        });
        void fetch(`/api/classrooms/${classId}/battle/opponents?${params.toString()}`)
            .then((r) => r.json())
            .then((d) => setOpponents(Array.isArray(d) ? d as Opponent[] : []))
            .catch(() => setOpponents([]))
            .finally(() => setLoadingOpponents(false));
    }, [classId, myStudentCode, myStudentId]);

    function handlePickOpponent(defenderId: string) {
        setPrepTargetId(defenderId);
        setPrepOpen(true);
    }

    async function beginFight(challengerLoadout: string[]) {
        const defenderId = prepTargetId;
        if (!defenderId) return;
        setChallenging(defenderId);
        setError(null);
        try {
            const res = await fetch(`/api/classrooms/${classId}/battle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challengerId: myStudentId,
                    defenderId,
                    studentCode: myStudentCode,
                    mode: "beginInteractive",
                    challengerLoadout,
                }),
            });
            const data = (await res.json()) as {
                sessionId?: string;
                player?: BattleFighter;
                opponent?: BattleFighter;
                error?: string;
                code?: string;
                retryAfterSeconds?: number;
            };
            if (!res.ok || !data.player || !data.opponent || !data.sessionId) {
                setError(battleStartErrorMessage(data.error, t, data.retryAfterSeconds));
                return;
            }
            setLastAttackLoadout(challengerLoadout);
            setInteractiveFighters({
                player: data.player,
                opponent: data.opponent,
                defenderId,
                sessionId: data.sessionId,
                challengerLoadout,
            });
            setPrepOpen(false);
            setPrepTargetId(null);
        } finally {
            setChallenging(null);
        }
    }

    function handleInteractiveFinish(winnerId: string, goldReward: number) {
        setHistoryRefreshKey((k) => k + 1);
        const lo = interactiveRef.current?.challengerLoadout ?? [];
        if (lo.length) {
            onBattleConsumablesSpent?.(lo);
        }
        if (winnerId === myStudentId) {
            onGoldChange?.(currentGold + goldReward);
        }
    }

    function handleReset() {
        setResult(null);
        setInteractiveFighters(null);
        setView("fight");
    }

    if (!myMonster) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-rose-200 bg-white text-4xl shadow-md">🥚</div>
                <p className="text-sm font-black text-rose-600">{t("battleNeedMonster")}</p>
            </div>
        );
    }

    return (
        <div className="rounded-[2rem] border-4 border-rose-200 bg-gradient-to-b from-rose-50 to-pink-50 p-5 shadow-[0_6px_0_0_rgba(244,63,94,0.2)] space-y-4">
            {/* Header + view toggle */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <div>
                        <h3 className="text-sm font-black text-rose-900">{t("battleTabTitle")}</h3>
                        <p className="text-[10px] font-bold text-rose-500">{t("battleTabHint")}</p>
                    </div>
                </div>
                {/* Toggle buttons */}
                <div className="flex overflow-hidden rounded-xl border-2 border-rose-200 bg-white text-xs font-black">
                    <button
                        type="button"
                        onClick={() => { setView("fight"); setResult(null); setError(null); }}
                        className={cn(
                            "px-3 py-1.5 transition-colors",
                            view === "fight"
                                ? "bg-rose-500 text-white"
                                : "text-rose-400 hover:bg-rose-50"
                        )}
                    >
                        {t("battleViewFight")}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setView("history"); setResult(null); }}
                        className={cn(
                            "px-3 py-1.5 transition-colors",
                            view === "history"
                                ? "bg-rose-500 text-white"
                                : "text-rose-400 hover:bg-rose-50"
                        )}
                    >
                        {t("battleViewHistory")}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && view === "fight" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600">
                    ⚠️ {error}
                </div>
            )}

            <AnimatePresence mode="wait">
                {view === "fight" ? (
                    <motion.div
                        key="fight"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {interactiveFighters ? (
                            <InteractiveBattle
                                initialPlayer={interactiveFighters.player}
                                initialOpponent={interactiveFighters.opponent}
                                myId={myStudentId}
                                classId={classId}
                                challengerId={myStudentId}
                                defenderId={interactiveFighters.defenderId}
                                studentCode={myStudentCode}
                                sessionId={interactiveFighters.sessionId}
                                onFinish={handleInteractiveFinish}
                                onReset={handleReset}
                            />
                        ) : result ? (
                            <BattleReplay result={result} myId={myStudentId} onReset={handleReset} />
                        ) : loadingOpponents ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-rose-100" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <BattleItemBagPanel inventory={inventory} />
                                <OpponentPicker
                                    opponents={opponents}
                                    onChallenge={handlePickOpponent}
                                    challenging={challenging}
                                />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <BattleHistoryPanel
                            classId={classId}
                            myStudentId={myStudentId}
                            myStudentCode={myStudentCode}
                            refreshKey={historyRefreshKey}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <BattlePrepDialog
                open={prepOpen}
                onOpenChange={(v) => {
                    setPrepOpen(v);
                    if (!v) setPrepTargetId(null);
                }}
                inventory={inventory}
                initialSelection={lastAttackLoadout.length > 0 ? lastAttackLoadout : []}
                onConfirm={(ids) => {
                    const sanitized = sanitizeLoadoutAgainstInventory(ids, inventory);
                    const valid = validateBattleLoadout(sanitized, inventory);
                    if (!valid.ok) {
                        setError(t("battleErrInvalidLoadout"));
                        return;
                    }
                    void beginFight(valid.normalizedIds);
                }}
            />
        </div>
    );
}



