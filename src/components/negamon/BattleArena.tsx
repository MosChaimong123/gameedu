"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Coins, RotateCcw, ChevronRight } from "lucide-react";
import { getBattleItemById } from "@/lib/shop-items";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import type { BattleFighter, BattleResult, TurnEvent } from "@/lib/battle-engine";
import { BattleField } from "@/components/negamon/BattleField";
import { PlayerHud, OpponentHud } from "@/components/negamon/PokemonHud";

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
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-100 bg-gradient-to-b from-slate-50 to-white text-3xl shadow-sm"
            >
                {fighter.formIcon}
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
        event.kind === "faint"           ? "💀" : "▶️";

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

interface Opponent {
    id: string;
    name: string;
    formIcon: string;
    formName: string;
    rankIndex: number;
}

function OpponentPicker({
    opponents,
    onChallenge,
    challenging,
}: {
    opponents: Opponent[];
    onChallenge: (id: string) => void;
    challenging: string | null;
}) {
    const { t } = useLanguage();
    if (opponents.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Swords className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-black text-slate-400">{t("battleNoOpponents")}</p>
            </div>
        );
    }
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("battlePickOpponent")}</p>
            {opponents.map((op) => (
                <motion.div
                    key={op.id}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white/80 p-3"
                >
                    <span className="text-2xl">{op.formIcon}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800">{op.name}</p>
                        <p className="text-[10px] text-slate-400">{op.formName} · Rank {op.rankIndex + 1}</p>
                    </div>
                    <button
                        type="button"
                        disabled={!!challenging}
                        onClick={() => onChallenge(op.id)}
                        className="flex items-center gap-1 rounded-xl border-b-2 border-rose-600 bg-gradient-to-b from-rose-400 to-rose-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition active:translate-y-px active:border-b-0 disabled:opacity-50"
                    >
                        {challenging === op.id ? "..." : <><Swords className="h-3 w-3" /> {t("battleChallenge")}</>}
                    </button>
                </motion.div>
            ))}
        </div>
    );
}

// ── Battle replay ─────────────────────────────────────────────

