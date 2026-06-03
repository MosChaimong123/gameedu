"use client";

import { useMemo } from "react";
import { Heart, Shield, Swords, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getNextRankProgress,
    getStudentMonsterState,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { buildBasicAttackMove } from "@/lib/negamon-basic-move";
import { Progress } from "@/components/ui/progress";
import type { MonsterType, NegamonSettings } from "@/lib/types/negamon";
import { createNegamonMonsterSnapshot, getNegamonMoveLearnLevel } from "@/lib/game-negamon";
import { SkillLoadoutPanel } from "@/components/game/negamon/SkillLoadoutPanel";

function monsterTypeLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    type: MonsterType | string
): string {
    const key = `monsterType_${type}`;
    const out = t(key);
    if (out !== key) return out;
    return String(type);
}

const TYPE_BADGE: Record<string, string> = {
    GRASS:       "bg-green-100 text-green-800 border-green-200",
    WATER:       "bg-sky-100 text-sky-800 border-sky-200",
    FIRE:        "bg-orange-100 text-orange-800 border-orange-200",
    ELECTRICITY: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const TYPE_ICON: Record<string, string> = {
    GRASS: "🌿", WATER: "💧", FIRE: "🔥", ELECTRICITY: "⚡",
};

export type NegamonMyProfileClientProps = {
    code: string;
    studentId: string;
    studentName: string;
    behaviorPoints: number;
    levelConfig: LevelConfigInput;
    negamonSettings?: NegamonSettings | null;
    negamonSkills?: string[];
    negamonSkillLoadout?: string[];
};

export function NegamonMyProfileClient({
    code,
    studentId,
    studentName,
    behaviorPoints,
    levelConfig,
    negamonSettings = null,
    negamonSkillLoadout = [],
}: NegamonMyProfileClientProps) {
    const { t } = useLanguage();

    const negamon = useMemo(
        () =>
            negamonSettings &&
            typeof negamonSettings === "object" &&
            !Array.isArray(negamonSettings)
                ? negamonSettings
                : null,
        [negamonSettings]
    );

    const monster = useMemo(() => {
        if (!negamon?.enabled) return null;
        return getStudentMonsterState(studentId, behaviorPoints, levelConfig, negamon);
    }, [negamon, studentId, behaviorPoints, levelConfig]);

    const monsterSnapshot = useMemo(() => {
        if (!negamon?.enabled) return null;
        return createNegamonMonsterSnapshot({
            studentId,
            studentName,
            points: behaviorPoints,
            levelConfig,
            negamonSettings: negamon,
            equippedSkillIds: negamonSkillLoadout,
        });
    }, [behaviorPoints, levelConfig, negamon, negamonSkillLoadout, studentId, studentName]);

    const rankProgress = useMemo(
        () => getNextRankProgress(behaviorPoints, levelConfig),
        [behaviorPoints, levelConfig]
    );

    const species = monster ? findSpeciesById(monster.speciesId) : undefined;

    const allMoves = useMemo(() => {
        const basic = buildBasicAttackMove();
        type Move = typeof basic;
        if (!species || !monster) {
            return { basic: null as Move | null, unlocked: [] as Move[], locked: [] as Move[] };
        }
        const currentLevel = monsterSnapshot?.level ?? 1;
        const unlocked = species.moves.filter((m) => getNegamonMoveLearnLevel(m) <= currentLevel);
        const locked = species.moves.filter((m) => getNegamonMoveLearnLevel(m) > currentLevel);
        return { basic, unlocked, locked };
    }, [species, monster, monsterSnapshot?.level]);

    if (!negamon?.enabled) {
        return (
            <div className="mx-auto max-w-2xl px-3 py-8">
                <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                    {t("negamonInfoDisabled")}
                </p>
            </div>
        );
    }

    if (!monster) {
        return (
            <div className="mx-auto max-w-2xl px-3 py-8">
                <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                    {t("negamonInfoNoMonster")}
                </p>
            </div>
        );
    }

    const maxStat = Math.max(monster.stats.hp, monster.stats.atk, monster.stats.def, monster.stats.spd);
    const level = monsterSnapshot?.level ?? monster.rankIndex * 8 + 1;

    return (
        <div className="mx-auto max-w-2xl space-y-4 px-3 py-6">

            {/* Hero: รูป + ชื่อ + ธาตุ + ระดับ */}
            <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-violet-200 bg-slate-900/5">
                    <NegamonFormIcon
                        icon={monster.form.icon}
                        label={monster.form.name}
                        emojiClassName="text-5xl"
                        width={128}
                        height={128}
                        imageClassName="h-full w-full object-cover"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h1 className="text-xl font-black leading-tight text-slate-900">{monster.form.name}</h1>
                            <p className="text-sm font-semibold text-slate-500">{monster.speciesName}</p>
                        </div>
                        <span className="shrink-0 rounded-xl bg-violet-100 px-2.5 py-1 text-sm font-black text-violet-800">
                            Lv.{level}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <span
                            className={cn(
                                "rounded-lg border px-2 py-0.5 text-xs font-black",
                                TYPE_BADGE[monster.type] ?? "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                        >
                            {TYPE_ICON[monster.type]} {monsterTypeLabel(t, monster.type)}
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>{rankProgress.currentRank}</span>
                            {rankProgress.nextRank ? (
                                <span>{rankProgress.pointsNeeded} แต้ม → {rankProgress.nextRank}</span>
                            ) : (
                                <span className="font-black text-violet-600">MAX</span>
                            )}
                        </div>
                        <Progress value={rankProgress.progress} className="h-1.5" />
                    </div>
                </div>
            </section>

            {/* Stats: HP / ATK / DEF / SPD */}
            <section className="grid grid-cols-2 gap-2">
                {[
                    { label: "HP", icon: <Heart className="h-3.5 w-3.5 text-rose-500" />, value: monster.stats.hp, color: "from-rose-400 to-rose-500" },
                    { label: "ATK", icon: <Swords className="h-3.5 w-3.5 text-orange-500" />, value: monster.stats.atk, color: "from-orange-400 to-orange-500" },
                    { label: "DEF", icon: <Shield className="h-3.5 w-3.5 text-sky-500" />, value: monster.stats.def, color: "from-sky-400 to-sky-500" },
                    { label: "SPD", icon: <Zap className="h-3.5 w-3.5 text-yellow-500" />, value: monster.stats.spd, color: "from-yellow-400 to-yellow-500" },
                ].map(({ label, icon, value, color }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="mb-1.5 flex items-center gap-1 text-xs font-black text-slate-600">
                            {icon} {label}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={cn("h-full rounded-full bg-gradient-to-r", color)}
                                style={{ width: `${Math.min(100, Math.round((value / maxStat) * 100))}%` }}
                            />
                        </div>
                        <p className="mt-1 text-right text-sm font-black tabular-nums text-slate-900">{value}</p>
                    </div>
                ))}
            </section>

            {/* Ability */}
            {monster.ability ? (
                <section className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-violet-600">ความสามารถพิเศษ</p>
                    <p className="text-sm font-black text-violet-900">{monster.ability.name}</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-violet-800/90">{monster.ability.desc}</p>
                </section>
            ) : null}

            {/* Forms — evolution path */}
            {species ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">ร่างพัฒนาการ</p>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {species.forms.map((form, idx) => {
                            const unlocked = idx <= monster.rankIndex;
                            const isCurrent = idx === monster.rankIndex;
                            return (
                                <div key={form.rank} className="flex flex-col items-center gap-1 shrink-0">
                                    <div
                                        className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all",
                                            isCurrent
                                                ? "border-violet-500 bg-violet-50 shadow-sm"
                                                : unlocked
                                                  ? "border-slate-200 bg-slate-50"
                                                  : "border-dashed border-slate-200 opacity-40"
                                        )}
                                    >
                                        <NegamonFormIcon
                                            icon={form.icon}
                                            label={form.name}
                                            emojiClassName="text-xl"
                                            width={40}
                                            height={40}
                                            imageClassName="h-10 w-10 object-cover"
                                        />
                                    </div>
                                    <p className="max-w-[2.5rem] truncate text-center text-[7px] font-bold text-slate-500">{form.name}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ) : null}

            {/* Skills */}
            {monsterSnapshot ? (
                <SkillLoadoutPanel code={code} monster={monsterSnapshot} />
            ) : allMoves.basic && (allMoves.unlocked.length > 0 || allMoves.locked.length > 0) ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-wide text-slate-400">สกิล</p>
                    <div className="space-y-2">
                        {/* Basic attack */}
                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                            <span className="text-lg">⚔️</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-slate-800">{allMoves.basic.name}</p>
                                <p className="text-[10px] font-semibold text-slate-500">Basic · พลัง {allMoves.basic.power} · ไม่มี Cooldown</p>
                            </div>
                        </div>
                        {allMoves.unlocked.map((move) => (
                            <div key={move.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                <span className="text-lg">{TYPE_ICON[move.type] ?? "✦"}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-800">{move.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-500">
                                        Lv.{getNegamonMoveLearnLevel(move)} · {move.power > 0 ? `พลัง ${move.power}` : "Status"}
                                        {move.effectDurationTurns ? ` · ${move.effectDurationTurns} เทิร์น` : ""}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {allMoves.locked.map((move) => (
                            <div key={move.id} className="flex items-center gap-3 rounded-xl bg-slate-50/50 px-3 py-2.5 opacity-50">
                                <span className="text-lg">🔒</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-600">{move.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-400">ปลดล็อคที่ Lv.{getNegamonMoveLearnLevel(move)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
