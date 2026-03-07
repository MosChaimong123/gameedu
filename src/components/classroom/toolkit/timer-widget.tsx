"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
                setTimeLeft((time) => time - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            playAlarm();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-8">
                    {/* Timer Display */}
                    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                        {/* Static Background Ring */}
                        <div className="absolute inset-0 rounded-full border-8 border-slate-100"></div>

                        {/* Dynamic Ring logic is tricky with CSS only, using simpler progress bar below */}
                        <div className="text-6xl font-black text-slate-800 tabular-nums tracking-wider">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <Progress value={progress} className="h-4 rounded-full" />


                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="h-16 w-16 rounded-full"
                            onClick={toggleTimer}
                            variant={isActive ? "secondary" : "default"}
                        >
                            {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-12 w-12 rounded-full"
                            onClick={resetTimer}
                        >
                            <RotateCcw className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="ghost" onClick={() => setTime(60)}>1m</Button>
                        <Button variant="ghost" onClick={() => setTime(300)}>5m</Button>
                        <Button variant="ghost" onClick={() => setTime(600)}>10m</Button>
                        <Button variant="ghost" onClick={() => setTime(900)}>15m</Button>
                    </div>

                    {/* Custom Input */}
                    <form onSubmit={handleCustomSubmit} className="flex gap-2 justify-center items-center pt-4 border-t border-slate-100">
                        <Input
                            placeholder="Min"
                            className="w-16 text-center"
                            value={customMinutes}
                            onChange={e => setCustomMinutes(e.target.value)}
                        />
                        <span>:</span>
                        <Input
                            placeholder="Sec"
                            className="w-16 text-center"
                            value={customSeconds}
                            onChange={e => setCustomSeconds(e.target.value)}
                        />
                        <Button type="submit" variant="secondary" size="sm">Set</Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