const TURN_DELAY_MS = 900;

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
    const fighters = result.fighters;
    const logRef = useRef<HTMLDivElement>(null);

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

            setShownTurns((n) => n + 1);
            logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
        }, TURN_DELAY_MS);
        return () => clearTimeout(timer);
    }, [playing, shownTurns, allDone, result.turns]);

    // Active statuses at current turn
    function getStatuses(fighter: BattleFighter): string[] {
        return fighter.effects.map((e) => e.effect).filter((e) =>
            ["BURN","POISON","BADLY_POISON","PARALYZE","SLEEP","FREEZE","CONFUSE"].includes(e)
        );
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
                {/* Opponent HUD — top-left */}
                <div className="absolute top-2 left-2">
                    <OpponentHud
                        name={opponent.studentName}
                        formName={opponent.formName}
                        rankIndex={opponent.rankIndex}
                        currentHp={opponentHp}
                        maxHp={opponent.maxHp}
                        activeStatuses={getStatuses(opponent)}
                        abilityName={opponent.abilityName}
                    />
                </div>

                {/* Player HUD — bottom-right */}
                <div className="absolute bottom-2 right-2">
                    <PlayerHud
                        name={player.studentName}
                        formName={player.formName}
                        rankIndex={player.rankIndex}
                        currentHp={playerHp}
                        maxHp={player.maxHp}
                        activeStatuses={getStatuses(player)}
                        abilityName={player.abilityName}
                        activeItemIcons={player.activeItems.map((id) => getBattleItemById(id)?.icon ?? "").filter(Boolean)}
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

            {/* Turn log */}
            <div
                ref={logRef}
                className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100 bg-white/80 p-3 space-y-0.5"
            >
                {result.turns.slice(0, shownTurns).map((turn, ti) => (
                    <div key={ti}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mt-2 mb-0.5">
                            Turn {ti + 1}
                        </p>
                        {turn.map((evt, ei) => (
                            <EventRow key={ei} event={evt} fighters={fighters} />
                        ))}
                    </div>
                ))}
                {!allDone && playing && (
                    <div className="py-2 text-center text-[10px] text-slate-400 animate-pulse">กำลังต่อสู้...</div>
                )}
            </div>

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
                        onClick={() => setShownTurns(result.turns.length)}
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

// ── Battle History ────────────────────────────────────────────

interface BattleSessionEntry {
    id: string;
    challengerId: string;
    defenderId: string;
    winnerId: string;
    goldReward: number;
    createdAt: string;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "เมื่อกี้";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    const d = Math.floor(h / 24);
    return `${d} วันที่แล้ว`;
}

export function BattleHistoryPanel({
    classId,
    myStudentId,
    refreshKey = 0,
}: {
    classId: string;
    myStudentId: string;
    refreshKey?: number;
}) {
    const { t } = useLanguage();
    const [sessions, setSessions] = useState<BattleSessionEntry[]>([]);
    const [names, setNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        void fetch(`/api/classrooms/${classId}/battle?studentId=${myStudentId}`)
            .then((r) => r.json())
            .then((d: { sessions?: BattleSessionEntry[]; studentNames?: Record<string, string> }) => {
                setSessions(Array.isArray(d.sessions) ? d.sessions : []);
                setNames(d.studentNames ?? {});
            })
            .catch(() => setSessions([]))
            .finally(() => setLoading(false));
    }, [classId, myStudentId, refreshKey]);

    if (loading) {
        return (
            <div className="space-y-2 pt-1">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-rose-100" />
                ))}
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-rose-100 bg-white text-3xl shadow">⚔️</div>
                <p className="text-sm font-black text-rose-400">{t("battleHistoryEmpty")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {sessions.map((s) => {
                const isChallenger = s.challengerId === myStudentId;
                const opponentId = isChallenger ? s.defenderId : s.challengerId;
                const opponentName = names[opponentId] ?? "?";
                const won = s.winnerId === myStudentId;

                return (
                    <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex items-center gap-3 rounded-2xl border-2 px-4 py-3",
                            won
                                ? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50"
                                : "border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50"
                        )}
                    >
                        {/* Result icon */}
                        <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-xl",
                            won ? "border-yellow-300 bg-yellow-100" : "border-slate-200 bg-slate-100"
                        )}>
                            {won ? "🏆" : "💀"}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-black text-slate-800">
                                    {opponentName}
                                </span>
                                <span className={cn(
                                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                                    isChallenger
                                        ? "bg-rose-100 text-rose-600"
                                        : "bg-sky-100 text-sky-600"
                                )}>
                                    {isChallenger ? t("battleRoleChallenger") : t("battleRoleDefender")}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">{timeAgo(s.createdAt)}</p>
                        </div>

                        {/* Gold */}
                        <div className={cn(
                            "shrink-0 text-sm font-black tabular-nums",
                            won ? "text-yellow-600" : "text-slate-400"
                        )}>
                            {won ? `+${s.goldReward}G` : "แพ้"}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ── Main BattleTab ────────────────────────────────────────────

interface BattleTabProps {
    classId: string;
    myStudentId: string;
    myStudentCode: string;
    myMonster: { formIcon: string; formName: string; rankIndex: number } | null;
    currentGold?: number;
    onGoldChange?: (newGold: number) => void;
}

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
                }),
            });
            const data = await res.json() as { result?: BattleResult; error?: string };
            if (!res.ok || !data.result) {
                const msgKey =
                    data.error === "NO_MONSTER"  ? "battleErrNoMonster" :
                    data.error === "NO_MOVES"    ? "battleErrNoMoves" :
                    data.error === "NEGAMON_DISABLED" ? "battleErrDisabled" :
                    "battleErrGeneric";
                setError(t(msgKey as Parameters<typeof t>[0]));
                return;
            }
            setResult(data.result);
            setHistoryRefreshKey((k) => k + 1);
            if (data.result.winnerId === myStudentId) {
                onGoldChange?.(currentGold + data.result.goldReward);
            }
        } finally {
            setChallenging(null);
        }
    }

    function handleReset() {
        setResult(null);
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
                        {result ? (
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
