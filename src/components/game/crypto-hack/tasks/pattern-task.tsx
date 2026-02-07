import { useState, useEffect, useRef } from "react";
import { HackTask } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/use-sound";

type Props = {
    task: HackTask;
    onComplete: () => void;
}

export function PatternTask({ task, onComplete }: Props) {
    // 2x2 Grid: 0, 1, 2, 3
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);
    const [isPlaying, setIsPlaying] = useState(false); // If true, showing sequence
    const [litIndex, setLitIndex] = useState<number | null>(null); // Which button is currently lit
    const [isError, setIsError] = useState(false);
    const [round, setRound] = useState(1);

    // Safety check
    if (!task || task.type !== "PATTERN") return null;

    const targetLength = (task.type === "PATTERN" && task.payload && task.payload.length) || 4;
    // Fix: task.payload might be undefined if task type mismatch

    // Generate Sequence on mount
    useEffect(() => {
        // ... (existing)
        // Actually the payload structure is strict
        const len = (task as any).payload?.length || 4;
        const newSeq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
        // Use a ref to store seq to avoid re-renders? State is fine.
        setSequence(newSeq); // This triggers re-render but that's ok.

        // Delay start slightly
        setTimeout(() => playSequence(newSeq), 1000);
    }, []);

    const playSequence = (seq: number[], speed = 600) => {
        setIsPlaying(true);
        setIsError(false);
        setPlayerSequence([]);
        setLitIndex(null);

        let i = 0;
        const interval = setInterval(() => {
            if (i >= seq.length) {
                clearInterval(interval);
                setIsPlaying(false);
                setLitIndex(null);
                return;
            }

            // Flash on
            setLitIndex(seq[i]); // Doesn't trigger re-render immediately inside interval loop? React batches.
            // But setInterval is async.
            // Better to use recursion with timeout for precise control?
            // Existing logic was buggy: setLitIndex inside interval might not flash OFF correctly if speed is fast.
            // But let's stick to simple change.

            // Flash off quickly
            setTimeout(() => setLitIndex(null), speed / 2);

            i++;
        }, speed);
    };

    // ...

    const handlePress = (index: number) => {
        if (isPlaying || isError) return;

        // Visual feedback
        setLitIndex(index);
        setTimeout(() => setLitIndex(null), 200);

        // Check correctness immediate
        const expected = sequence[playerSequence.length];

        if (index !== expected) {
            setIsError(true);
            setPlayerSequence([]); // Reset
            setTimeout(() => {
                setIsError(false);
                playSequence(sequence);
            }, 1000);
            return;
        }

        const newPlayerSeq = [...playerSequence, index];
        setPlayerSequence(newPlayerSeq);

        // Check completion
        if (newPlayerSeq.length === sequence.length) {
            onComplete();
        }
    }

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md select-none animate-in zoom-in duration-300">
            <h2 className={cn(
                "text-2xl font-black uppercase tracking-widest animate-pulse transition-colors",
                isError ? "text-red-500" : "text-yellow-400"
            )}>
                {isError ? "PATTERN MISMATCH!" : "VERIFICATION REQUIRED"}
            </h2>
            <div className="text-slate-400 text-sm">
                {isPlaying ? "Watch the pattern..." : "Repeat the pattern!"}
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900 rounded-2xl border-2 border-slate-700 shadow-2xl">
                {[0, 1, 2, 3].map((i) => (
                    <button
                        key={i}
                        onClick={() => handlePress(i)}
                        disabled={isPlaying}
                        className={cn(
                            "w-24 h-24 rounded-xl transition-all duration-100 border-b-4 active:border-b-0 active:translate-y-1",
                            litIndex === i
                                ? "brightness-150 scale-95 shadow-[0_0_20px_white]"
                                : "brightness-100",
                            // Colors
                            i === 0 && "bg-red-500 border-red-700 shadow-red-500/50",
                            i === 1 && "bg-blue-500 border-blue-700 shadow-blue-500/50",
                            i === 2 && "bg-green-500 border-green-700 shadow-green-500/50",
                            i === 3 && "bg-yellow-500 border-yellow-700 shadow-yellow-500/50",
                            isPlaying && "cursor-not-allowed opacity-80"
                        )}
                    />
                ))}
            </div>

            <button
                onClick={() => playSequence(sequence)}
                disabled={isPlaying}
                className="text-xs text-slate-500 underline hover:text-white"
            >
                Replay Pattern
            </button>
        </div>
    )
}
