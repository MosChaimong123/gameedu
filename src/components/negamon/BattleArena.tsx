"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RotateCcw, ChevronRight } from "lucide-react";
import { getBattleItemById } from "@/lib/shop-items";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import type { BattleFighter, BattleResult, TurnEvent } from "@/lib/battle-engine";
import {
    makePRNG,
    calcGoldReward,
    resolveInteractiveTurnFirstHalf,
    resolveInteractiveTurnSecondHalf,
} from "@/lib/battle-engine";
import { BattleField } from "@/components/negamon/BattleField";
import { PlayerHud, OpponentHud, type ActiveStatusView } from "@/components/negamon/PokemonHud";
import { DialogueBox, type DialogueLine } from "@/components/negamon/DialogueBox";
import { ActionMenu } from "@/components/negamon/ActionMenu";
import { BattleResultScreen, type BattleStats } from "@/components/negamon/BattleResultScreen";
import { OpponentPicker } from "@/components/negamon/OpponentPicker";
import { BattleHistoryPanel } from "@/components/negamon/BattleHistoryPanel";
import type { BattleTabProps, Opponent } from "@/components/negamon/battle-tab.types";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

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
    BURN: "🔥", POISON: "☠️", BADLY_POISON: "☠️☠️",
    PARALYZE: "⚡", SLEEP: "💤", FREEZE: "❄️", CONFUSE: "😵",
    BOOST_ATK: "⬆️ATK", BOOST_DEF: "⬆️DEF", BOOST_SPD: "⬆️SPD",
};

