import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CryptoReward } from "@/lib/types/game";

type Props = {
    onSelect: (index: number) => void;
    reveal: { index: number, reward: CryptoReward } | null;
}

export function CryptoBoxSelection({ onSelect, reveal }: Props) {
    console.log("CryptoBoxSelection Render. Reveal:", reveal);
    const [selected, setSelected] = useState<number | null>(null);

    // Sync selected state if reveal comes in (in case selection handling was upstream)
    useEffect(() => {
        if (reveal && selected === null) {
            setSelected(reveal.index);
        }
        if (!reveal) {
            setSelected(null); // Reset when parent clears reveal
        }
    }, [reveal]);

    const handleSelect = (index: number) => {
        if (selected !== null) return;
        setSelected(index);
        onSelect(index);
    }

    // Safety timeout: If loading takes too long (stuck), reset
    useEffect(() => {
        if (selected !== null && !reveal) {
            const timer = setTimeout(() => {
                setSelected(null);
                // Optional: Notify parent or show error?
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [selected, reveal]);

    const renderRewardParams = (reward: CryptoReward) => {
        switch (reward.type) {
            case "CRYPTO": return { text: `+${reward.amount}`, color: "text-green-400" };
            case "MULTIPLIER": return { text: `${reward.value}x`, color: "text-yellow-400" };
            case "HACK": return { text: "HACK", color: "text-red-500" };
            case "NOTHING": return { text: "EMPTY", color: "text-slate-500" };
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-3xl font-black text-green-400 tracking-wider">
                {reveal ? "DECRYPTION COMPLETE" : "SELECT A NODE"}
            </h2>

            <div className="flex gap-6">
                {[0, 1, 2].map((i) => {
                    const isSelected = selected === i;
                    const isRevealed = reveal && reveal.index === i;
                    const rewardContent = isRevealed ? renderRewardParams(reveal.reward) : null;

                    return (
                        <motion.button
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: isRevealed ? 1.1 : (selected !== null && !isSelected ? 0.8 : 1),
                                opacity: selected !== null && !isSelected ? 0.5 : 1
                            }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={selected === null ? { scale: 1.05 } : {}}
                            onClick={() => handleSelect(i)}
                            disabled={selected !== null}
                            className={cn(
                                "w-48 h-48 rounded-xl border-4 flex items-center justify-center relative overflow-hidden transition-all",
                                isRevealed
                                    ? "bg-slate-900 border-white shadow-[0_0_50px_rgba(255,255,255,0.5)]"
                                    : isSelected
                                        ? "bg-green-500 border-green-300 shadow-[0_0_50px_rgba(34,197,94,0.6)]"
                                        : "bg-black/50 border-green-700 hover:border-green-400 hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]"
                            )}
                        >
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

                            {isRevealed ? (
                                <div className={cn("font-black text-4xl animate-in fade-in zoom-in duration-300", rewardContent?.color || "text-white")}>
                                    {rewardContent?.text || JSON.stringify(reveal.reward)}
                                </div>
                            ) : (
                                <div className={cn("text-6xl font-mono", isSelected ? "text-black animate-pulse" : "text-green-500")}>
                                    {isSelected ? "..." : "?"}
                                </div>
                            )}
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}
