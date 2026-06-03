"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ClassroomLessonAssignment = {
    id: string;
    lesson: {
        id: string;
        title: string;
        subject: string | null;
        gradeLevel: string | null;
        status: string;
        description: string | null;
    };
    completions: Array<{ studentId: string; quizScore: number | null; completedAt: string }>;
};

type ClassroomLessonsProgressTabProps = {
    classId: string;
    studentCount: number;
};

export function ClassroomLessonsProgressTab({ classId, studentCount }: ClassroomLessonsProgressTabProps) {
    const [assignments, setAssignments] = useState<ClassroomLessonAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        fetch(`/api/classrooms/${classId}/lessons`)
            .then(async (response) => {
                const data = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(data?.error?.message ?? "โหลดบทเรียนไม่สำเร็จ");
                }
                if (active && Array.isArray(data)) setAssignments(data);
            })
            .catch((err) => {
                if (active) setError(err instanceof Error ? err.message : "โหลดบทเรียนไม่สำเร็จ");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [classId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">บทเรียนในห้องนี้</h2>
                        <p className="text-sm font-bold text-slate-400">กดเข้าไปดู progress รายชื่อนักเรียนในแต่ละบทเรียน</p>
                    </div>
                    <Link href="/dashboard/lessons">
                        <Button variant="outline" className="rounded-xl font-bold">จัดการบทเรียนทั้งหมด</Button>
                    </Link>
                </div>
            </div>

            {assignments.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                    <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-black text-slate-700">ยังไม่มีบทเรียนที่ assign ให้ห้องนี้</p>
                    <p className="mt-1 text-sm text-slate-400">สร้างหรือ publish บทเรียน แล้ว assign จากหน้าแก้ไขบทเรียน</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {assignments.map((assignment) => {
                        const completedCount = assignment.completions.length;
                        const scored = assignment.completions.filter((completion) => completion.quizScore !== null);
                        const avgScore =
                            scored.length > 0
                                ? Math.round(
                                      scored.reduce((sum, completion) => sum + (completion.quizScore ?? 0), 0) / scored.length
                                  )
                                : null;
                        const percent = studentCount > 0 ? Math.round((completedCount / studentCount) * 100) : 0;

                        return (
                            <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <p className="truncate font-black text-slate-900">{assignment.lesson.title}</p>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                {assignment.lesson.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">
                                            {[assignment.lesson.subject, assignment.lesson.gradeLevel].filter(Boolean).join(" • ") || "ไม่ระบุวิชา"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="flex items-center gap-1 text-sm font-bold text-slate-600">
                                            <Users className="h-4 w-4" />
                                            {completedCount}/{studentCount} คน ({percent}%)
                                        </span>
                                        <span className="text-sm font-bold text-amber-600">
                                            Quiz เฉลี่ย {avgScore === null ? "-" : `${avgScore}%`}
                                        </span>
                                        <Link href={`/dashboard/lessons/${assignment.lesson.id}/edit`}>
                                            <Button size="sm" className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                                                ดู progress
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