const STATUS_LABEL: Partial<Record<string, string>> = {
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

function statusApplyMsg(effect: string | undefined, targetName: string | undefined): string {
    const name = targetName ?? "?";
    switch (effect) {
        case "BURN":         return `${name} ถูกจุดไฟ! 🔥`;
        case "POISON":       return `${name} ถูกวางยาพิษ! ☠️`;
        case "BADLY_POISON": return `${name} ถูกวางยาพิษหนัก! ☠️☠️`;
        case "PARALYZE":     return `${name} ถูกทำให้อัมพาต! ⚡`;
        case "SLEEP":        return `${name} ถูกทำให้หลับ! 💤`;
        case "FREEZE":       return `${name} ถูกแช่แข็ง! ❄️`;
        case "CONFUSE":      return `${name} ถูกทำให้สับสน! 😵`;
        case "LOWER_ATK":
        case "LOWER_ATK_ALL": return `ATK ของ ${name} ลดลง! ⬇️`;
        case "LOWER_DEF":    return `DEF ของ ${name} ลดลง! ⬇️`;
        case "BOOST_ATK":    return `ATK พุ่งขึ้น! ⬆️`;
        case "BOOST_DEF":    return `DEF พุ่งขึ้น! ⬆️`;
        case "BOOST_SPD":    return `SPD พุ่งขึ้น! ⬆️`;
        case "IGNORE_DEF":   return `ท่าถัดไปจะทะลุ DEF! 👁️`;
        default:             return `${name} ได้รับผลพิเศษ`;
    }
}

function statusTickMsg(effect: string | undefined, actorName: string | undefined, value: number | undefined): string {
    const name = actorName ?? "?";
    const dmg = value ?? 0;
    switch (effect) {
        case "BURN":         return `${name} เจ็บจากไฟ ${dmg} HP 🔥`;
        case "POISON":       return `${name} เจ็บจากพิษ ${dmg} HP ☠️`;
        case "BADLY_POISON": return `${name} เจ็บจากพิษสะสม ${dmg} HP ☠️☠️`;
        default:             return `${name} เสีย ${dmg} HP`;
    }
}

function skipMsg(effect: string | undefined, actorName: string | undefined): string {
    const name = actorName ?? "?";
    switch (effect) {
        case "SLEEP":    return `${name} กำลังหลับอยู่ 💤`;
        case "PARALYZE": return `${name} อัมพาต เคลื่อนไม่ได้! ⚡`;
        case "FREEZE":   return `${name} แข็งตัว เคลื่อนไม่ได้! ❄️`;
        default:         return `${name} ข้ามตา`;
    }
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

    const abilityMsg = (event.kind === "ability_trigger") ? (() => {
        const name = actor?.studentName ?? "?";
        const target_ = fighters.find((f) => f.studentId === event.targetId);
        switch (event.abilityId) {
            case "flame_body":     return `🌟 ${event.abilityName} — ${target_?.studentName} ถูกจุดไฟ! 🔥`;
            case "static":         return `🌟 ${event.abilityName} — ${target_?.studentName} อัมพาต! ⚡`;
            case "rage_mode":      return `🌟 ${event.abilityName} — ${name} ATK พุ่งขึ้น! 😡`;
            case "guardian_scale": return `🌟 ${event.abilityName} — ${name} ฟื้น ${event.value} HP! 🛡️`;
            default:               return `🌟 ${event.abilityName ?? "Ability"} ทำงาน!`;
        }
    })() : null;

    const msg = abilityMsg ??
        (event.kind === "move_used"     ? `${actor?.studentName} ใช้ ${event.moveName}` :
        event.kind === "miss"           ? `${actor?.studentName} พลาด!` :
        event.kind === "damage"         ? `${target?.studentName} โดน ${event.value} ดาเมจ` :
        event.kind === "heal"           ? `${actor?.studentName} ฟื้น ${event.value} HP` :
        event.kind === "status_apply"   ? statusApplyMsg(event.effect, target?.studentName ?? actor?.studentName) :
        event.kind === "status_tick"    ? statusTickMsg(event.effect, actor?.studentName, event.value) :
        event.kind === "status_end"     ? `${STATUS_LABEL[event.effect ?? ""] ?? event.effect} หายแล้ว ✅` :
        event.kind === "skip_turn"      ? skipMsg(event.effect, actor?.studentName) :
        event.kind === "confusion_hit"  ? `😵 ${actor?.studentName} สับสน ตีตัวเอง ${event.value} ดาเมจ!` :
        event.kind === "freeze_thaw"    ? `❄️ ${actor?.studentName} ละลายแล้ว! กลับมาสู้ได้!` :
        event.kind === "extra_action"   ? t("battleExtraAction", { name: actor?.studentName ?? "?" }) :
        event.kind === "no_energy"      ? t("battleNoEnergyMove", {
            name: actor?.studentName ?? "?",
            move: event.moveName ?? "?",
            current: event.currentEnergy ?? 0,
            required: event.requiredEnergy ?? 0,
        }) :
        event.kind === "faint"          ? `${actor?.studentName} สลบแล้ว! 💀` : "");

    return (
        <div className="flex items-start gap-2 py-0.5">
            <span className="text-sm shrink-0">{icon}</span>
            <div className="min-w-0 flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-slate-700">{msg}</span>
                {event.kind === "move_used" && event.priorityOverride && (
                    <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-black text-sky-600">⚡ ไปก่อน!</span>
                )}
                {event.kind === "damage" && event.stab && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">💥 STAB</span>
                )}
                {event.kind === "damage" && event.crit && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-600">⚡ CRIT!</span>
                )}
                {event.effectiveness && effectivenessLabel(event.effectiveness, t)}
            </div>
        </div>
    );
}

// ── Opponent picker ───────────────────────────────────────────

const TURN_DELAY_MS = 900;

