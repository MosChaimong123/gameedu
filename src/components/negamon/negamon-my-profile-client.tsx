"use client";

import { useMemo } from "react";
import { Heart, Shield, Sparkles, Swords, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getNegamonSettings,
    getNextRankProgress,
    getStudentMonsterState,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import {
    NEGAMON_BASIC_ATTACK_PREVIEW_POWER,
    negamonDamageApproxRange,
} from "@/lib/negamon-damage-preview";
import { negamonMoveDisplayName } from "@/lib/negamon-move-presenter";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { NegamonInfoNav } from "@/components/negamon/negamon-info-nav";
import { NegamonMovesGrid, NegamonMovesSectionHeader } from "@/components/negamon/negamon-moves-grid";
import { buildBasicAttackMove } from "@/lib/negamon-basic-move";
import { Progress } from "@/components/ui/progress";
import type { MonsterType } from "@/lib/types/negamon";

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
    FIRE: "bg-orange-100 text-orange-800 border-orange-200",
    WATER: "bg-sky-100 text-sky-800 border-sky-200",
    EARTH: "bg-green-100 text-green-800 border-green-200",
    WIND: "bg-cyan-100 text-cyan-800 border-cyan-200",
    THUNDER: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LIGHT: "bg-amber-100 text-amber-800 border-amber-200",
    DARK: "bg-purple-100 text-purple-800 border-purple-200",
};

export type NegamonMyProfileClientProps = {
    code: string;
    studentId: string;
    behaviorPoints: number;
    levelConfig: LevelConfigInput;
    gamifiedSettings: Record<string, unknown>;
};

