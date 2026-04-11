"use client";

import { MONSTER_TYPE_CHART } from "@/lib/classroom-utils";
import type { MonsterType } from "@/lib/types/negamon";
import { useLanguage } from "@/components/providers/language-provider";

const ORDER: MonsterType[] = [
    "FIRE",
    "WATER",
    "EARTH",
    "WIND",
    "THUNDER",
    "LIGHT",
    "DARK",
    "PSYCHIC",
];

function typeLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    type: MonsterType
): string {
    const key = `monsterType_${type}`;
    const out = t(key);
    return out !== key ? out : type;
}

export function NegamonTypeChart() {
    const { t } = useLanguage();

    return (
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-black tracking-tight text-slate-900">{t("negamonInfoTypeChartTitle")}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{t("negamonInfoTypeChartIntro")}</p>
            <div className="mt-4 space-y-3">
                {ORDER.map((attack) => {
                    const row = MONSTER_TYPE_CHART[attack];
                    const strong: MonsterType[] = [];
                    const weak: MonsterType[] = [];
                    if (row) {
                        for (const [def, mult] of Object.entries(row) as [MonsterType, number][]) {
                            if (mult >= 2) strong.push(def);
                            if (mult <= 0.5) weak.push(def);
                        }
                    }
                    return (
                        <div
                            key={attack}
                            className="rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5 shadow-sm"
                        >
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                {typeLabel(t, attack)}
                            </p>
                            {strong.length > 0 ? (
                                <p className="mt-1 text-sm font-bold text-amber-800">
                                    <span className="text-amber-600">{t("negamonInfoTypeChartSuperRow")}: </span>
                                    {strong.map((d) => typeLabel(t, d)).join(", ")}
                                </p>
                            ) : null}
                            {weak.length > 0 ? (
                                <p className="mt-1 text-sm font-bold text-slate-600">
                                    <span className="text-slate-500">{t("negamonInfoTypeChartResistRow")}: </span>
                                    {weak.map((d) => typeLabel(t, d)).join(", ")}
                                </p>
                            ) : null}
                            {!row || (strong.length === 0 && weak.length === 0) ? (
                                <p className="mt-1 text-xs text-slate-400">—</p>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