function createBattleSeed(...parts: Array<string | number>): number {
    const raw = parts.join(":");
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
        hash ^= raw.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function cloneBattleFighter(fighter: BattleFighter): BattleFighter {
    return JSON.parse(JSON.stringify(fighter)) as BattleFighter;
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
    fighters: [BattleFighter, BattleFighter]
): DialogueLine[] {
    const actor  = fighters.find((f) => f.studentId === event.actorId);
    const target = fighters.find((f) => f.studentId === event.targetId);
    const aName  = actor?.studentName  ?? "?";
    const tName  = target?.studentName ?? "?";

    switch (event.kind) {
        case "move_used": {
            const badges: DialogueLine["badges"] = [];
            if (event.priorityOverride) badges.push({ label: "⚡ ก่อนเลย!", color: "bg-sky-100 text-sky-700" });
            return [{ text: `${aName} ใช้ ${event.moveName ?? "?"}!`, badges }];
        }
        case "damage": {
            const badges: DialogueLine["badges"] = [];
            if (event.crit)                        badges.push({ label: "⚡ CRIT!",      color: "bg-red-100 text-red-600" });
            if (event.stab)                        badges.push({ label: "💥 STAB",       color: "bg-amber-100 text-amber-700" });
            if (event.effectiveness === "super")   badges.push({ label: "ได้ผลมาก!",    color: "bg-orange-100 text-orange-600" });
            if (event.effectiveness === "weak")    badges.push({ label: "ได้ผลน้อย...", color: "bg-slate-100 text-slate-500" });
            return [{ text: `${tName} โดน ${event.value ?? 0} ดาเมจ!`, badges }];
        }
        case "miss":
            return [{ text: `${aName} พลาด! 💨` }];
        case "heal":
            return [{ text: `${aName} ฟื้นคืน ${event.value ?? 0} HP! 💚` }];
        case "faint":
            return [{ text: `${aName} สลบแล้ว! 💀` }];
        case "status_apply":
            return [{ text: statusApplyMsg(event.effect, tName || aName) }];
        case "status_tick":
            return [{ text: statusTickMsg(event.effect, aName, event.value) }];
        case "status_end":
            return [{ text: `${STATUS_LABEL[event.effect ?? ""] ?? event.effect} ของ ${aName} หายแล้ว ✅` }];
        case "skip_turn":
            return [{ text: skipMsg(event.effect, aName) }];
        case "confusion_hit":
            return [{ text: `😵 ${aName} สับสน ตีตัวเอง ${event.value ?? 0} ดาเมจ!` }];
        case "freeze_thaw":
            return [{ text: `❄️ ${aName} ละลายออกจากน้ำแข็ง!` }];
        case "ability_trigger": {
            const tgt = fighters.find((f) => f.studentId === event.targetId);
            let text = `🌟 ${event.abilityName ?? "Ability"} ทำงาน!`;
            switch (event.abilityId) {
                case "flame_body":     text = `🌟 ${event.abilityName} — ${tgt?.studentName} ถูกจุดไฟ! 🔥`; break;
                case "static":         text = `🌟 ${event.abilityName} — ${tgt?.studentName} อัมพาต! ⚡`;  break;
                case "rage_mode":      text = `🌟 ${event.abilityName} — ${aName} ATK พุ่งขึ้น! 😡`;       break;
                case "guardian_scale": text = `🌟 ${event.abilityName} — ${aName} ฟื้น ${event.value ?? 0} HP! 🛡️`; break;
            }
            return [{ text }];
        }
        default:
            return [];
    }
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
            const dmgEvt = turnEvents.find((e) => e.kind === "damage");
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
                    setFloatingDmg(null);
                }, 500);
            }

            const faintEvt = turnEvents.find((e) => e.kind === "faint");
            if (faintEvt) setFaintedId(faintEvt.actorId);

            // Append dialogue lines for this turn
            const newLines: DialogueLine[] = turnEvents.flatMap((evt) =>
                eventToDialogueLines(evt, fighters)
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
        return fighter.effects.filter((e) =>
            [
                "BOOST_ATK","BOOST_DEF","BOOST_SPD","BOOST_WATER_DMG",
                "BURN","POISON","BADLY_POISON","PARALYZE","SLEEP","FREEZE","CONFUSE",
            ].includes(e.effect)
        ).map((e) => ({ effect: e.effect, turnsLeft: e.turnsLeft }));
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
                    floatingDmg={floatingDmg}
                />

                {/* HUD overlay */}
                {/* Opponent HUD — top-right (same side as opponent sprite) */}
                <div className="pointer-events-none absolute top-2 right-2 z-20">
                    <OpponentHud
                        name={opponent.studentName}
                        formName={opponent.formName}
                        rankIndex={opponent.rankIndex}
                        currentHp={opponentHp}
                        maxHp={opponent.maxHp}
                        activeStatuses={getStatuses(opponent)}
                        abilityName={opponent.abilityName}
                        combatStats={fighterHudCombatStats(opponent)}
                        currentEnergy={opponent.currentEnergy}
                        maxEnergy={opponent.maxEnergy}
                        actionMeter={opponent.actionMeter}
                    />
                </div>

                {/* Player HUD — bottom-left (same side as player sprite) */}
                <div className="pointer-events-none absolute bottom-2 left-2 z-20">
                    <PlayerHud
                        name={player.studentName}
                        formName={player.formName}
                        rankIndex={player.rankIndex}
                        currentHp={playerHp}
                        maxHp={player.maxHp}
                        activeStatuses={getStatuses(player)}
                        abilityName={player.abilityName}
                        activeItemIcons={player.activeItems.map((id) => getBattleItemById(id)?.icon ?? "").filter(Boolean)}
                        combatStats={fighterHudCombatStats(player)}
                        currentEnergy={player.currentEnergy}
                        maxEnergy={player.maxEnergy}
                        actionMeter={player.actionMeter}
                    />
                </div>

                {/* Turn counter */}
                <div className="absolute top-2 right-2 rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-black text-white/80">
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
                    <p className="text-sm font-bold text-slate-400 animate-pulse">กำลังเริ่มต่อสู้...</p>
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
                        {playing ? "⏸ หยุด" : "▶ เล่น"}
                    </button>
                )}
                {!allDone && (
                    <button
                        type="button"
                        onClick={() => {
                            const allLines = result.turns.flatMap((turn) =>
                                turn.flatMap((evt) => eventToDialogueLines(evt, fighters))
                            );
                            setDialogueLines(allLines);
                            setShownTurns(result.turns.length);
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-black text-slate-600 flex items-center justify-center gap-1"
                    >
                        <ChevronRight className="h-3.5 w-3.5" /> ข้ามไปผล
                    </button>
                )}
                {allDone && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex-1 rounded-xl border-b-2 border-indigo-600 bg-gradient-to-b from-indigo-400 to-indigo-500 py-2 text-xs font-black text-white flex items-center justify-center gap-1 active:translate-y-px active:border-b-0"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> ท้าทายใหม่
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Interactive Battle (Phase 3 / 4) ─────────────────────────

const ANIM_DELAY_MS = 1600; // ms between turn events during animation phase

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
    onFinish: (winnerId: string, goldReward: number) => void;
    onReset: () => void;
}

function InteractiveBattle({
    initialPlayer,
    initialOpponent,
    myId,
    classId,
    challengerId,
    defenderId,
    studentCode,
    onFinish,
    onReset,
}: InteractiveBattleProps) {
    // Deep-copy fighters into refs so we can mutate them across turns
    const playerRef   = useRef<BattleFighter>(JSON.parse(JSON.stringify(initialPlayer)));
    const opponentRef = useRef<BattleFighter>(JSON.parse(JSON.stringify(initialOpponent)));
    const rngRef      = useRef(makePRNG(createBattleSeed(myId, classId, challengerId, defenderId, studentCode)));
    const turnRef     = useRef(0);
    const savedRef    = useRef(false);

    // Derive player/opponent from myId
    const isChallenger = myId === challengerId;
    const player   = isChallenger ? playerRef.current   : opponentRef.current;
    const opponent  = isChallenger ? opponentRef.current : playerRef.current;
    const [renderFighters, setRenderFighters] = useState(() => ({
        player: cloneBattleFighter(isChallenger ? initialPlayer : initialOpponent),
        opponent: cloneBattleFighter(isChallenger ? initialOpponent : initialPlayer),
    }));

    const [phase, setPhase]           = useState<IBPhase>("picking");
    const [turnIndex, setTurnIndex]   = useState(0);
    const [subStep, setSubStep]       = useState(1);
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
        return fighter.effects.filter((e) =>
            [
                "BOOST_ATK","BOOST_DEF","BOOST_SPD","BOOST_WATER_DMG",
                "BURN","POISON","BADLY_POISON","PARALYZE","SLEEP","FREEZE","CONFUSE",
            ].includes(e.effect)
        ).map((e) => ({ effect: e.effect, turnsLeft: e.turnsLeft }));
    }

    const syncRenderFighters = useCallback(() => {
        setRenderFighters({
            player: cloneBattleFighter(isChallenger ? playerRef.current : opponentRef.current),
            opponent: cloneBattleFighter(isChallenger ? opponentRef.current : playerRef.current),
        });
    }, [isChallenger]);

    const renderPlayer = renderFighters.player;
    const renderOpponent = renderFighters.opponent;

    async function saveResult(wId: string, gold: number) {
        if (savedRef.current) return;
        savedRef.current = true;
        try {
            await fetch(`/api/classrooms/${classId}/battle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challengerId, defenderId, studentCode,
                    mode: "save",
                    winnerId: wId,
                    goldReward: gold,
                    totalTurns: turnRef.current,
                }),
            });
        } catch { /* non-critical */ }
    }

    function accumulateBattleStats(events: TurnEvent[]) {
        for (const evt of events) {
            if (evt.kind === "damage") {
                if (evt.actorId === player.studentId) {
                    statsRef.current.damageDealt += evt.value ?? 0;
                } else {
                    statsRef.current.damageReceived += evt.value ?? 0;
                }
                if (evt.crit) statsRef.current.critCount += 1;
            }
            if (evt.kind === "heal" && evt.actorId === player.studentId) {
                statsRef.current.healsUsed += evt.value ?? 0;
            }
            if (evt.kind === "confusion_hit" && evt.actorId === player.studentId) {
                statsRef.current.damageReceived += evt.value ?? 0;
            }
        }
    }

    function appendDialogueForEvents(events: TurnEvent[]) {
        const pair: [BattleFighter, BattleFighter] = [playerRef.current, opponentRef.current];
        const lines = events.flatMap((evt) => eventToDialogueLines(evt, pair));
        setDialogue((prev) => [...prev, ...lines]);
    }

    function playHalfTurnAnimations(events: TurnEvent[], onDone: () => void) {
        const dmgEvt = events.find((e) => e.kind === "damage");
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
                setFloatingDmg(null);
                onDone();
            }, 500);
        } else {
            setTimeout(onDone, 350);
        }
    }

    function finishRoundAndMaybeEndBattle(faintId: string | null) {
        turnRef.current += 1;
        statsRef.current.turnCount = turnRef.current;
        setTurnIndex((i) => i + 1);

        if (faintId) {
            setFaintedId(faintId);
            const winner = player.currentHp > 0 ? player : opponent;
            const loser = player.currentHp > 0 ? opponent : player;
            const gold = calcGoldReward(winner, loser);
            setWinnerId(winner.studentId);
            setGoldReward(gold);
            setTimeout(async () => {
                await saveResult(winner.studentId, gold);
                setFinalStats({ ...statsRef.current });
                setPhase("result");
                onFinish(winner.studentId, gold);
            }, ANIM_DELAY_MS * 2);
            return;
        }

        if (turnRef.current >= 20) {
            const pHpPct = player.currentHp / player.maxHp;
            const oHpPct = opponent.currentHp / opponent.maxHp;
            const winner = pHpPct >= oHpPct ? player : opponent;
            const loser = pHpPct >= oHpPct ? opponent : player;
            const gold = calcGoldReward(winner, loser);
            setWinnerId(winner.studentId);
            setGoldReward(gold);
            setTimeout(async () => {
                await saveResult(winner.studentId, gold);
                setFinalStats({ ...statsRef.current });
                setPhase("result");
                onFinish(winner.studentId, gold);
            }, ANIM_DELAY_MS);
            return;
        }

        setTimeout(() => setPhase("picking"), ANIM_DELAY_MS);
        setSubStep(1);
    }

    function handleMoveSelect(moveId: string) {
        if (phase !== "picking") return;
        setPhase("animating");
        setSubStep(1);

        const h1 = resolveInteractiveTurnFirstHalf(player, opponent, moveId, rngRef.current);
        accumulateBattleStats(h1.events);
        appendDialogueForEvents(h1.events);
        syncRenderFighters();

        playHalfTurnAnimations(h1.events, () => {
            if (h1.faintedId) {
                finishRoundAndMaybeEndBattle(h1.faintedId);
                return;
            }
            if (!h1.pending) {
                setPhase("picking");
                return;
            }

            setTimeout(() => {
                setSubStep(2);
                const h2 = resolveInteractiveTurnSecondHalf(h1.pending!, rngRef.current);
                accumulateBattleStats(h2.events);
                appendDialogueForEvents(h2.events);
                syncRenderFighters();

                playHalfTurnAnimations(h2.events, () => {
                    finishRoundAndMaybeEndBattle(h2.faintedId);
                });
            }, ANIM_DELAY_MS);
        });
    }

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
                    floatingDmg={floatingDmg}
                />

                {/* Opponent HUD — top-right (same side as opponent sprite) */}
                <div className="pointer-events-none absolute top-2 right-2 z-20">
                    <OpponentHud
                        name={renderOpponent.studentName}
                        formName={renderOpponent.formName}
                        rankIndex={renderOpponent.rankIndex}
                        currentHp={renderOpponent.currentHp}
                        maxHp={renderOpponent.maxHp}
                        activeStatuses={getStatuses(renderOpponent)}
                        abilityName={renderOpponent.abilityName}
                        combatStats={fighterHudCombatStats(renderOpponent)}
                        currentEnergy={renderOpponent.currentEnergy}
                        maxEnergy={renderOpponent.maxEnergy}
                        actionMeter={renderOpponent.actionMeter}
                    />
                </div>

                {/* Player HUD — bottom-left (same side as player sprite) */}
                <div className="pointer-events-none absolute bottom-2 left-2 z-20">
                    <PlayerHud
                        name={renderPlayer.studentName}
                        formName={renderPlayer.formName}
                        rankIndex={renderPlayer.rankIndex}
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
                        actionMeter={renderPlayer.actionMeter}
                    />
                </div>

                {/* Turn counter */}
                <div className="absolute top-2 right-2 rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-black text-white/80">
                    T{turnIndex}/20
                </div>
            </div>

            {/* ── Dialogue box ── */}
            {dialogueLines.length > 0 ? (
                <DialogueBox
                    lines={dialogueLines}
                    cps={42}
                    autoAdvanceMs={phase === "animating" ? 1100 : 0}
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
                            {renderOpponent.studentName} ท้าทายคุณ! — เลือกท่าได้เลย!
                        </span>
                    </p>
                </div>
            )}

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

            {/* ── Action Menu (Phase 3) ── */}
            <AnimatePresence>
                {phase !== "result" && (
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                    >
                        <ActionMenu
                            player={renderPlayer}
                            turnIndex={turnIndex}
                            subStep={subStep}
                            maxTurns={20}
                            disabled={phase === "animating"}
                            onMoveSelect={handleMoveSelect}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Battle History ────────────────────────────────────────────

type BattleView = "fight" | "history";

export function BattleTab({
    classId,
    myStudentId,
    myStudentCode,
    myMonster,
    currentGold = 0,
    onGoldChange,
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
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    useEffect(() => {
        void fetch(`/api/classrooms/${classId}/battle/opponents?studentId=${myStudentId}`)
            .then((r) => r.json())
            .then((d) => setOpponents(Array.isArray(d) ? d as Opponent[] : []))
            .catch(() => setOpponents([]))
            .finally(() => setLoadingOpponents(false));
    }, [classId, myStudentId]);

    async function handleChallenge(defenderId: string) {
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
                    mode: "init",
                }),
            });
            const data = await res.json() as {
                player?: BattleFighter;
                opponent?: BattleFighter;
                error?: string;
            };
            if (!res.ok || !data.player || !data.opponent) {
                const msgKey =
                    data.error === "NO_MONSTER"       ? "battleErrNoMonster" :
                    data.error === "NO_MOVES"         ? "battleErrNoMoves" :
                    data.error === "NEGAMON_DISABLED" ? "battleErrDisabled" :
                    "battleErrGeneric";
                setError(t(msgKey as Parameters<typeof t>[0]));
                return;
            }
            setInteractiveFighters({ player: data.player, opponent: data.opponent, defenderId });
        } finally {
            setChallenging(null);
        }
    }

    function handleInteractiveFinish(winnerId: string, goldReward: number) {
        setHistoryRefreshKey((k) => k + 1);
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
                        ⚔️ ต่อสู้
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
                        📜 ประวัติ
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
                            <OpponentPicker
                                opponents={opponents}
                                onChallenge={handleChallenge}
                                challenging={challenging}
                            />
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
                            refreshKey={historyRefreshKey}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


