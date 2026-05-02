import { cn } from "@/lib/utils";
import type { MonsterMove } from "@/lib/types/negamon";
import type { NegamonTranslateFn } from "@/lib/negamon-move-presenter";
import {
    negamonMoveEffectRealDescription,
    negamonMoveEffectTurns,
} from "@/lib/negamon-move-presenter";

type NegamonMoveInlineDescriptionProps = {
    t: NegamonTranslateFn;
    move: MonsterMove;
    className?: string;
    /** Light cards (codex/profile); use `dark` on charcoal / amber dialogs */
    tone?: "light" | "dark";
};

/** Compact move details shown only when a skill has extra effects. */
export function NegamonMoveInlineDescription({
    t,
    move,
    className,
    tone = "light",
}: NegamonMoveInlineDescriptionProps) {
    const effectDesc = negamonMoveEffectRealDescription(t, move);
    const effectTurns = move.effect ? negamonMoveEffectTurns(move) : null;

    const hasExtra =
        (move.priority ?? 0) > 0 ||
        (move.critBonus ?? 0) > 0 ||
        (move.drainPct ?? 0) > 0 ||
        Boolean(effectDesc);
    if (!hasExtra) return null;

    const isDark = tone === "dark";

    return (
        <div
            className={cn(
                "mt-1.5 space-y-1 border-t pt-2 text-[10px] leading-snug",
                isDark
                    ? "border-stone-600/50 text-amber-100/90"
                    : "border-stone-300/60 text-stone-800",
                className
            )}
        >
            {(move.priority ?? 0) > 0 ? (
                <p
                    className={cn(
                        "font-semibold",
                        isDark ? "text-sky-200" : "text-sky-900"
                    )}
                >
                    {t("monsterMoveDetailPriority")}
                </p>
            ) : null}
            {(move.critBonus ?? 0) > 0 ? (
                <p
                    className={cn(
                        "font-semibold",
                        isDark ? "text-rose-200" : "text-rose-900"
                    )}
                >
                    {t("monsterMoveDetailCritBonus", { crit: move.critBonus ?? 0 })}
                </p>
            ) : null}
            {effectDesc ? (
                <p
                    className={cn(
                        "font-medium",
                        isDark ? "text-emerald-200/95" : "text-stone-800"
                    )}
                >
                    <span
                        className={cn(
                            "font-bold",
                            isDark ? "text-emerald-100" : "text-emerald-900"
                        )}
                    >
                        {t("monsterMoveDetailRealEffect")}
                    </span>{" "}
                    {effectDesc}
                    {effectTurns === -1 ? (
                        <> ({t("monsterMoveEffectDurationInfinite")})</>
                    ) : effectTurns && effectTurns > 0 ? (
                        <> ({t("monsterMoveEffectDurationTurns", { turns: effectTurns })})</>
                    ) : null}
                    {move.effectChance && move.effectChance < 100 ? (
                        <> · {t("monsterMoveDetailChance", { chance: move.effectChance })}</>
                    ) : null}
                </p>
            ) : null}
        </div>
    );
}

