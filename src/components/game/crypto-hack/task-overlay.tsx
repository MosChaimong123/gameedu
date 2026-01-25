import { HackTask } from "@/lib/types/game";
import { TypeCodeTask } from "./tasks/type-code-task";
import { UploadTask } from "./tasks/upload-task";
import { PatternTask } from "./tasks/pattern-task";

type Props = {
    task: HackTask | null;
    onComplete: () => void;
}

export function TaskOverlay({ task, onComplete }: Props) {
    if (!task) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-100 overflow-hidden font-mono">
            {/* Glitch Overlay Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover mix-blend-overlay" />
            <div className="absolute inset-0 pointer-events-none bg-red-500/10 animate-pulse" />

            {/* Warning Header */}
            <div className="absolute top-10 flex flex-col items-center">
                <h1 className="text-6xl font-black text-red-500 tracking-[0.2em] uppercase glitch-text mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                    SYSTEM FAILURE
                </h1>
                <div className="text-xl text-red-400 font-bold bg-black/50 px-4 py-2 rounded border border-red-500/50">
                    CRITICAL ERROR DETECTED
                </div>
            </div>

            <div className="relative z-10 bg-black/80 p-8 rounded-3xl border-4 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.5)] backdrop-blur-xl">
                {task.type === "TYPE_CODE" && (
                    <TypeCodeTask task={task} onComplete={onComplete} />
                )}
                {task.type === "UPLOAD_DATA" && (
                    <UploadTask task={task} onComplete={onComplete} />
                )}
                {task.type === "PATTERN" && (
                    <PatternTask task={task} onComplete={onComplete} />
                )}
            </div>

            <div className="absolute bottom-8 text-red-500/50 text-sm font-mono animate-pulse">
                ERR_CODE: 0x{Math.floor(Math.random() * 10000).toString(16).toUpperCase()} // CONNECTION_UNSTABLE
            </div>
        </div>
    )
}
