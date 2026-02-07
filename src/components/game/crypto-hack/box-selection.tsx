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

    const handleSelect = (index: number, e?: any) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log("Box Selected:", index);
        if (selected !== null) return;
        setSelected(index);
        onSelect(index);
    }

    // Safety timeout: If loading takes too long (stuck), reset
    useEffect(() => {
        if (selected !== null && !reveal) {
            const timer = setTimeout(() => {
                console.log("Box selection timed out/resetting.");
                setSelected(null);
                // Optional: Notify parent or show error?
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [selected, reveal]);

    const renderRewardParams = (reward: any) => {
        if (!reward || !reward.type) return { text: "???", color: "text-slate-500" };

        switch (reward.type) {
            case "CRYPTO": return { text: `+${reward.amount}`, color: "text-green-400" };
            case "MULTIPLIER": return { text: `${reward.value}x`, color: "text-yellow-400" };
            case "HACK": return { text: "HACK", color: "text-red-500" };
            case "NOTHING": return { text: "EMPTY", color: "text-slate-500" };
            default: return { text: reward.type, color: "text-white" };
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8 w-full z-20">
            <h2 className="text-4xl font-black text-green-400 tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                {reveal ? "DECRYPTION COMPLETE" : "SELECT DATA PACKET"}
            </h2>

            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                {[0, 1, 2].map((i) => {
                    const isSelected = selected === i;
                    const isRevealed = reveal && reveal.index === i;
                    const rewardContent = isRevealed ? renderRewardParams(reveal.reward) : null;

                    return (
                        <motion.button
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: isRevealed ? 1.1 : (selected !== null && !isSelected ? 0.9 : 1),
                                opacity: selected !== null && !isSelected ? 0.3 : 1
                            }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={selected === null ? { scale: 1.05 } : {}}
                            onClick={(e) => handleSelect(i, e)}
                            disabled={selected !== null}
                            className={cn(
                                "w-40 h-40 md:w-56 md:h-56 border-4 flex items-center justify-center relative overflow-hidden transition-all group cursor-pointer z-30",
                                isRevealed
                                    ? "bg-black border-white shadow-[0_0_50px_rgba(255,255,255,0.5)]"
                                    : isSelected
                                        ? "bg-green-600 border-green-300 shadow-[0_0_30px_rgba(34,197,94,0.6)]"
                                        : "bg-black/80 border-green-800 hover:border-green-400 hover:bg-green-900/10 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                            )}
                        >
                            {/* Scanning Effect */}
                            {!isRevealed && !isSelected && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 animate-[scan_2s_ease-in-out_infinite]" />
                            )}

                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current" />

                            {isRevealed ? (
                                <div className={cn("font-black text-4xl md:text-5xl font-mono animate-in zoom-in spin-in-3 duration-300", rewardContent?.color || "text-white")}>
                                    {rewardContent?.text || JSON.stringify(reveal.reward)}
                                </div>
                            ) : (
                                <div className={cn("text-5xl md:text-6xl font-black font-mono tracking-tighter", isSelected ? "text-black animate-pulse" : "text-green-700 group-hover:text-green-400")}>
                                    {isSelected ? "[...]" : "0x" + (i + 1)}
                                </div>
                            )}
                        </motion.button>
                    )
                })}
            </div>
            <style jsx>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    )
}
