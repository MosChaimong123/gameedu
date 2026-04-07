"use client";

import { useState } from "react";
import { Student } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { X, Shuffle, Trophy } from "lucide-react";
import { StudentAvatar } from "../student-avatar";
import useSound from "use-sound";
import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgStyle, getThemeHorizontalBgClass, type LevelConfigInput } from "@/lib/classroom-utils";

interface RandomPickerProps {
    students: Student[];
    theme: string;
    onClose: () => void;
    onSelect?: (student: Student) => void;
    levelConfig?: unknown;
}

export function RandomPicker({ students, theme, onClose, onSelect, levelConfig }: RandomPickerProps) {
    const { t } = useLanguage();
    const [running, setRunning] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [winner, setWinner] = useState<Student | null>(null);

    useSound("/sounds/drumroll.mp3");
    useSound("/sounds/tada.mp3");

    const pickRandom = () => {
        if (students.length === 0) return;

        setRunning(true);
        setWinner(null);

        let counter = 0;
        const maxIterations = 20 + Math.floor(Math.random() * 10);
        const intervalDuration = 100;

        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * students.length);
            setCurrentStudent(students[randomIndex]);
            counter++;

            if (counter >= maxIterations) {
                clearInterval(interval);
                const finalIndex = Math.floor(Math.random() * students.length);
                const finalStudent = students[finalIndex];
                setCurrentStudent(finalStudent);
                setWinner(finalStudent);
                setRunning(false);
                if (onSelect) onSelect(finalStudent);
            }
        }, intervalDuration);
    };

    const themeBtn = `${getThemeHorizontalBgClass(theme)} border-0 text-white shadow-md hover:opacity-95`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-3 sm:p-4">
            <div
                className="relative w-full max-w-[min(100%,24rem)] sm:max-w-md rounded-2xl border-2 border-amber-200/70 bg-[#faf8f5] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-stretch overflow-hidden"
                role="dialog"
                aria-labelledby="random-picker-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:bg-white hover:text-slate-900"
                    aria-label={t("close")}
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="px-5 pt-6 pb-3 text-center border-b border-amber-100/80 bg-gradient-to-b from-white/90 to-transparent">
                    <h2
                        id="random-picker-title"
                        className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900"
                    >
                        {t("randomPicker")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {t("divideStudentsSubtitle", { count: students.length })}
                    </p>
                </div>

                {winner && (
                    <div className="flex justify-center pt-3" aria-hidden>
                        <div className="animate-bounce">
                            <Trophy className="h-10 w-10 text-amber-500 drop-shadow" />
                        </div>
                    </div>
                )}

                <div className="flex min-h-[11rem] sm:min-h-[12rem] items-center justify-center px-4 py-4">
                    {currentStudent ? (
                        <div
                            className={`relative mx-auto flex w-full max-w-[13rem] flex-col items-center justify-center transition-transform duration-300 sm:max-w-[14rem] ${
                                winner ? "scale-105" : "scale-100"
                            }`}
                        >
                            <StudentAvatar
                                id={currentStudent.id}
                                name={currentStudent.name}
                                avatarSeed={currentStudent.avatar || currentStudent.id}
                                behaviorPoints={currentStudent.behaviorPoints}
                                academicPoints={0}
                                levelConfig={levelConfig as LevelConfigInput}
                                className="pointer-events-none w-full max-w-[12rem] border-amber-100/80 bg-white/95 shadow-md"
                            />
                        </div>
                    ) : (
                        <div className="flex h-32 w-32 sm:h-36 sm:w-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/80 text-slate-400 shadow-inner">
                            <Shuffle className="h-12 w-12 sm:h-14 sm:w-14 opacity-70" aria-hidden />
                        </div>
                    )}
                </div>

                {winner ? (
                    <div className="flex flex-col gap-3 border-t border-amber-100/80 bg-white/60 px-4 pb-5 pt-4">
                        <div className="text-center">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900">{winner.name}</h3>
                            <p className="mt-0.5 text-sm font-medium text-emerald-700">{t("randomPickerChosenSubtitle")}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button
                                size="lg"
                                onClick={pickRandom}
                                className={`h-12 w-full rounded-xl text-base font-bold ${themeBtn}`}
                                style={getThemeBgStyle(theme)}
                            >
                                {t("pickAnother")}
                            </Button>
                            <Button size="lg" variant="outline" onClick={onClose} className="h-12 w-full rounded-xl border-2 border-slate-200 font-bold text-slate-800 hover:bg-slate-50">
                                {t("close")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="border-t border-amber-100/80 bg-white/70 px-4 pb-5 pt-2">
                        <Button
                            size="lg"
                            onClick={pickRandom}
                            disabled={running || students.length === 0}
                            className={`h-12 w-full rounded-xl text-base font-bold ${themeBtn}`}
                            style={getThemeBgStyle(theme)}
                        >
                            {running ? t("randomPickerSpinning") : t("randomPicker")}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
