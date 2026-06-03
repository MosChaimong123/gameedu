"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    BookOpen,
    CheckCircle2,
    Clock,
    GraduationCap,
    Loader2,
    ChevronRight,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LessonCompletion = {
    completedAt: string;
    quizScore: number | null;
};

type AssignedLesson = {
    id: string;
    lessonId: string;
    lesson: {
        id: string;
        title: string;
        subject: string | null;
        gradeLevel: string | null;
        description: string | null;
        content: { estimatedMinutes?: number };
    };
    completions: LessonCompletion[];
};

interface StudentLessonsTabProps {
    code: string;
}

export function StudentLessonsTab({ code }: StudentLessonsTabProps) {
    const [lessons, setLessons] = useState<AssignedLesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/student/${code}/lessons`)
            .then((r) => r.json())
            .then((data) => Array.isArray(data) && setLessons(data))
            .finally(() => setLoading(false));
    }, [code]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (lessons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-100 bg-white py-16 text-center shadow-sm">
                <div className="rounded-full bg-slate-100 p-4">
                    <GraduationCap className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-black text-slate-600">ยังไม่มีบทเรียน</p>
                <p className="text-sm text-slate-400">ครูยังไม่ได้มอบหมายบทเรียนให้ห้องนี้</p>
            </div>
        );
    }

    const completedCount = lessons.filter((l) => l.completions.length > 0).length;

    return (
        <div className="space-y-4">
            {/* Progress summary */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <GraduationCap className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <p className="font-black text-slate-800">ความคืบหน้า</p>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
                        />
                    </div>
                </div>
                <p className="shrink-0 text-sm font-black text-slate-600">
                    {completedCount}/{lessons.length}
                </p>
            </div>

            {/* Lesson cards */}
            <div className="space-y-3">
                {lessons.map((item, index) => {
                    const completion = item.completions[0] ?? null;
                    const isCompleted = completion !== null;
                    const minutes = item.lesson.content?.estimatedMinutes;

                    return (
                        <Link
                            key={item.id}
                            href={`/student/${code}/lessons/${item.lesson.id}`}
                            className={cn(
                                "flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
                                isCompleted
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : "border-slate-100 hover:border-emerald-200"
                            )}
                        >
                            {/* Number / check */}
                            <div
                                className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                                    isCompleted
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-100 text-slate-500"
                                )}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                                <p className={cn("font-black truncate", isCompleted ? "text-emerald-800" : "text-slate-800")}>
                                    {item.lesson.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                    {item.lesson.subject && <span>📚 {item.lesson.subject}</span>}
                                    {item.lesson.gradeLevel && <span>🎓 {item.lesson.gradeLevel}</span>}
                                    {minutes && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {minutes} นาที
                                        </span>
                                    )}
                                    {isCompleted && completion.quizScore !== null && (
                                        <span className="flex items-center gap-1 font-bold text-emerald-600">
                                            <Star className="h-3 w-3 fill-current" />
                                            Quiz: {completion.quizScore}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action */}
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <span className="flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        อ่านอีกครั้ง
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-white">
                                        เริ่มเรียน
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
