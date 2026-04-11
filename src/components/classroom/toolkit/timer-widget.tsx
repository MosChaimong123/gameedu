"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import useSound from "use-sound";

interface TimerWidgetProps {
    onClose: () => void;
}

export function TimerWidget({ onClose }: TimerWidgetProps) {
    const [timeLeft, setTimeLeft] = useState(300); // Default 5 mins
    const [duration, setDuration] = useState(300);
    const [isActive, setIsActive] = useState(false);
    const [customMinutes, setCustomMinutes] = useState("");
    const [customSeconds, setCustomSeconds] = useState("");

    const [playAlarm] = useSound("/sounds/alarm.mp3"); // Ensure this exists later

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((time) => {
                    const next = time - 1;

                    if (next <= 0) {
                        if (interval) clearInterval(interval);
                        window.requestAnimationFrame(() => {
                            setIsActive(false);
                            playAlarm();
                        });
                        return 0;
                    }

                    return next;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, playAlarm]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration);
    };

    const setTime = (seconds: number) => {
        setIsActive(false);
        setDuration(seconds);
        setTimeLeft(seconds);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const mins = parseInt(customMinutes) || 0;
        const secs = parseInt(customSeconds) || 0;
        const total = mins * 60 + secs;
        if (total > 0) setTime(total);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-300">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all"
            >
                <X className="w-8 h-8" />
            </button>

            <div className="flex flex-col items-center w-full max-w-5xl animate-in zoom-in-95 duration-500 delay-100">
                {/* Timer Display */}
                <div className={`text-[8rem] sm:text-[12rem] md:text-[16rem] leading-none font-black tracking-widest tabular-nums mb-8 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-colors duration-500 ${timeLeft <= 10 && isActive ? 'text-rose-500 drop-shadow-[0_0_40px_rgba(244,63,94,0.4)]' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-3xl h-6 bg-white/10 rounded-full overflow-hidden mb-12 shadow-inner">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${timeLeft <= 10 && isActive ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'}`} 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 sm:gap-10 mb-12">
                    <Button
                        size="lg"
                        className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-white text-slate-900 hover:bg-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
                        onClick={toggleTimer}
                    >
                        {isActive ? <Pause className="w-10 h-10 sm:w-14 sm:h-14" /> : <Play className="w-10 h-10 sm:w-14 sm:h-14 ml-2" />}
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-white/20 text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                        onClick={resetTimer}
                    >
                        <RotateCcw className="w-8 h-8 sm:w-10 sm:h-10" />
                    </Button>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 w-full max-w-3xl">
                    {[1, 3, 5, 10, 15, 30].map(m => (
                        <Button 
                            key={m} 
                            variant="outline" 
                            className="text-lg sm:text-xl px-5 sm:px-8 py-6 sm:py-7 rounded-2xl border-white/20 text-white hover:bg-white/10 bg-transparent transition-all hover:-translate-y-1" 
                            onClick={() => setTime(m * 60)}
                        >
                            {m}m
                        </Button>
                    ))}
                </div>

                {/* Custom Input */}
                <form onSubmit={handleCustomSubmit} className="flex gap-2 sm:gap-4 justify-center items-center bg-white/5 p-4 rounded-3xl border border-white/10 w-full max-w-xl mx-auto">
                    <Input
                        placeholder="Min"
                        className="w-20 sm:w-28 h-14 sm:h-16 text-2xl sm:text-3xl text-center bg-white/10 border-none text-white placeholder:text-white/30 rounded-2xl focus-visible:ring-1 focus-visible:ring-white/50"
                        value={customMinutes}
                        onChange={e => setCustomMinutes(e.target.value)}
                    />
                    <span className="text-3xl sm:text-4xl text-white/50 font-bold">:</span>
                    <Input
                        placeholder="Sec"
                        className="w-20 sm:w-28 h-14 sm:h-16 text-2xl sm:text-3xl text-center bg-white/10 border-none text-white placeholder:text-white/30 rounded-2xl focus-visible:ring-1 focus-visible:ring-white/50"
                        value={customSeconds}
                        onChange={e => setCustomSeconds(e.target.value)}
                    />
                    <Button type="submit" size="lg" className="h-14 sm:h-16 px-6 sm:px-10 text-lg sm:text-xl rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white transition-colors border border-indigo-400/50">
                        Set
                    </Button>
                </form>
            </div>
        </div>
    );
}
