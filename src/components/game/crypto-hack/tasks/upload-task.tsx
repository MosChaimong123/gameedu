import { useState, useEffect, useRef } from "react";
import { HackTask } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import useSound from "use-sound";

type Props = {
    task: HackTask;
    onComplete: () => void;
}

export function UploadTask({ task, onComplete }: Props) {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Safety check
    if (task.type !== "UPLOAD_DATA") return null;

    useEffect(() => {
        if (isHolding) {
            intervalRef.current = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 1.5; // Speed
                    if (next >= 100) {
                        clearInterval(intervalRef.current!);
                        onComplete();
                        return 100;
                    }
                    return next;
                });
            }, 50); // Tick rate
        } else {
            // Decay when not holding
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setProgress(prev => Math.max(0, prev - 2));
            }, 50);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [isHolding, onComplete]);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md select-none">
            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-widest animate-pulse">
                Uploading Virus Patch...
            </h2>
            <div className="text-slate-400 text-sm">Hold the button to upload</div>

            {/* Progress Bar Container */}
            <div className="w-full h-12 bg-slate-900 rounded-full border-2 border-slate-700 overflow-hidden relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

                {/* Fill */}
                <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-75 ease-linear box-border border-r-4 border-white/50"
                    style={{ width: `${progress}%` }}
                />

                {/* Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-white shadow-black drop-shadow-md">
                    {Math.floor(progress)}%
                </div>
            </div>

            <button
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => setIsHolding(true)}
                onTouchEnd={() => setIsHolding(false)}
                className={cn(
                    "w-32 h-32 rounded-full border-8 flex items-center justify-center transition-all duration-100",
                    isHolding
                        ? "bg-blue-600 border-blue-400 scale-95 shadow-[0_0_30px_rgba(37,99,235,0.6)]"
                        : "bg-slate-800 border-slate-600 hover:border-slate-400 shadow-xl hover:scale-105"
                )}
            >
                <div className={cn("text-5xl transition-all", isHolding ? "text-white scale-90" : "text-slate-400")}>
                    {isHolding ? "⬆️" : "☁️"}
                </div>
            </button>
            <div className="text-xs text-slate-500 font-mono">Size: {task.payload.size} MB</div>
        </div>
    )
}
