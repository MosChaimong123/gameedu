"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import type { Opponent } from "@/components/negamon/battle-tab.types";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

interface OpponentPickerProps {
    opponents: Opponent[];
    onChallenge: (id: string) => void;
    challenging: string | null;
}

export function OpponentPicker({
    opponents,
    onChallenge,
    challenging,
}: OpponentPickerProps) {
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
                    <NegamonFormIcon
                        icon={op.formIcon}
                        label={op.name}
                        className="h-10 w-10 shrink-0"
                        emojiClassName="text-2xl"
                        width={40}
                        height={40}
                        imageClassName="h-full w-full object-contain"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-800">{op.name}</p>
                        <p className="text-[10px] text-slate-400">{op.formName} ยท Rank {op.rankIndex + 1}</p>
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