export function NegamonMyProfileClient({
    code,
    studentId,
    behaviorPoints,
    levelConfig,
    gamifiedSettings,
}: NegamonMyProfileClientProps) {
    const { t } = useLanguage();

    const negamon = useMemo(() => getNegamonSettings(gamifiedSettings), [gamifiedSettings]);
    const monster = useMemo(() => {
        if (!negamon?.enabled) return null;
        return getStudentMonsterState(studentId, behaviorPoints, levelConfig, negamon);
    }, [negamon, studentId, behaviorPoints, levelConfig]);

    const rankProgress = useMemo(
        () => getNextRankProgress(behaviorPoints, levelConfig),
        [behaviorPoints, levelConfig]
    );

    const species = monster ? findSpeciesById(monster.speciesId) : undefined;
    const lockedMoves = useMemo(() => {
        if (!species || !monster) return [];
        return species.moves.filter((m) => m.learnRank > monster.rankIndex + 1);
    }, [species, monster]);

    const profileUnlockedMoves = useMemo(() => {
        if (!monster) return [];
        return [buildBasicAttackMove(), ...monster.unlockedMoves];
    }, [monster]);

    const damagePreview = useMemo(() => {
        if (!monster) return null;
        const dummyDef = monster.stats.def;
        const basic = negamonDamageApproxRange({
            atk: monster.stats.atk,
            defenderDef: dummyDef,
            movePower: NEGAMON_BASIC_ATTACK_PREVIEW_POWER,
            isBasicAttack: true,
        });
        const attacking = monster.unlockedMoves.filter((m) => m.power > 0);
        const best =
            attacking.length === 0
                ? null
                : attacking.reduce((a, b) => (a.power >= b.power ? a : b));
        if (!best) {
            return { dummyDef, basic, skill: null as null };
        }
        const stabMult =
            best.type === monster.type || best.type === monster.type2 ? 1.5 : 1;
        const skillRange = negamonDamageApproxRange({
            atk: monster.stats.atk,
            defenderDef: dummyDef,
            movePower: best.power,
            isBasicAttack: false,
            stabMult,
        });
        return {
            dummyDef,
            basic,
            skill: { move: best, range: skillRange, stabOn: stabMult > 1 },
        };
    }, [monster]);

    if (!negamon?.enabled) {
        return (
            <div className="mx-auto max-w-3xl px-2 py-6 sm:px-4">
                <NegamonInfoNav code={code} current="profile" />
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-bold text-slate-600">
                    {t("negamonInfoDisabled")}
                </p>
            </div>
        );
    }

    if (!monster) {
        return (
            <div className="mx-auto max-w-3xl px-2 py-6 sm:px-4">
                <NegamonInfoNav code={code} current="profile" />
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-bold text-slate-600">
                    {t("negamonInfoNoMonster")}
                </p>
            </div>
        );
    }

    const maxStat = Math.max(monster.stats.hp, monster.stats.atk, monster.stats.def, monster.stats.spd);

    return (
        <div className="mx-auto max-w-3xl px-2 py-6 sm:px-4">
            <NegamonInfoNav code={code} current="profile" />

            <header className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    {t("negamonInfoPageTitle")}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-600">{monster.speciesName}</p>
            </header>

            <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="mx-auto flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-violet-200 bg-slate-900/5 sm:mx-0 sm:h-40 sm:w-40">
                            <NegamonFormIcon
                                icon={monster.form.icon}
                                label={monster.form.name}
                                className="flex h-full w-full items-center justify-center"
                                emojiClassName="text-6xl"
                                width={256}
                                height={256}
                                imageClassName="h-full w-full object-cover"
                            />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{monster.form.name}</h2>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span
                                        className={cn(
                                            "rounded-lg border px-2 py-0.5 text-xs font-black",
                                            TYPE_BADGE[monster.type] ?? "bg-slate-100 text-slate-700"
                                        )}
                                    >
                                        {monsterTypeLabel(t, monster.type)}
                                    </span>
                                    {monster.type2 ? (
                                        <span
                                            className={cn(
                                                "rounded-lg border px-2 py-0.5 text-xs font-black",
                                                TYPE_BADGE[monster.type2] ?? "bg-slate-100 text-slate-700"
                                            )}
                                        >
                                            {monsterTypeLabel(t, monster.type2)}
                                        </span>
                                    ) : (
                                        <span className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                            {t("negamonInfoType2UnlockHint")}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-amber-900">
                                        {rankProgress.currentRank}
                                    </span>
                                    {rankProgress.nextRank ? (
                                        <span className="text-[9px] font-bold text-amber-800/90">
                                            {t("monsterRankProgressMore", {
                                                points: rankProgress.pointsNeeded,
                                                rank: rankProgress.nextRank,
                                            })}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-black text-amber-800">{t("monsterRankMax")}</span>
                                    )}
                                </div>
                                <Progress value={rankProgress.progress} className="h-2" />
                            </div>
                        </div>
                    </div>
                </section>

                {species ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                            {t("negamonInfoFormsHeading")}
                        </h3>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {species.forms.map((form, idx) => {
                                const unlocked = idx <= monster.rankIndex;
                                return (
                                    <div
                                        key={form.rank}
                                        className={cn(
                                            "flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl border-2 p-1.5",
                                            unlocked
                                                ? idx === monster.rankIndex
                                                    ? "border-violet-500 bg-violet-50"
                                                    : "border-slate-200 bg-slate-50/80"
                                                : "border-dashed border-slate-200 opacity-60"
                                        )}
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-900/5">
                                            <NegamonFormIcon
                                                icon={form.icon}
                                                label={form.name}
                                                emojiClassName="text-2xl"
                                                width={48}
                                                height={48}
                                                imageClassName="h-12 w-12 object-cover"
                                            />
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-center text-[8px] font-bold leading-tight text-slate-700">
                                            {form.name}
                                        </p>
                                        <p className="text-[7px] font-black text-slate-400">
                                            {idx === monster.rankIndex
                                                ? t("negamonInfoFormCurrent")
                                                : unlocked
                                                  ? "·"
                                                  : t("negamonInfoFormLocked")}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                        {t("playNegamonHpLabel")} · ATK · DEF · SPD
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-slate-600">
                                <Heart className="h-3.5 w-3.5 text-rose-500" />
                                {t("playNegamonHpLabel")}
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500"
                                    style={{
                                        width: `${Math.min(100, Math.round((monster.stats.hp / maxStat) * 100))}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-1 text-right text-sm font-black tabular-nums text-slate-900">
                                {monster.stats.hp}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-slate-600">
                                <Swords className="h-3.5 w-3.5 text-orange-500" />
                                {t("hostStatAtk")}
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                                    style={{
                                        width: `${Math.min(100, Math.round((monster.stats.atk / maxStat) * 100))}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-1 text-right text-sm font-black tabular-nums text-slate-900">
                                {monster.stats.atk}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-slate-600">
                                <Shield className="h-3.5 w-3.5 text-sky-500" />
                                {t("hostStatDef")}
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500"
                                    style={{
                                        width: `${Math.min(100, Math.round((monster.stats.def / maxStat) * 100))}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-1 text-right text-sm font-black tabular-nums text-slate-900">
                                {monster.stats.def}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-slate-600">
                                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                                {t("monsterStatSpd")}
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                                    style={{
                                        width: `${Math.min(100, Math.round((monster.stats.spd / maxStat) * 100))}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-1 text-right text-sm font-black tabular-nums text-slate-900">
                                {monster.stats.spd}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50/80 p-4 shadow-sm sm:p-5">
                    <h3 className="mb-2 flex items-center gap-1 text-sm font-black uppercase tracking-wide text-violet-800">
                        <Sparkles className="h-4 w-4" />
                        {t("negamonInfoBattleBasicsTitle")}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-violet-950/90">
                        {t("negamonInfoBattleBasicsBody")}
                    </p>
                </section>

                {damagePreview ? (
                    <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50/70 p-4 shadow-sm sm:p-5">
                        <h3 className="mb-2 flex items-center gap-1 text-sm font-black uppercase tracking-wide text-sky-900">
                            <Swords className="h-4 w-4" />
                            {t("negamonDamagePreviewTitle")}
                        </h3>
                        <p className="text-sm font-medium leading-relaxed text-sky-950/90">
                            {t("negamonDamagePreviewIntro", { def: damagePreview.dummyDef })}
                        </p>
                        <ul className="mt-3 space-y-2 text-sm font-bold text-sky-950">
                            <li>
                                {t("negamonDamagePreviewBasic", {
                                    power: NEGAMON_BASIC_ATTACK_PREVIEW_POWER,
                                    min: damagePreview.basic.min,
                                    max: damagePreview.basic.max,
                                    minCrit: damagePreview.basic.minCrit,
                                    maxCrit: damagePreview.basic.maxCrit,
                                })}
                            </li>
                            {damagePreview.skill ? (
                                <li>
                                    {t("negamonDamagePreviewSkill", {
                                        name: negamonMoveDisplayName(t, damagePreview.skill.move),
                                        power: damagePreview.skill.move.power,
                                        min: damagePreview.skill.range.min,
                                        max: damagePreview.skill.range.max,
                                        minCrit: damagePreview.skill.range.minCrit,
                                        maxCrit: damagePreview.skill.range.maxCrit,
                                        stabNote: damagePreview.skill.stabOn
                                            ? t("negamonDamagePreviewStabOn")
                                            : t("negamonDamagePreviewStabOff"),
                                    })}
                                </li>
                            ) : (
                                <li className="font-semibold text-sky-800/80">
                                    {t("negamonDamagePreviewNoSkill")}
                                </li>
                            )}
                        </ul>
                        <p className="mt-3 text-xs font-medium leading-snug text-sky-800/85">
                            {t("negamonDamagePreviewFootnote")}
                        </p>
                    </section>
                ) : null}

                {monster.ability ? (
                    <section className="rounded-2xl border border-violet-300/50 bg-violet-50/90 p-4 shadow-sm">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-violet-700">
                            {t("monsterAbilityHeading")}
                        </p>
                        <p className="text-sm font-black text-violet-950">{monster.ability.name}</p>
                        <p className="mt-1 text-sm font-medium text-violet-900/90">{monster.ability.desc}</p>
                    </section>
                ) : null}

                {profileUnlockedMoves.length > 0 ? (
                    <section className="rounded-2xl border border-[#c4a574]/40 bg-[#fffdf6] p-4 shadow-sm sm:p-5">
                        <NegamonMovesSectionHeader />
                        <NegamonMovesGrid
                            speciesId={monster.speciesId}
                            moves={profileUnlockedMoves}
                            variant="unlocked"
                        />
                    </section>
                ) : null}

                {lockedMoves.length > 0 ? (
                    <section className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 shadow-sm sm:p-5">
                        <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-stone-500">
                            {t("monsterLockedMovesHeading")}
                        </p>
                        <NegamonMovesGrid speciesId={monster.speciesId} moves={lockedMoves} variant="locked" />
                    </section>
                ) : null}
            </div>
        </div>
    );
}
