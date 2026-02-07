import { useState, useEffect } from "react";
import { HackTask } from "@/lib/types/game";
import { cn } from "@/lib/utils";

type Props = {
    task: HackTask;
    onComplete: () => void;
}

type Card = {
    id: number;
    val: number;
    flipped: boolean;
    matched: boolean;
}

export function MemoryTask({ task, onComplete }: Props) {
    const [cards, setCards] = useState<Card[]>([]);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [matchedCount, setMatchedCount] = useState(0);

    // Initial Setup
    useEffect(() => {
        const pairs = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]; // 12 cards, 6 pairs
        // Shuffle
        for (let i = pairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
        }

        const newCards = pairs.map((val, idx) => ({
            id: idx,
            val,
            flipped: false,
            matched: false
        }));
        setCards(newCards);
    }, []);

    const handleFlip = (idx: number) => {
        if (flipped.length >= 2 || cards[idx].flipped || cards[idx].matched) return;

        const newCards = [...cards];
        newCards[idx].flipped = true;
        setCards(newCards);

        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            const [first, second] = newFlipped;
            if (newCards[first].val === newCards[second].val) {
                // Match!
                setTimeout(() => {
                    const matchedCards = [...cards];
                    matchedCards[first].matched = true;
                    matchedCards[second].matched = true;
                    // Keep flipped? Or hide? Keep flipped usually.
                    setCards(matchedCards);
                    setFlipped([]);
                    setMatchedCount(prev => prev + 1);
                }, 500);
            } else {
                // No Match - Flip back
                setTimeout(() => {
                    const resetCards = [...cards];
                    resetCards[first].flipped = false;
                    resetCards[second].flipped = false;
                    setCards(resetCards);
                    setFlipped([]);
                }, 1000);
            }
        }
    };

    useEffect(() => {
        if (matchedCount === 6) { // 6 pairs
            setTimeout(onComplete, 500);
        }
    }, [matchedCount, onComplete]);

    const getIcon = (val: number) => {
        switch (val) {
            case 1: return "₿";
            case 2: return "Ξ";
            case 3: return "Ð";
            case 4: return "◎";
            case 5: return "₳";
            case 6: return "₮";
            default: return "?";
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md select-none animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-blue-400 uppercase tracking-widest animate-pulse">
                DATA RECOVERY
            </h2>
            <div className="text-slate-400 text-sm">Find all matching pairs</div>

            <div className="grid grid-cols-4 gap-3 w-full aspect-[4/3]">
                {cards.map((card) => (
                    <button
                        key={card.id}
                        onClick={() => handleFlip(card.id)}
                        disabled={card.flipped || card.matched}
                        className={cn(
                            "relative w-full h-full transition-all duration-500 transform-style-3d",
                            card.flipped ? "rotate-y-180" : ""
                        )}
                        style={{ perspective: "1000px" }}
                    >
                        {/* Front Face (Hidden initially) */}
                        <div className={cn(
                            "absolute inset-0 w-full h-full backface-hidden bg-blue-600 border-2 border-blue-400 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg rotate-y-180",
                            card.matched && "bg-green-600 border-green-400 opacity-50 scale-95 transition-all"
                        )}>
                            {getIcon(card.val)}
                        </div>

                        {/* Back Face (Visible initially) */}
                        <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-800 border-2 border-slate-600 hover:border-slate-400 rounded-xl flex items-center justify-center shadow-lg">
                            <div className="w-8 h-8 rounded-full bg-slate-700/50" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
