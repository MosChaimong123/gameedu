"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    Clock,
    GraduationCap,
    Key,
    Loader2,
    Sparkles,
    Star,
    Target,
    AlignLeft,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TeachingMediaReferenceList } from "@/components/media/teaching-media-reference-list";
import type { TeachingMediaReference } from "@/lib/teaching-media-reference";

type LessonExample = { title: string; body: string };
type LessonSection = { id: string; heading: string; content: string; examples: LessonExample[] };
type LessonContent = {
    objectives: string[];
    sections: LessonSection[];
    keyTerms: Array<{ term: string; definition: string }>;
    summary: string;
    estimatedMinutes?: number;
    mediaReferences?: TeachingMediaReference[];
};

type QuizQuestion = {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
};

type AssignedLesson = {
    id: string;
    lesson: {
        id: string;
        title: string;
        subject: string | null;
        gradeLevel: string | null;
        content: LessonContent;
    };
    completions: Array<{ completedAt: string; quizScore: number | null }>;
};

type QuizState =
    | { phase: "idle" }
    | { phase: "generating" }
    | { phase: "taking"; questions: QuizQuestion[]; answers: (number | null)[]; submitted: boolean }
    | { phase: "done"; score: number };

export default function StudentLessonPage() {
    const { code, lessonId } = useParams<{ code: string; lessonId: string }>();
    const router = useRouter();

    const [assignment, setAssignment] = useState<AssignedLesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [readSectionIds, setReadSectionIds] = useState<Set<string>>(new Set());
    const [allRead, setAllRead] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [completeError, setCompleteError] = useState<string | null>(null);
    const [quizError, setQuizError] = useState<string | null>(null);

    const [quiz, setQuiz] = useState<QuizState>({ phase: "idle" });

    useEffect(() => {
        fetch(`/api/student/${code}/lessons/${lessonId}`)
            .then((r) => {
                if (!r.ok) throw new Error(r.status === 404 ? "ไม่พบบทเรียนนี้" : "โหลดบทเรียนไม่สำเร็จ");
                return r.json();
            })
            .then((data: AssignedLesson) => {
                setAssignment(data);
                if (data.completions.length > 0) setCompleted(true);
                if (data.lesson.content.sections?.[0]) {
                    setExpandedSection(data.lesson.content.sections[0].id);
                    setReadSectionIds(new Set([data.lesson.content.sections[0].id]));
                }
                window.localStorage.setItem(`lesson-progress:${code}:${lessonId}`, new Date().toISOString());
            })
            .catch((e: Error) => setFetchError(e.message))
            .finally(() => setLoading(false));
    }, [code, lessonId]);

    const handleMarkComplete = useCallback(
        async (quizScore?: number) => {
            if (!assignment || completing) return;
            setCompleting(true);
            setCompleteError(null);
            try {
                const res = await fetch(
                    `/api/student/${code}/lessons/${lessonId}/complete`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ quizScore }),
                    }
                );
                if (res.ok) {
                    setCompleted(true);
                    setAssignment((prev) =>
                        prev
                            ? { ...prev, completions: [{ completedAt: new Date().toISOString(), quizScore: quizScore ?? null }] }
                            : prev
                    );
                } else {
                    setCompleteError("บันทึกผลไม่สำเร็จ ลองอีกครั้ง");
                }
            } catch {
                setCompleteError("เชื่อมต่อไม่สำเร็จ ลองอีกครั้ง");
            } finally {
                setCompleting(false);
            }
        },
        [assignment, completing, code, lessonId]
    );

    async function handleGenerateQuiz() {
        if (!assignment) return;
        setQuiz({ phase: "generating" });
        setQuizError(null);
        try {
            const res = await fetch(`/api/student/${code}/lessons/${lessonId}/quiz`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error("สร้าง quiz ไม่สำเร็จ");
            const questions = await res.json() as QuizQuestion[];
            setQuiz({ phase: "taking", questions, answers: Array(questions.length).fill(null), submitted: false });
        } catch (e: unknown) {
            setQuiz({ phase: "idle" });
            setQuizError(e instanceof Error ? e.message : "สร้าง quiz ไม่สำเร็จ ลองอีกครั้ง");
        }
    }

    function handleAnswer(qi: number, ai: number) {
        if (quiz.phase !== "taking" || quiz.submitted) return;
        const updated = [...quiz.answers];
        updated[qi] = ai;
        setQuiz({ ...quiz, answers: updated });
    }

    async function handleSubmitQuiz() {
        if (quiz.phase !== "taking") return;
        const { questions, answers } = quiz;
        const correct = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
        const score = Math.round((correct / questions.length) * 100);
        setQuiz({ ...quiz, submitted: true });
        await handleMarkComplete(score);
        setTimeout(() => setQuiz({ phase: "done", score }), 600);
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (fetchError || !assignment) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
                <p className="text-center font-bold text-slate-500">{fetchError ?? "ไม่พบบทเรียนนี้"}</p>
                <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
            </div>
        );
    }

    const { lesson } = assignment;
    const { content } = lesson;
    const totalSections = content.sections.length;
    const readPercent = totalSections > 0 ? Math.round((readSectionIds.size / totalSections) * 100) : 0;
    const lessonProgressPercent = completed ? 100 : Math.min(95, readPercent);
    const completion = assignment.completions[0] ?? null;
    const lessonStatus = completed ? "เรียนจบ" : readSectionIds.size > 1 || allRead ? "กำลังเรียน" : "ยังไม่เริ่ม";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
            <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">

                {/* Back nav */}
                <Link
                    href={`/student/${code}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800"
                >
                    <ChevronLeft className="h-4 w-4" />
                    กลับหน้าหลัก
                </Link>

                {/* Header card */}
                <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-lg shadow-emerald-200">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {lesson.subject ?? "บทเรียน"}
                        {lesson.gradeLevel && ` · ${lesson.gradeLevel}`}
                    </div>
                    <h1 className="text-2xl font-black leading-tight">{lesson.title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-white/70">
                        {content.estimatedMinutes && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                ประมาณ {content.estimatedMinutes} นาที
                            </span>
                        )}
                        {content.sections.length > 0 && (
                            <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                {content.sections.length} หัวข้อ
                            </span>
                        )}
                        {completed && (
                            <span className="flex items-center gap-1 text-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                เรียนแล้ว
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
                        <span>{lessonStatus}</span>
                        <span>{lessonProgressPercent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${lessonProgressPercent}%` }}
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span className="rounded-full bg-slate-50 px-2.5 py-1">
                            อ่านแล้ว {readSectionIds.size}/{totalSections || 1} หัวข้อ
                        </span>
                        {completion?.quizScore !== null && completion?.quizScore !== undefined ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                                <Star className="h-3 w-3 fill-current" />
                                Quiz {completion.quizScore}%
                            </span>
                        ) : null}
                    </div>
                </div>

                <TeachingMediaReferenceList references={content.mediaReferences} />

                {/* Objectives */}
                {content.objectives.length > 0 && (
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <Target className="h-5 w-5 text-emerald-600" />
                            <h2 className="font-black text-slate-800">วัตถุประสงค์</h2>
                        </div>
                        <ul className="space-y-2">
                            {content.objectives.map((obj, i) => (
                                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                                        {i + 1}
                                    </span>
                                    {obj}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Sections */}
                {content.sections.map((section, si) => (
                    <div key={section.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setExpandedSection((prev) => prev === section.id ? null : section.id);
                                setReadSectionIds((prev) => new Set(prev).add(section.id));
                                if (!allRead && si === content.sections.length - 1) setAllRead(true);
                            }}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                        >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
                                {si + 1}
                            </span>
                            <span className="flex-1 font-black text-slate-800">{section.heading}</span>
                            {expandedSection === section.id
                                ? <ChevronDown className="h-4 w-4 text-slate-400" />
                                : <ChevronRight className="h-4 w-4 text-slate-400" />
                            }
                        </button>
                        {expandedSection === section.id && (
                            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {section.content}
                                </div>
                                {section.examples.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">ตัวอย่าง</p>
                                        {section.examples.map((ex, ei) => (
                                            <div key={ei} className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                                                <p className="mb-1.5 text-sm font-black text-amber-800">{ex.title}</p>
                                                <p className="text-sm text-amber-700 leading-relaxed">{ex.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Key Terms */}
                {content.keyTerms.length > 0 && (
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <Key className="h-5 w-5 text-violet-500" />
                            <h2 className="font-black text-slate-800">คำศัพท์สำคัญ</h2>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {content.keyTerms.map((kt, i) => (
                                <div key={i} className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                                    <p className="text-sm font-black text-violet-800">{kt.term}</p>
                                    <p className="mt-1 text-xs text-violet-600 leading-relaxed">{kt.definition}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                {content.summary && (
                    <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <AlignLeft className="h-5 w-5 text-emerald-700" />
                            <h2 className="font-black text-emerald-800">สรุป</h2>
                        </div>
                        <p className="text-sm text-emerald-800 leading-relaxed">{content.summary}</p>
                    </div>
                )}

                {/* Completed banner — shown when re-opening a finished lesson */}
                {completed && quiz.phase === "idle" && (
                    <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
                        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <h3 className="font-black text-emerald-800">เรียนบทนี้จบแล้ว!</h3>
                        {assignment.completions[0]?.quizScore !== null && assignment.completions[0]?.quizScore !== undefined && (
                            <p className="mt-1 flex items-center justify-center gap-1.5 font-bold text-emerald-700">
                                <Star className="h-4 w-4 fill-current" />
                                คะแนน Quiz: {assignment.completions[0].quizScore}%
                            </p>
                        )}
                        <p className="mt-1 text-sm text-emerald-600">
                            เรียนเสร็จเมื่อ {new Date(assignment.completions[0]?.completedAt ?? "").toLocaleDateString("th-TH")}
                        </p>
                        <Button
                            onClick={() => router.push(`/student/${code}`)}
                            className="mt-4 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                        >
                            กลับหน้าหลัก
                        </Button>
                    </div>
                )}

                {/* Quiz section — only show if not yet completed */}
                {!completed && quiz.phase === "idle" && (
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm text-center">
                        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                            <Sparkles className="h-7 w-7" />
                        </div>
                        <h3 className="font-black text-slate-800">ทำ Quiz ท้ายบท</h3>
                        <p className="mt-1 text-sm text-slate-500">AI จะสร้างคำถามจากเนื้อหาบทเรียนนี้ 5 ข้อ</p>
                        {quizError && (
                            <p className="mt-2 text-sm font-bold text-red-500">{quizError}</p>
                        )}
                        {completeError && (
                            <p className="mt-2 text-sm font-bold text-red-500">{completeError}</p>
                        )}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                variant="outline"
                                onClick={() => handleMarkComplete()}
                                disabled={completing}
                                className="rounded-xl font-bold"
                            >
                                {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                ข้ามและเรียนเสร็จแล้ว
                            </Button>
                            <Button
                                onClick={handleGenerateQuiz}
                                className="rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                เริ่มทำ Quiz
                            </Button>
                        </div>
                    </div>
                )}

                {quiz.phase === "generating" && (
                    <div className="flex flex-col items-center gap-3 rounded-[2rem] border border-slate-100 bg-white py-12 shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        <p className="font-black text-slate-600">AI กำลังสร้างคำถาม...</p>
                    </div>
                )}

                {quiz.phase === "taking" && (
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            <h3 className="font-black text-slate-800">Quiz ท้ายบท</h3>
                            <span className="ml-auto text-sm text-slate-400">
                                ตอบแล้ว {quiz.answers.filter((a) => a !== null).length}/{quiz.questions.length}
                            </span>
                        </div>

                        {quiz.questions.map((q, qi) => (
                            <div key={q.id} className="space-y-3">
                                <p className="font-black text-slate-800">
                                    <span className="mr-2 text-amber-500">{qi + 1}.</span>
                                    {q.question}
                                </p>
                                <div className="grid gap-2">
                                    {q.options.map((opt, oi) => {
                                        const selected = quiz.answers[qi] === oi;
                                        const isCorrect = oi === q.correctAnswer;
                                        const showResult = quiz.submitted;
                                        return (
                                            <button
                                                key={oi}
                                                type="button"
                                                disabled={quiz.submitted}
                                                onClick={() => handleAnswer(qi, oi)}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all",
                                                    showResult && isCorrect
                                                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                                                        : showResult && selected && !isCorrect
                                                          ? "border-red-300 bg-red-50 text-red-700"
                                                          : selected
                                                            ? "border-amber-400 bg-amber-50 text-amber-800"
                                                            : "border-slate-200 hover:border-amber-300 hover:bg-amber-50"
                                                )}
                                            >
                                                <span className={cn(
                                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black",
                                                    showResult && isCorrect ? "bg-emerald-500 text-white"
                                                        : showResult && selected && !isCorrect ? "bg-red-400 text-white"
                                                            : selected ? "bg-amber-400 text-white"
                                                                : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {String.fromCharCode(65 + oi)}
                                                </span>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                                {quiz.submitted && (
                                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        💡 {q.explanation}
                                    </p>
                                )}
                            </div>
                        ))}

                        {completeError && (
                            <p className="text-center text-sm font-bold text-red-500">{completeError}</p>
                        )}
                        {!quiz.submitted && (
                            <Button
                                onClick={handleSubmitQuiz}
                                disabled={quiz.answers.some((a) => a === null) || completing}
                                className="w-full rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600"
                            >
                                {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                ส่งคำตอบ
                            </Button>
                        )}
                    </div>
                )}

                {quiz.phase === "done" && (
                    <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                            <Star className="h-8 w-8 fill-current" />
                        </div>
                        <h3 className="text-2xl font-black text-emerald-800">
                            {quiz.score}%
                        </h3>
                        <p className="mt-1 font-bold text-emerald-700">
                            {quiz.score >= 80
                                ? "ยอดเยี่ยม! เรียนจบบทนี้แล้ว 🎉"
                                : quiz.score >= 60
                                  ? "ผ่านแล้ว ทำได้ดี!"
                                  : "ลองอ่านทบทวนอีกครั้งนะ"}
                        </p>
                        <p className="mt-2 text-sm text-emerald-600">
                            ได้รับ XP +5 และ Gold +20 แล้ว!
                        </p>
                        <Button
                            onClick={() => router.push(`/student/${code}`)}
                            className="mt-5 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                        >
                            กลับหน้าหลัก
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
