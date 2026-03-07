"use client";

import { useState, useEffect } from "react";
import { Student } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { X, Shuffle, Trophy } from "lucide-react";
import { StudentAvatar } from "../student-avatar";
import useSound from "use-sound";
import { useLanguage } from "@/components/providers/language-provider";

interface RandomPickerProps {
    students: Student[];
    onClose: () => void;
    onSelect?: (student: Student) => void;
    levelConfig?: any;
}

export function RandomPicker({ students, onClose, onSelect, levelConfig }: RandomPickerProps) {
    const { t } = useLanguage();
    const [running, setRunning] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [winner, setWinner] = useState<Student | null>(null);

    // Sounds
    const [playDrumRoll, { stop: stopDrumRoll }] = useSound("/sounds/drumroll.mp3"); // Need to add
    const [playTada] = useSound("/sounds/tada.mp3"); // Need to add

    const pickRandom = () => {
        if (students.length === 0) return;

        setRunning(true);
        setWinner(null);
        // playDrumRoll();

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
                // stopDrumRoll();
                // playTada();
                if (onSelect) onSelect(finalStudent);
            }
        }, intervalDuration);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-12 w-full max-w-2xl relative animate-in zoom-in-95 duration-200 flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-8">
                    {t("randomPicker")}
                </h2>

                <div className="w-64 h-64 mb-8 flex items-center justify-center relative">
                    {currentStudent ? (
                        <div className={`transform transition-all duration-300 ${winner ? "scale-125" : "scale-100"}`}>
                            <StudentAvatar
                                id={currentStudent.id}
                                name={currentStudent.name}
                                avatarSeed={currentStudent.avatar || currentStudent.id}
                                points={currentStudent.points} // Visual only
                                levelConfig={levelConfig}
                                className="w-full h-full pointer-events-none"
                            />
                            {winner && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce">
                                    <Trophy className="w-12 h-12 text-yellow-500 drop-shadow-lg" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-48 h-48 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <Shuffle className="w-24 h-24" />
                        </div>
                    )}
                </div>

                {winner ? (
                    <div className="flex flex-col gap-4 w-full">
                        <div className="text-center mb-4">
                            <h3 className="text-2xl font-bold text-slate-800">{winner.name}</h3>
                            <p className="text-slate-500">is the chosen one!</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button size="lg" onClick={pickRandom} className="w-full">
                                {t("pickAnother")}
                            </Button>
                            <Button size="lg" variant="outline" onClick={onClose} className="w-full">
                                {t("close")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        onClick={pickRandom}
                        disabled={running}
                        className="w-full h-16 text-xl rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                    >
                        {running ? "Spinning..." : t("randomPicker")}
                    </Button>
                )}
            </div>
        </div>
    );
}
