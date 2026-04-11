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
};

/**
 * คำอธิบายสกิลแบบเห็นทันที (ลำดับความ, คริ, เอฟเฟกต์จริง)
 * ไม่ซ้ำแถวพลัง/EN/ป้ายหมวด — แสดงเมื่อมีอย่างน้อยหนึ่งบรรทัด
 */
export function NegamonMoveInlineDescription({
    t,
    move,
    className,
}: NegamonMoveInlineDescriptionProps) {
    const effectDesc = negamonMoveEffectRealDescription(t, move);
    const effectTurns = move.effect ? negamonMoveEffectTurns(move.effect) : null;

    const hasExtra =
        (move.priority ?? 0) > 0 ||
        (move.critBonus ?? 0) > 0 ||
        Boolean(effectDesc);
    if (!hasExtra) return null;

    return (
        <div
            className={cn(
                "mt-1.5 space-y-0.5 border-t border-stone-200/60 pt-1.5 text-[9px] leading-snug",
                className
            )}
        >
            {(move.priority ?? 0) > 0 ? (
                <p className="font-semibold text-sky-800">{t("monsterMoveDetailPriority")}</p>
            ) : null}
            {(move.critBonus ?? 0) > 0 ? (
                <p className="font-semibold text-rose-800/90">
                    {t("monsterMoveDetailCritBonus", { crit: move.critBonus ?? 0 })}
                </p>
            ) : null}
            {effectDesc ? (
                <p className="font-medium text-emerald-900/95">
                    <span className="font-bold">{t("monsterMoveDetailRealEffect")}</span> {effectDesc}
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
