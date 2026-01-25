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
        <div className="flex-1 w-full relative flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center opacity-30" />

            <div className="z-10 w-full max-w-lg">
                {/* Instructions / Prompt */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white drop-shadow-md pb-2">
                        {isChestOpen ? (isInteraction ? "Choose a Victim!" : "Reward Unlocked!") : "Choose a Chest"}
                    </h2>
                    {!isChestOpen && (
                        <p className="text-slate-300 font-bold animate-pulse">Select one of 3 chests (NO ANIM)</p>
                    )}
                </div>

                <div className="flex w-full justify-center gap-4">
                    {chests.map((i) => (
                        <div
                            key={i}
                            onClick={() => !isChestOpen && onOpenChest(i)}
                            className={cn(
                                "flex-1 aspect-square rounded-2xl cursor-pointer shadow-xl relative group transition-all max-w-[150px]",
                                isChestOpen
                                    ? "opacity-50 grayscale cursor-not-allowed"
                                    : "hover:shadow-amber-500/20 bg-gradient-to-br from-amber-600 to-amber-800 border-b-8 border-amber-900",
                                // Add a transform hover effect manually since motion is gone
                                !isChestOpen && "hover:scale-105 hover:-rotate-2"
                            )}
                        >
                            {/* Chest Graphic (simplified css/svg) */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-16 h-12 bg-amber-900 rounded-md border-2 border-amber-400 flex flex-col items-center justify-center shadow-inner relative group-hover:-translate-y-1 transition-transform">
                                    <div className="w-full h-1/2 border-b-2 border-black/20 bg-amber-800 rounded-t-sm" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-5 bg-yellow-400 rounded-sm border border-yellow-600 shadow-sm" />
                                </div>
                            </div>
                        </div>
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
                                {isInteraction ? "Interaction!" : "You Found"}
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
                                {currentReward.type === "GOLD" && "Coins added to your total!"}
                                {currentReward.type === "LOSE_GOLD" && "Oh no! You lost some gold."}
                                {currentReward.type === "MULTIPLIER" && `Your next chest will be x${currentReward.value}!`}
                                {currentReward.type === "NOTHING" && "Better luck next time!"}
                                {isInteraction && "Select a player to target:"}
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
                                {isInteraction ? "Confirm" : "Continue"}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
