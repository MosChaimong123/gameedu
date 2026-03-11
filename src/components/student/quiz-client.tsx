"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/components/providers/socket-provider";

interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
}

interface QuizClientProps {
    assignment: {
        id: string;
        name: string;
        maxScore: number;
    };
    questions: QuizQuestion[];
    classId: string;
    studentCode: string;
    themeClass: string;
    themeStyle: React.CSSProperties;
}

export function QuizClient({ assignment, questions, classId, studentCode, themeClass, themeStyle }: QuizClientProps) {
    const router = useRouter();
    const { socket } = useSocket();
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showExplain, setShowExplain] = useState(false);

    const question = questions[currentQ];
    const isLastQ = currentQ === questions.length - 1;
    const progress = ((currentQ + 1) / questions.length) * 100;

    function selectOption(idx: number) {
        if (answers[currentQ] !== -1) return; // already answered
        const next = [...answers];
        next[currentQ] = idx;
        setAnswers(next);
        setSelectedOption(idx);
        setShowExplain(true);
    }

    async function handleNext() {
        setShowExplain(false);
        setSelectedOption(null);
        if (!isLastQ) {
            setCurrentQ(p => p + 1);
        } else {
            await submitQuiz();
        }
    }

    async function submitQuiz() {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/assignments/${assignment.id}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentCode, answers })
            });
            const data = await res.json();
            
            // Emit World Boss update if damage was dealt
            if (data.updatedBoss) {
                socket?.emit("classroom-update", {
                    classId,
                    type: "BOSS_UPDATE",
                    data: { boss: data.updatedBoss }
                });
            }

            setResult({
                score: data.score,
                correct: data.correct ?? answers.filter((a, i) => a === questions[i]?.correctAnswer).length,
                total: data.total ?? questions.length
            });
            setShowResult(true);
        } finally {
            setSubmitting(false);
        }
    }

    // ===== Result Screen =====
    if (showResult && result) {
        const pct = Math.round((result.correct / result.total) * 100);
        const passed = pct >= 70;
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-300">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-white ${themeClass}`} style={themeStyle}>
                        <Trophy className="w-12 h-12" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 mb-1">{passed ? "ยอดเยี่ยม! 🎉" : "ทำได้ดี! 💪"}</h1>
                    <p className="text-slate-400 mb-6">{assignment.name}</p>

                    <div className={`rounded-2xl p-6 mb-6 text-white ${themeClass}`} style={themeStyle}>
                        <p className="text-white/70 text-sm">คะแนนที่ได้</p>
                        <p className="text-6xl font-black">{result.score}</p>
                        <p className="text-white/70 text-sm">/ {assignment.maxScore}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                            <p className="text-2xl font-black text-green-600">{result.correct}</p>
                            <p className="text-xs text-green-500">ข้อถูก</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-2xl font-black text-red-500">{result.total - result.correct}</p>
                            <p className="text-xs text-red-400">ข้อผิด</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.back()}
                        className={`w-full h-12 rounded-xl font-bold text-white ${themeClass}`}
                        style={themeStyle}
                    >
                        กลับหน้าของฉัน
                    </Button>
                </div>
            </div>
        );
    }

    // ===== Quiz Screen =====
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className={`py-4 px-6 ${themeClass}`} style={themeStyle}>
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <BookOpen className="w-5 h-5" />
                        <span className="font-bold">{assignment.name}</span>
                    </div>
                    <span className="text-white/80 text-sm font-semibold">{currentQ + 1} / {questions.length}</span>
                </div>
                {/* Progress bar */}
                <div className="max-w-2xl mx-auto mt-3">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Question */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 mb-5 animate-in slide-in-from-right-4 duration-300">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-semibold">ข้อที่ {currentQ + 1}</p>
                    <h2 className="text-xl font-bold text-slate-800 leading-relaxed">{question.question}</h2>
                </div>

                <div className="space-y-3">
                    {question.options.map((opt, idx) => {
                        const answered = answers[currentQ] !== -1;
                        const isCorrect = idx === question.correctAnswer;
                        const isSelected = answers[currentQ] === idx;

                        let cardClass = "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md cursor-pointer";
                        if (answered && isCorrect) cardClass = "bg-green-50 border-green-400 text-green-800";
                        else if (answered && isSelected && !isCorrect) cardClass = "bg-red-50 border-red-400 text-red-800";
                        else if (answered) cardClass = "bg-white border-slate-100 text-slate-400 cursor-default";

                        return (
                            <button
                                key={idx}
                                onClick={() => selectOption(idx)}
                                disabled={answered}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${cardClass}`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                    answered && isCorrect ? 'bg-green-500 text-white' :
                                    answered && isSelected ? 'bg-red-500 text-white' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                    {answered && isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                                     answered && isSelected ? <XCircle className="w-5 h-5" /> :
                                     String.fromCharCode(65 + idx)}
                                </div>
                                <span className="font-semibold">{opt}</span>
                            </button>
                        );
                    })}
                </div>

                {showExplain && (
                    <div className={`mt-5 flex justify-end`}>
                        <Button
                            onClick={handleNext}
                            disabled={submitting}
                            className={`h-12 px-8 rounded-xl font-bold text-white ${themeClass}`}
                            style={themeStyle}
                        >
                            {isLastQ ? (submitting ? "กำลังบันทึก..." : "ส่งคำตอบ ✓") : <>ข้อถัดไป <ChevronRight className="w-5 h-5 ml-1" /></>}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
