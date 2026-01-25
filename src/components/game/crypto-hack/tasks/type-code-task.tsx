import { useState, useEffect } from "react";
import { HackTask } from "@/lib/types/game";
import { cn } from "@/lib/utils";

type Props = {
    task: HackTask;
    onComplete: () => void;
}

export function TypeCodeTask({ task, onComplete }: Props) {
    const [input, setInput] = useState("");
    const [shake, setShake] = useState(false);

    // Safety check
    if (task.type !== "TYPE_CODE") return null;

    const targetCode = task.payload.code;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (input.toUpperCase() === targetCode.toUpperCase()) {
            onComplete();
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setInput(""); // Optional: keep input or clear
        }
    }

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-red-500 uppercase tracking-widest animate-pulse">
                System Locked!
            </h2>
            <div className="text-slate-400 text-sm">Type the security code to reboot</div>

            <div className="bg-slate-950 p-6 rounded-lg border-2 border-red-500/50 w-full text-center select-none font-mono text-4xl font-black text-white tracking-[0.5em] shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                {targetCode}
            </div>

            <form onSubmit={handleSubmit} className="w-full relative">
                <input
                    autoFocus
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    className={cn(
                        "w-full bg-slate-800 text-white font-mono text-3xl text-center py-4 rounded-xl border-2 focus:outline-none transition-all uppercase placeholder:text-slate-600",
                        shake ? "border-red-500 translate-x-1" : "border-slate-600 focus:border-green-400"
                    )}
                    placeholder="ENTER CODE"
                />
            </form>

            <button
                onClick={(e) => handleSubmit(e as any)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg w-full transition-colors"
            >
                UNLOCK
            </button>
        </div>
    )
}
