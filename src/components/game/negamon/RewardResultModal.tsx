"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Ban, Box, Coins, Sparkles, Star, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameRewardResult } from "@/lib/game-core";

function blockedRewardLabel(reason: GameRewardResult["blockedReason"]) {
    if (reason === "daily_cap") return "Daily reward limit reached";
    if (reason === "pair_cooldown") return "This opponent is cooling down";
    if (reason === "duplicate_finalize") return "Reward already finalized";
    if (reason === "not_completed") return "Battle is not completed";
    if (reason === "not_allowed") return "Reward is not available";
    return null;
}

export function RewardResultModal({
    open,
    reward,
    onClose,
}: {
    open: boolean;
    reward: GameRewardResult | null;
    onClose: () => void;
}) {
    const blockedLabel = reward ? blockedRewardLabel(reward.blockedReason) : null;
    const hasProgress =
        reward ? reward.gold > 0 || reward.exp > 0 || reward.grantedItemIds.length > 0 : false;

    return (
        <AnimatePresence>
            {open && reward ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                >
                    <motion.div
                        initial={{ scale: 0.96, y: 16 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.96, y: 16 }}
                        transition={{ duration: 0.22 }}
                        className="max-h-[92dvh] w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
                    >
                        <div className="relative bg-slate-950 px-5 py-5 text-white sm:py-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute right-3 top-3 rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                                {blockedLabel ? (
                                    <Ban className="h-6 w-6 text-rose-300" />
                                ) : (
                                    <Sparkles className="h-6 w-6 text-amber-300" />
                                )}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
                                Reward V2
                            </p>
                            <h3 className="mt-1 text-2xl font-black">
                                {blockedLabel ? "Reward Blocked" : "Battle Complete"}
                            </h3>
                        </div>

                        <div className="max-h-[62dvh] space-y-3 overflow-y-auto p-4 sm:p-5">
                            {blockedLabel ? (
                                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                                    <p className="text-xs font-black text-rose-950">{blockedLabel}</p>
                                </div>
                            ) : null}

                            {!blockedLabel && !hasProgress ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-black text-slate-700">No new rewards this time</p>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                                    <Coins className="mb-2 h-4 w-4 text-amber-600" />
                                    <p className="text-[10px] font-black uppercase text-amber-700">Gold</p>
                                    <p className="text-xl font-black tabular-nums text-amber-950">{reward.gold}</p>
                                </div>
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                    <Star className="mb-2 h-4 w-4 text-emerald-600" />
                                    <p className="text-[10px] font-black uppercase text-emerald-700">EXP</p>
                                    <p className="text-xl font-black tabular-nums text-emerald-950">{reward.exp}</p>
                                </div>
                            </div>

                            {reward.grantedItemIds.length > 0 ? (
                                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                                    <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-sky-950">
                                        <Box className="h-3.5 w-3.5" />
                                        Items
                                    </p>
                                    <p className="break-words text-xs font-medium text-sky-800">
                                        {reward.grantedItemIds.join(", ")}
                                    </p>
                                </div>
                            ) : null}

                            {reward.levelUps.length > 0 ? (
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                                    {reward.levelUps.map((levelUp) => (
                                        <p key={`${levelUp.fromLevel}-${levelUp.toLevel}`} className="text-xs font-black text-indigo-950">
                                            Level {levelUp.fromLevel} to {levelUp.toLevel}
                                        </p>
                                    ))}
                                </div>
                            ) : null}

                            {reward.unlockedSkillIds.length > 0 ? (
                                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                                    <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-violet-950">
                                        <WandSparkles className="h-3.5 w-3.5" />
                                        New skills
                                    </p>
                                    <p className="break-words text-xs font-medium text-violet-800">
                                        {reward.unlockedSkillIds.join(", ")}
                                    </p>
                                </div>
                            ) : null}

                            <Button type="button" className="w-full rounded-xl font-black" onClick={onClose}>
                                Continue
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
