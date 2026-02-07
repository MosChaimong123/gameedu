import { useState, useEffect, useRef } from "react";
import { HackTask } from "@/lib/types/game";
import { cn } from "@/lib/utils";

type Props = {
    task: HackTask;
    onComplete: () => void;
}

export function FrequencyTask({ task, onComplete }: Props) {
    // Range 0-100
    const [value, setValue] = useState(20);
    const [target, setTarget] = useState({ min: 60, max: 80 });
    const [holdTime, setHoldTime] = useState(0);
    const [status, setStatus] = useState<"LOW" | "GOOD" | "HIGH">("LOW");

    // Stable Refs for Game Loop access
    const stateRef = useRef({
        value: 20,
        holdTime: 0,
        target: { min: 60, max: 80 }
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Randomization
    useEffect(() => {
        // Random Target Logic
        const min = 50 + Math.random() * 20;
        const newTarget = { min, max: min + 20 };
        setTarget(newTarget);
        stateRef.current.target = newTarget;

        const startVal = Math.random() * 40;
        setValue(startVal);
        stateRef.current.value = startVal;
    }, []);

    // Game Loop (Single Interval)
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            const state = stateRef.current;

            // 1. Decay Value
            state.value -= 1.5;
            if (state.value < 0) state.value = 0;

            // 2. Update UI State (Batched)
            setValue(state.value);

            // 3. Check Frequency Stability
            if (state.value >= state.target.min && state.value <= state.target.max) {
                // GOOD
                setStatus("GOOD");
                state.holdTime += 0.05; // 50ms = 0.05s

                if (state.holdTime >= 3.0) {
                    clearInterval(intervalRef.current!);
                    onComplete();
                    state.holdTime = 3.0;
                }
            } else {
                // BAD
                setStatus(state.value < state.target.min ? "LOW" : "HIGH");
                state.holdTime = Math.max(0, state.holdTime - 0.05); // Decay progress
            }
            setHoldTime(state.holdTime);

        }, 50);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [onComplete]);

    const handleTap = () => {
        // Modify Ref directly for immediate effect in next tick
        stateRef.current.value = Math.min(100, stateRef.current.value + 8);
        setValue(stateRef.current.value);
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md select-none">
            <h2 className={cn(
                "text-2xl font-black uppercase tracking-widest transition-colors",
                status === "GOOD" ? "text-green-500 animate-pulse" : "text-red-500"
            )}>
                {status === "GOOD" ? "SIGNAL LOCKED!" : "STABILIZE SIGNAL!"}
            </h2>

            <div className="w-full text-center text-slate-400 text-xs mb-2">
                Keep the bar in the GREEN ZONE for 3 seconds
            </div>

            {/* Signal Meter */}
            <div className="relative w-16 h-64 bg-slate-900 rounded-full border-4 border-slate-700 overflow-hidden shadow-inner">
                {/* Target Zone */}
                <div
                    className="absolute left-0 right-0 bg-green-500/20 border-y-2 border-green-500 z-10 animate-pulse transition-all duration-300"
                    style={{ bottom: `${target.min}%`, height: `${target.max - target.min}%` }}
                />

                {/* Level Bar */}
                <div
                    className={cn(
                        "absolute bottom-0 left-0 right-0 transition-all duration-75 ease-linear",
                        status === "GOOD" ? "bg-green-500 shadow-[0_0_20px_#22c55e]" : "bg-red-500 shadow-[0_0_10px_#ef4444]"
                    )}
                    style={{ height: `${value}%` }}
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30 pointer-events-none" />
            </div>

            {/* Progress Circle */}
            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="28" stroke="#1e293b" strokeWidth="8" fill="none" />
                    <circle
                        cx="64" cy="64" r="28"
                        stroke={status === "GOOD" ? "#22c55e" : "#ef4444"}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray="176"
                        strokeDashoffset={176 - (176 * (holdTime / 3))}
                        className="transition-all duration-100 ease-linear"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute text-2xl font-black font-mono text-white">
                    {Math.floor((holdTime / 3) * 100)}%
                </div>
            </div>

            <button
                onMouseDown={handleTap}
                onTouchStart={handleTap}
                className="w-full py-4 bg-slate-800 border-2 border-slate-600 rounded-xl text-xl font-bold text-slate-300 active:scale-95 active:bg-slate-700 transition-all shadow-lg hover:shadow-xl hover:border-slate-400 select-none touch-manipulation"
            >
                TAP TO BOOST ⚡
            </button>
        </div>
    )
}
