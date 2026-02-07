"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GoldQuestPlayer, ChestReward } from "@/lib/types/game"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
    player: GoldQuestPlayer;
    otherPlayers?: GoldQuestPlayer[];
    onOpenChest: (index: number) => void;
    onInteraction?: (targetId: string) => void;
    currentReward: ChestReward | null;
    isChestOpen: boolean;
}

export function GoldQuestPlayerView({ player, otherPlayers = [], onOpenChest, onInteraction, currentReward, isChestOpen }: Props) {
    // Mock chest visuals
    const chests = [0, 1, 2];
    const [interactionTarget, setInteractionTarget] = useState<string | null>(null);

    const isInteraction = currentReward?.type === "SWAP" || currentReward?.type === "STEAL";

    return (
        <div className="h-full w-full relative flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center opacity-30 pointer-events-none" />

            <div className="z-40 w-full max-w-4xl flex flex-col items-center">
                <div className="text-center mb-12">
                    <h2 className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] tracking-tight mb-4">
                        {isChestOpen ? (isInteraction ? "เลือกเหยื่อ!" : "เปิดหีบสำเร็จ!") : "เลือกหีบสมบัติ"}
                    </h2>
                    {!isChestOpen && (
                        <p className="text-xl text-amber-200 font-bold animate-pulse tracking-widest uppercase">เลือกหีบเพื่อลุ้นรับรางวัล</p>
                    )}
                </div>

                <div className="flex w-full justify-center gap-6 md:gap-12 px-4">
                    {chests.map((i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => !isChestOpen && onOpenChest(i)}
                            className={cn(
                                "flex-1 aspect-square rounded-3xl cursor-pointer relative group transition-all duration-300 w-full max-w-[240px] z-50",
                                isChestOpen
                                    ? "opacity-50 grayscale cursor-not-allowed scale-95"
                                    : "hover:scale-110 hover:-translate-y-4 hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] shadow-2xl bg-gradient-to-b from-amber-500 to-amber-700 border-b-8 border-amber-900",
                                !isChestOpen && "animate-in slide-in-from-bottom-8 fade-in fill-mode-backwards"
                            )}
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            {/* Chest Graphic */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-none">
                                <div className={cn(
                                    "w-full h-2/3 bg-amber-900/40 rounded-xl border-4 border-amber-300/50 flex flex-col items-center justify-center shadow-inner relative transition-transform duration-300",
                                    !isChestOpen && "group-hover:-translate-y-2"
                                )}>
                                    {/* Lid */}
                                    <div className="w-[110%] h-1/2 absolute -top-2 bg-gradient-to-b from-amber-400 to-amber-600 rounded-lg border-b-4 border-amber-800 shadow-sm z-10" />
                                    {/* Lock */}
                                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-yellow-400 rounded-lg border-2 border-yellow-600 shadow-md z-20 flex items-center justify-center">
                                        <div className="w-2 h-3 bg-black/20 rounded-full" />
                                    </div>
                                    {/* Body Detail */}
                                    <div className="absolute bottom-4 w-3/4 h-2 bg-black/10 rounded-full" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Reward Overlay / Modal */}
            <AnimatePresence>
                {isChestOpen && currentReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-50 p-8 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl border-4 border-slate-200 relative overflow-hidden"
                        >
                            {/* Shine Effect */}
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "200%" }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 pointer-events-none"
                            />

                            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-2">
                                {isInteraction ? "แกล้งเพื่อน!" : "คุณได้รับ"}
                            </div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="text-5xl font-black text-amber-500 mb-2"
                            >
                                {currentReward.label}
                            </motion.div>
                            <div className="text-slate-500 font-bold mb-6">
                                {currentReward.type === "GOLD" && "เหรียญถูกเพิ่มในกระเป๋าแล้ว!"}
                                {currentReward.type === "LOSE_GOLD" && "แย่จัง! คุณเสียเหรียญไปบางส่วน"}
                                {currentReward.type === "MULTIPLIER" && `หีบสมบัติถัดไปจะคูณ x${currentReward.value}!`}
                                {currentReward.type === "NOTHING" && "โชคดีครั้งหน้านะ!"}
                                {isInteraction && "เลือกเพื่อนที่จะแกล้ง:"}
                            </div>

                            {/* Interaction List */}
                            {isInteraction && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="grid grid-cols-2 gap-2 mb-6 max-h-40 overflow-y-auto"
                                >
                                    {otherPlayers.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setInteractionTarget(p.id)}
                                            className={cn(
                                                "p-2 rounded-lg font-bold text-sm transition-all relative overflow-hidden",
                                                interactionTarget === p.id
                                                    ? "bg-amber-500 text-white shadow-lg scale-105"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            {p.name}
                                            {/* Selection Highlight */}
                                            {interactionTarget === p.id && (
                                                <motion.div
                                                    layoutId="highlight"
                                                    className="absolute inset-0 border-2 border-white/50 rounded-lg pointer-events-none"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                            {/* Continue Button */}
                            <Button
                                className="w-full h-12 text-xl font-bold bg-green-500 hover:bg-green-600 shadow-[0_4px_0_rgb(21,128,61)] active:scale-95 transition-transform"
                                disabled={isInteraction && !interactionTarget}
                                onClick={() => {
                                    if (isInteraction && interactionTarget && onInteraction) {
                                        onInteraction(interactionTarget)
                                    }
                                }}
                            >
                                {isInteraction ? "ยืนยัน" : "ไปต่อ"}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
