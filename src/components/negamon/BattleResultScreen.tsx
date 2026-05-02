"use client";

import { Coins, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { cn } from "@/lib/utils";

export type BattleStats = {
    damageDealt: number;
    damageReceived: number;
    healsUsed: number;
    critCount: number;
    turnCount: number;
};

export type BattleResultScreenProps = {
    isWinner: boolean;
    goldReward: number;
    stats: BattleStats;
    playerName: string;
    playerFormIcon: string;
    opponentName: string;
    opponentFormIcon: string;
    onRematch: () => void;
};

function StatRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="font-semibold text-slate-600">{label}</span>
            <span className="font-black tabular-nums text-slate-900">{value}</span>
        </div>
    );
}

export function BattleResultScreen({
    isWinner,
    goldReward,
    stats,
    playerName,
    playerFormIcon,
    opponentName,
    opponentFormIcon,
    onRematch,
}: BattleResultScreenProps) {
    const { t } = useLanguage();
    const headline = isWinner ? t("battleResultWin") : t("battleResultLose");

    return (
        <div
            className={cn(
                "mt-3 rounded-2xl border-[3px] border-slate-800 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.25)]"
            )}
        >
            <p
                className={cn(
                    "text-center text-sm font-black",
                    isWinner ? "text-emerald-700" : "text-rose-700"
                )}
            >
                {headline}
            </p>

            {goldReward > 0 ? (
                <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-amber-700">
                    <Coins className="h-3.5 w-3.5" aria-hidden />
                    {t("battleResultGoldLabel", { gold: goldReward })}
                </p>
            ) : null}

            <div className="mt-3 flex items-center justify-center gap-4 border-y border-slate-200/80 py-3">
                <div className="flex flex-col items-center gap-1">
                    <NegamonFormIcon icon={playerFormIcon} label={playerName} width={48} height={48} />
                    <span className="max-w-[7rem] truncate text-center text-[10px] font-bold text-slate-700">
                        {playerName}
                    </span>
                </div>
                <span className="text-xs font-black text-slate-400">VS</span>
                <div className="flex flex-col items-center gap-1">
                    <NegamonFormIcon icon={opponentFormIcon} label={opponentName} width={48} height={48} />
                    <span className="max-w-[7rem] truncate text-center text-[10px] font-bold text-slate-700">
                        {opponentName}
                    </span>
                </div>
            </div>

            <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-500">
                {t("battleResultStatsHeading")}
            </p>
            <div className="mt-2 space-y-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <StatRow label={t("battleResultDamageDealt")} value={stats.damageDealt} />
                <StatRow label={t("battleResultDamageTaken")} value={stats.damageReceived} />
                <StatRow label={t("battleResultHeals")} value={stats.healsUsed} />
                <StatRow label={t("battleResultCrits")} value={stats.critCount} />
                <StatRow label={t("battleResultTurns")} value={stats.turnCount} />
            </div>

            <button
                type="button"
                onClick={onRematch}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-b-2 border-slate-700 bg-gradient-to-b from-slate-600 to-slate-700 px-4 py-2.5 text-xs font-black text-white active:translate-y-px active:border-b-0"
            >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("battleRematch")}
            </button>
        </div>
    );
}
