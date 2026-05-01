"use client";

import { Lock, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonsterMove } from "@/lib/types/negamon";
import {
    NEGAMON_MOVE_CATEGORY_BADGE,
    NEGAMON_MOVE_TYPE_BADGE,
    negamonMonsterTypeLabel,
    negamonMoveCategoryLabel,
    negamonMoveDisplayName,
} from "@/lib/negamon-move-presenter";
import { NegamonMoveInlineDescription } from "@/components/negamon/negamon-move-inline-description";
import { useLanguage } from "@/components/providers/language-provider";
import { getMoveEnergyCost } from "@/lib/negamon-energy";
import { isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";

export type NegamonMovesGridProps = {
    speciesId: string;
    moves: MonsterMove[];
    variant: "unlocked" | "locked" | "codex";
};

export function NegamonMovesGrid({ speciesId, moves, variant }: NegamonMovesGridProps) {
    const { t } = useLanguage();
    if (moves.length === 0) return null;

    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {moves.map((move) => {
                const typeStyle =
                    NEGAMON_MOVE_TYPE_BADGE[move.type] ?? "bg-slate-50 text-slate-500 border-slate-200";
                const catStyle =
                    NEGAMON_MOVE_CATEGORY_BADGE[move.category] ??
                    "bg-slate-50 text-slate-400 border-slate-200";
                const moveName = negamonMoveDisplayName(t, move);
                const energyCost = move.energyCost ?? getMoveEnergyCost(move, speciesId);
                const locked = variant === "locked";
                const codex = variant === "codex";

                return (
                    <div
                        key={move.id}
                        className={cn(
                            "rounded-xl border-2 p-2.5 shadow-sm",
                            locked
                                ? "border-dashed border-stone-300/80 bg-stone-100/50 opacity-80"
                                : "border-[#bfa67a]/45 bg-[#fffdf8]/95"
                        )}
                    >
                        <div className="mb-1.5 flex items-start justify-between gap-1">
                            <p className="line-clamp-2 flex-1 text-[11px] font-black leading-tight text-stone-900">
                                {locked ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Lock className="h-3 w-3 shrink-0 text-stone-400" />
                                        {moveName}
                                    </span>
                                ) : (
                                    moveName
                                )}
                            </p>
                            {!locked ? (
                                <div className="flex shrink-0 items-center gap-1">
                                    {(move.priority ?? 0) > 0 ? (
                                        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[8px] font-black text-sky-700">
                                            ⚡
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <span
                                className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-black", typeStyle)}
                            >
                                {negamonMonsterTypeLabel(t, move.type)}
                            </span>
                            <span
                                className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-bold", catStyle)}
                            >
                                {negamonMoveCategoryLabel(t, move.category)}
                            </span>
                            {codex && !isNegamonBasicAttackMoveId(move.id) ? (
                                <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-black text-violet-800">
                                    {t("negamonInfoLearnRankShort", { rank: move.learnRank })}
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold text-stone-500">
                            <span>
                                {t("monsterMovePowerShort")}{" "}
                                <span className="text-stone-800">
                                    {move.power > 0 ? move.power : "—"}
                                </span>
                            </span>
                            <span>
                                EN <span className="text-cyan-700">{energyCost}</span>
                            </span>
                        </div>
                        {locked ? (
                            <p className="mt-1 text-[9px] font-bold text-stone-400">
                                {t("monsterLockedMoveRank", { rank: String(move.learnRank) })}
                            </p>
                        ) : null}
                        <NegamonMoveInlineDescription
                            t={t}
                            move={move}
                            className={locked ? "text-stone-600" : undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
}

export function NegamonMovesSectionHeader() {
    const { t } = useLanguage();
    return (
        <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#5c4d3d]">
            <Swords className="h-3 w-3" />
            {t("monsterMovesHeading")}
        </p>
    );
}
