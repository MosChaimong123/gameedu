"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { MonsterSpecies, MonsterType } from "@/lib/types/negamon";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { NegamonInfoNav } from "@/components/negamon/negamon-info-nav";
import { NegamonMovesGrid } from "@/components/negamon/negamon-moves-grid";
import { NegamonTypeChart } from "@/components/negamon/negamon-type-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CODEX_TYPE_ORDER: MonsterType[] = [
    "FIRE",
    "WATER",
    "EARTH",
    "WIND",
    "THUNDER",
    "LIGHT",
    "DARK",
    "PSYCHIC",
];

const TYPE_BADGE: Record<string, string> = {
    FIRE: "bg-orange-100 text-orange-800 border-orange-200",
    WATER: "bg-sky-100 text-sky-800 border-sky-200",
    EARTH: "bg-green-100 text-green-800 border-green-200",
    WIND: "bg-cyan-100 text-cyan-800 border-cyan-200",
    THUNDER: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LIGHT: "bg-amber-100 text-amber-800 border-amber-200",
    DARK: "bg-purple-100 text-purple-800 border-purple-200",
    PSYCHIC: "bg-pink-100 text-pink-800 border-pink-200",
};

function monsterTypeLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    type: MonsterType | string
): string {
    const key = `monsterType_${type}`;
    const out = t(key);
    if (out !== key) return out;
    return String(type);
}

export type NegamonCodexClientProps = {
    code: string;
    speciesList: MonsterSpecies[];
    negamonEnabled: boolean;
};

