"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Clock,
    GraduationCap,
    Loader2,
    PlayCircle,
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

type LessonLearningStatus = "not_started" | "in_progress" | "completed";

interface StudentLessonsTabProps {
    code: string;
}

function getStatusMeta(status: LessonLearningStatus) {
    if (status === "completed") {
        return {
            label: "เรียนจบ",
            action: "อ่านอีกครั้ง",
            icon: CheckCircle2,
            badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
            progressClass: "bg-emerald-500",
            iconClass: "bg-emerald-500 text-white",
        };
    }
    if (status === "in_progress") {
        return {
            label: "กำลังเรียน",
            action: "เรียนต่อ",
            icon: Clock,
            badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
            progressClass: "bg-amber-400",
            iconClass: "bg-amber-100 text-amber-700",
        };
    }
    return {
        label: "ยังไม่เริ่ม",
        action: "เริ่มเรียน",
        icon: PlayCircle,
        badgeClass: "border-slate-200 bg-slate-50 text-slate-500",
        progressClass: "bg-slate-300",
        iconClass: "bg-slate-100 text-slate-500",
    };
}

export function StudentLessonsTab({ code }: StudentLessonsTabProps) {
    const [lessons, setLessons] = useState<AssignedLesson[]>([]);
    const [openedLessonIds, setOpenedLessonIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadOpenedLessons = useCallback(() => {
        setOpenedLessonIds(
            new Set(
                Object.keys(window.localStorage)
                    .filter((key) => key.startsWith(`lesson-progress:${code}:`))
                    .map((key) => key.replace(`lesson-progress:${code}:`, ""))
            )
        );
    }, [code]);

    const loadLessons = useCallback(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/student/${code}/lessons`)
            .then((response) => {
                if (!response.ok) throw new Error("โหลดบทเรียนไม่สำเร็จ");
                return response.json();
            })
            .then((data) => {
                if (Array.isArray(data)) setLessons(data);
                else throw new Error("ข้อมูลบทเรียนไม่ถูกต้อง");
            })
            .catch((nextError: Error) => setError(nextError.message))
            .finally(() => setLoading(false));
    }, [code]);

    useEffect(() => {
        let active = true;
        fetch(`/api/student/${code}/lessons`)
            .then((response) => {
                if (!response.ok) throw new Error("โหลดบทเรียนไม่สำเร็จ");
                return response.json();
            })
            .then((data) => {
                if (!active) return;
                if (Array.isArray(data)) setLessons(data);
                else throw new Error("ข้อมูลบทเรียนไม่ถูกต้อง");
            })
            .catch((nextError: Error) => {
                if (active) setError(nextError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [code]);

    useEffect(() => {
        window.setTimeout(loadOpenedLessons, 0);
        window.addEventListener("focus", loadOpenedLessons);
        return () => window.removeEventListener("focus", loadOpenedLessons);
    }, [loadOpenedLessons]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-red-100 bg-red-50 py-12 text-center shadow-sm">
                <p className="font-bold text-red-600">{error}</p>
                <button
                    type="button"
                    onClick={loadLessons}
                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-600"
                >
                    ลองอีกครั้ง
                </button>
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

    const completedCount = lessons.filter((lesson) => lesson.completions.length > 0).length;
    const inProgressCount = lessons.filter(
        (lesson) => lesson.completions.length === 0 && openedLessonIds.has(lesson.lesson.id)
    ).length;
    const totalMinutes = lessons.reduce((sum, item) => sum + (item.lesson.content?.estimatedMinutes ?? 0), 0);
    const courseProgress = Math.round((completedCount / lessons.length) * 100);

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800">คอร์สออนไลน์ของฉัน</p>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${courseProgress}%` }}
                            />
                        </div>
                    </div>
                    <p className="shrink-0 text-sm font-black text-slate-600">
                        {completedCount}/{lessons.length}
                    </p>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">กำลังเรียน {inProgressCount} บท</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">เรียนจบ {completedCount} บท</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">เวลาเรียนรวม {totalMinutes || "-"} นาที</div>
                </div>
            </div>

            <div className="space-y-3">
                {lessons.map((item, index) => {
                    const completion = item.completions[0] ?? null;
                    const status: LessonLearningStatus = completion
                        ? "completed"
                        : openedLessonIds.has(item.lesson.id)
                          ? "in_progress"
                          : "not_started";
                    const progressPercent = status === "completed" ? 100 : status === "in_progress" ? 50 : 0;
                    const minutes = item.lesson.content?.estimatedMinutes;
                    const statusMeta = getStatusMeta(status);
                    const StatusIcon = statusMeta.icon;

                    return (
                        <Link
                            key={item.id}
                            href={`/student/${code}/lessons/${item.lesson.id}`}
                            className={cn(
                                "block rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
                                status === "completed"
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : "border-slate-100 hover:border-emerald-200"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                                        status === "not_started" ? "bg-slate-100 text-slate-500" : statusMeta.iconClass
                                    )}
                                >
                                    {status === "not_started" ? index + 1 : <StatusIcon className="h-5 w-5" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className={cn("truncate font-black", status === "completed" ? "text-emerald-800" : "text-slate-800")}>
                                            {item.lesson.title}
                                        </p>
                                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black", statusMeta.badgeClass)}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusMeta.label}
                                        </span>
                                        {completion?.quizScore !== null && completion?.quizScore !== undefined ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">
                                                <Star className="h-3 w-3 fill-current" />
                                                Quiz {completion.quizScore}%
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                        {item.lesson.subject ? <span>{item.lesson.subject}</span> : null}
                                        {item.lesson.gradeLevel ? <span>{item.lesson.gradeLevel}</span> : null}
                                        {minutes ? (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {minutes} นาที
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500", statusMeta.progressClass)}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    <span
                                        className={cn(
                                            "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black",
                                            status === "completed"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : status === "in_progress"
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-slate-800 text-white"
                                        )}
                                    >
                                        {status === "completed" ? <BookOpen className="h-3.5 w-3.5" /> : null}
                                        {statusMeta.action}
                                        {status !== "completed" ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
