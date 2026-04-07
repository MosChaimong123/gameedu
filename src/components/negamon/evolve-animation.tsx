"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import type { MonsterForm, MonsterStats } from "@/lib/types/negamon";
import { useLanguage } from "@/components/providers/language-provider";

interface EvolveAnimationProps {
    oldForm: MonsterForm;
    newForm: MonsterForm;
    oldStats: MonsterStats;
    newStats: MonsterStats;
    speciesName: string;
    onDone: () => void;
}

function statShortLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    key: keyof MonsterStats
): string {
    if (key === "hp") return t("playNegamonHpLabel");
    if (key === "atk") return t("hostStatAtk");
    if (key === "def") return t("hostStatDef");
    return t("monsterStatSpd");
}

export function EvolveAnimation({
    oldForm,
    newForm,
    oldStats,
    newStats,
    speciesName,
    onDone,
}: EvolveAnimationProps) {
    const { t } = useLanguage();
    const [phase, setPhase] = useState<"flash" | "reveal" | "stats">("flash");

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("reveal"), 1200);
        const t2 = setTimeout(() => setPhase("stats"), 2400);
        const t3 = setTimeout(() => onDone(), 5000);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [onDone]);

    const statDiffs = (["hp", "atk", "def", "spd"] as const).map((key) => ({
        key,
        label: statShortLabel(t, key),
        old: oldStats[key],
        next: newStats[key],
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <AnimatePresence>
                {phase === "flash" && (
                    <motion.div
                        key="flash"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.8, 1, 0.6, 0] }}
                        transition={{ duration: 1.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                        className="absolute inset-0 bg-white"
                    />
                )}

                {(phase === "reveal" || phase === "stats") && (
                    <motion.div
                        key="card"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border-2 border-amber-200 p-8 w-80 text-center"
                    >
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute text-amber-400"
                                style={{
                                    top: `${10 + Math.sin((i * 45 * Math.PI) / 180) * 40}%`,
                                    left: `${50 + Math.cos((i * 45 * Math.PI) / 180) * 45}%`,
                                }}
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 180] }}
                                transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity }}
                            >
                                <Sparkles className="w-4 h-4" />
                            </motion.div>
                        ))}

                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-3">
                            {t("negamonEvolvedBadge")}
                        </p>

                        <div className="flex items-center justify-center gap-4 mb-4">
                            <motion.div
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 0.6, repeat: 2 }}
                                className="text-4xl opacity-40"
                            >
                                {oldForm.icon}
                            </motion.div>
                            <motion.div
                                animate={{ x: [-4, 4, -4] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="text-amber-400 text-xl font-black"
                            >
                                →
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: [1.3, 1], opacity: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className="text-5xl"
                            >
                                {newForm.icon}
                            </motion.div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 mb-1">{newForm.name}</h2>
                        <p className="text-sm text-slate-400 font-semibold mb-4">{speciesName}</p>

                        {phase === "stats" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100"
                            >
                                {statDiffs.map(({ key, label, old, next: nextVal }) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                        <span className="font-black text-slate-500 w-10">{label}</span>
                                        <span className="text-slate-400">{old}</span>
                                        <span className="text-slate-300 mx-1">→</span>
                                        <span className="font-black text-emerald-600">{nextVal}</span>
                                        <span className="flex items-center gap-0.5 text-emerald-500 font-black text-xs w-12 text-right">
                                            <TrendingUp className="w-3 h-3" />+{nextVal - old}
                                        </span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface EvolveState {
    visible: boolean;
    oldForm?: MonsterForm;
    newForm?: MonsterForm;
    oldStats?: MonsterStats;
    newStats?: MonsterStats;
    speciesName?: string;
}

export function useEvolveAnimation() {
    const [state, setState] = useState<EvolveState>({ visible: false });

    const triggerEvolve = useCallback(
        (
            oldForm: MonsterForm,
            newForm: MonsterForm,
            oldStats: MonsterStats,
            newStats: MonsterStats,
            speciesName: string
        ) => {
            setState({ visible: true, oldForm, newForm, oldStats, newStats, speciesName });
        },
        []
    );

    const dismiss = useCallback(() => setState({ visible: false }), []);

    const node =
        state.visible && state.oldForm && state.newForm && state.oldStats && state.newStats ? (
            <EvolveAnimation
                oldForm={state.oldForm}
                newForm={state.newForm}
                oldStats={state.oldStats}
                newStats={state.newStats}
                speciesName={state.speciesName ?? ""}
                onDone={dismiss}
            />
        ) : null;

    return { triggerEvolve, node };
}