export function NegamonCodexClient({ code, speciesList, negamonEnabled }: NegamonCodexClientProps) {
    const { t } = useLanguage();
    const [filterText, setFilterText] = useState("");
    const [typeFilter, setTypeFilter] = useState<Set<MonsterType>>(() => new Set());
    const [openSpeciesIds, setOpenSpeciesIds] = useState<Set<string>>(() => new Set());
    const sorted = useMemo(
        () => [...speciesList].sort((a, b) => a.name.localeCompare(b.name, "th")),
        [speciesList]
    );
    const filtered = useMemo(() => {
        const q = filterText.trim().toLowerCase();
        return sorted.filter((sp) => {
            if (typeFilter.size > 0) {
                const matchType =
                    typeFilter.has(sp.type) || (sp.type2 ? typeFilter.has(sp.type2) : false);
                if (!matchType) return false;
            }
            if (!q) return true;
            return sp.name.toLowerCase().includes(q) || sp.id.toLowerCase().includes(q);
        });
    }, [sorted, filterText, typeFilter]);

    useEffect(() => {
        if (sorted.length === 0) return;
        const firstId = sorted[0].id;
        setOpenSpeciesIds((prev) => {
            const next = new Set(prev);
            next.add(firstId);
            return next;
        });
    }, [sorted]);

    function expandAll() {
        setOpenSpeciesIds(new Set(filtered.map((sp) => sp.id)));
    }

    function collapseAll() {
        setOpenSpeciesIds(new Set());
    }

    function toggleTypeFilter(mt: MonsterType) {
        setTypeFilter((prev) => {
            const next = new Set(prev);
            if (next.has(mt)) next.delete(mt);
            else next.add(mt);
            return next;
        });
    }

    if (!negamonEnabled) {
        return (
            <div className="mx-auto max-w-4xl px-2 py-6 sm:px-4">
                <NegamonInfoNav code={code} current="codex" />
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-bold text-slate-600">
                    {t("negamonInfoDisabled")}
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-2 py-6 sm:px-4">
            <NegamonInfoNav code={code} current="codex" />

            <header className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    {t("negamonInfoCodexTitle")}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-600">
                    {t("negamonInfoSpeciesBaseStats")} · {t("negamonInfoMovesAll")}
                </p>
            </header>

            <div className="space-y-8">
                <NegamonTypeChart />

                {sorted.length > 0 ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 sm:p-4">
                        <Input
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder={t("negamonCodexFilterPlaceholder")}
                            className="rounded-xl border-slate-200 bg-white font-medium"
                            aria-label={t("negamonCodexFilterPlaceholder")}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 rounded-lg px-2.5 text-[11px] font-black",
                                    typeFilter.size === 0 && "border-violet-300 bg-violet-50 text-violet-900"
                                )}
                                onClick={() => setTypeFilter(new Set())}
                            >
                                {t("negamonCodexFilterTypeAll")}
                            </Button>
                            {CODEX_TYPE_ORDER.map((mt) => {
                                const on = typeFilter.has(mt);
                                return (
                                    <button
                                        key={mt}
                                        type="button"
                                        onClick={() => toggleTypeFilter(mt)}
                                        className={cn(
                                            "rounded-lg border px-2 py-1 text-[10px] font-black transition-colors",
                                            on
                                                ? TYPE_BADGE[mt] ?? "bg-slate-800 text-white"
                                                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        {monsterTypeLabel(t, mt)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {sorted.length > 0 ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <p className="text-xs font-medium text-slate-600">{t("negamonCodexTapHint")}</p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl font-bold"
                                onClick={expandAll}
                            >
                                {t("negamonCodexExpandAll")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl font-bold"
                                onClick={collapseAll}
                            >
                                {t("negamonCodexCollapseAll")}
                            </Button>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3">
                    {filtered.length === 0 && sorted.length > 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center text-sm font-bold text-slate-500">
                            {t("negamonCodexNoMatch")}
                        </p>
                    ) : null}
                    {filtered.map((sp) => {
                        const moves = [...sp.moves].sort((a, b) => a.learnRank - b.learnRank);
                        const showcase = sp.forms[Math.min(3, sp.forms.length - 1)] ?? sp.forms[0];
                        return (
                            <details
                                key={sp.id}
                                open={openSpeciesIds.has(sp.id)}
                                onToggle={(e) => {
                                    const el = e.currentTarget;
                                    setOpenSpeciesIds((prev) => {
                                        const next = new Set(prev);
                                        if (el.open) next.add(sp.id);
                                        else next.delete(sp.id);
                                        return next;
                                    });
                                }}
                                className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md"
                            >
                                <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 [&::-webkit-details-marker]:hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                            <NegamonFormIcon
                                                icon={showcase.icon}
                                                label={showcase.name}
                                                emojiClassName="text-3xl"
                                                width={56}
                                                height={56}
                                                imageClassName="h-14 w-14 object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-900">{sp.name}</p>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <span
                                                    className={cn(
                                                        "rounded-md border px-2 py-0.5 text-[10px] font-black",
                                                        TYPE_BADGE[sp.type] ?? "bg-slate-100"
                                                    )}
                                                >
                                                    {monsterTypeLabel(t, sp.type)}
                                                </span>
                                                {sp.type2 ? (
                                                    <span
                                                        className={cn(
                                                            "rounded-md border px-2 py-0.5 text-[10px] font-black",
                                                            TYPE_BADGE[sp.type2] ?? "bg-slate-100"
                                                        )}
                                                    >
                                                        {monsterTypeLabel(t, sp.type2)}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {sp.type2 ? (
                                                <p className="mt-1 text-[10px] font-bold text-slate-400">
                                                    {t("negamonInfoType2UnlockHint")}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-wrap gap-2 text-[11px] font-bold text-slate-600 sm:justify-end">
                                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                                            HP {sp.baseStats.hp}
                                        </span>
                                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                                            ATK {sp.baseStats.atk}
                                        </span>
                                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                                            DEF {sp.baseStats.def}
                                        </span>
                                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                                            SPD {sp.baseStats.spd}
                                        </span>
                                    </div>
                                </summary>
                                <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                                    {sp.ability ? (
                                        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/80 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">
                                                {t("monsterAbilityHeading")}
                                            </p>
                                            <p className="text-sm font-black text-violet-950">{sp.ability.name}</p>
                                            <p className="mt-0.5 text-xs font-medium text-violet-900/90">
                                                {sp.ability.desc}
                                            </p>
                                        </div>
                                    ) : null}
                                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {t("negamonInfoMovesAll")}
                                    </p>
                                    <NegamonMovesGrid speciesId={sp.id} moves={moves} variant="codex" />
                                </div>
                            </details>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
