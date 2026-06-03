"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Ban, Box, Coins, Sparkles, Star, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameRewardResult } from "@/lib/game-core";
import { summarizeNegamonReward } from "./ui-content";

function blockedRewardLabel(reason: GameRewardResult["blockedReason"] | null) {
    if (reason === "daily_cap") return "รางวัลทองวันนี้ถึงขีดจำกัดแล้ว";
    if (reason === "pair_cooldown") return "คู่นี้ยังอยู่ในช่วงพักรางวัล";
    if (reason === "duplicate_finalize") return "รางวัลรอบนี้ถูกสรุปไปแล้ว";
    if (reason === "not_completed") return "การต่อสู้ยังไม่จบ จึงยังรับรางวัลไม่ได้";
    if (reason === "not_allowed") return "รอบนี้ยังไม่สามารถรับรางวัลได้";
    return null;
}

function blockedRewardMessage(reason: GameRewardResult["blockedReason"] | null) {
    if (reason === "daily_cap") {
        return "ชนะการต่อสู้แล้ว แต่ทองรอบนี้ไม่เข้าเพิ่ม เพราะรับทองจากการต่อสู้ครบโควตาของวันนี้แล้ว";
    }
    if (reason === "pair_cooldown") {
        return "ชนะการต่อสู้แล้ว แต่ทองรอบนี้ยังไม่เข้า เพราะเพิ่งได้รับรางวัลจากคู่ต่อสู้คนเดิมไปไม่นาน ระบบจึงพักรางวัลชั่วคราวเพื่อกันการฟาร์มซ้ำ";
    }
    if (reason === "duplicate_finalize") {
        return "ระบบบันทึกรางวัลรอบนี้ไว้แล้ว จึงไม่เพิ่มรางวัลซ้ำอีกครั้ง";
    }
    if (reason === "not_completed") {
        return "ต้องให้การต่อสู้จบสมบูรณ์ก่อน ระบบจึงจะสรุปรางวัลให้";
    }
    if (reason === "not_allowed") {
        return "รอบนี้ระบบไม่อนุญาตให้รับรางวัลเพิ่มเติม";
    }
    return null;
}

export function RewardResultModal({
    open,
    reward,
    requestedGoldReward = 0,
    goldReward = 0,
    rewardBlockedReason = null,
    onClose,
}: {
    open: boolean;
    reward: GameRewardResult | null;
    requestedGoldReward?: number;
    goldReward?: number;
    rewardBlockedReason?: GameRewardResult["blockedReason"] | null;
    onClose: () => void;
}) {
    const blockedReason = rewardBlockedReason ?? reward?.blockedReason ?? null;
    const blockedLabel = blockedRewardLabel(blockedReason);
    const blockedMessage = blockedRewardMessage(blockedReason);
    const hasProgress =
        reward ? reward.gold > 0 || reward.exp > 0 || reward.grantedItemIds.length > 0 : false;
    const grantedGold = reward?.gold ?? goldReward;

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
                                Negamon Reward
                            </p>
                            <h3 className="mt-1 text-2xl font-black">
                                {blockedLabel ? "สรุปรางวัลหลังชนะ" : "จบการต่อสู้"}
                            </h3>
                        </div>

                        <div className="max-h-[62dvh] space-y-3 overflow-y-auto p-4 sm:p-5">
                            {blockedLabel ? (
                                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                                    <p className="text-xs font-black text-rose-950">{blockedLabel}</p>
                                    {blockedMessage ? (
                                        <p className="mt-1 text-xs font-medium leading-5 text-rose-800">{blockedMessage}</p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap gap-1.5">
                                {summarizeNegamonReward(reward).map((line) => (
                                    <span
                                        key={line}
                                        className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600"
                                    >
                                        {line}
                                    </span>
                                ))}
                            </div>

                            {!blockedLabel && !hasProgress ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-black text-slate-700">รอบนี้ไม่มีรางวัลเพิ่มเติม</p>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                                    <Coins className="mb-2 h-4 w-4 text-amber-600" />
                                    <p className="text-[10px] font-black uppercase text-amber-700">
                                        {blockedLabel ? "ทองที่ควรได้" : "ทองที่ได้รับ"}
                                    </p>
                                    <p className="text-xl font-black tabular-nums text-amber-950">
                                        {blockedLabel ? requestedGoldReward : grantedGold}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                    <Star className="mb-2 h-4 w-4 text-emerald-600" />
                                    <p className="text-[10px] font-black uppercase text-emerald-700">
                                        {blockedLabel ? "ทองที่ได้จริง" : "EXP ที่ได้รับ"}
                                    </p>
                                    <p className="text-xl font-black tabular-nums text-emerald-950">
                                        {blockedLabel ? grantedGold : reward.exp}
                                    </p>
                                </div>
                            </div>

                            {blockedLabel ? (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                    <p className="text-xs font-black text-emerald-950">แต่ความก้าวหน้ายังได้ตามปกติ</p>
                                    <p className="mt-1 text-xs font-medium text-emerald-800">
                                        EXP {reward.exp} / ปลดล็อกสกิล {reward.unlockedSkillIds.length} / เลเวลอัป {reward.levelUps.length}
                                    </p>
                                </div>
                            ) : null}

                            {reward.grantedItemIds.length > 0 ? (
                                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                                    <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-sky-950">
                                        <Box className="h-3.5 w-3.5" />
                                        ไอเท็ม
                                    </p>
                                    <p className="break-words text-xs font-medium text-sky-800">
                                        {reward.grantedItemIds.join(", ")}
                                    </p>
                                </div>
                            ) : null}

                            {reward.levelUps.length > 0 ? (
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                                    {reward.levelUps.map((levelUp) => (
                                        <div key={`${levelUp.fromLevel}-${levelUp.toLevel}`} className="space-y-1">
                                            <p className="text-xs font-black text-indigo-950">
                                                เลเวล {levelUp.fromLevel} ไป {levelUp.toLevel}
                                            </p>
                                            {levelUp.toRankIndex != null ? (
                                                <p className="text-[11px] font-bold text-indigo-700">
                                                    ร่าง {levelUp.fromRankIndex ?? 0} ไป {levelUp.toRankIndex}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {reward.unlockedSkillIds.length > 0 ? (
                                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                                    <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-violet-950">
                                        <WandSparkles className="h-3.5 w-3.5" />
                                        สกิลใหม่
                                    </p>
                                    <p className="break-words text-xs font-medium text-violet-800">
                                        {reward.unlockedSkillIds.join(", ")}
                                    </p>
                                </div>
                            ) : null}

                            <Button type="button" className="w-full rounded-xl font-black" onClick={onClose}>
                                ไปต่อ
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
