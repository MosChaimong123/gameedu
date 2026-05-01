"use client";

import Link from "next/link";
import { Library, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonsterCard } from "@/components/negamon/monster-card";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import type {
    ClassroomRecord,
    DashboardStudent,
    StudentDashboardTranslateFn,
} from "@/lib/services/student-dashboard/student-dashboard.types";

interface StudentDashboardMonsterTabProps {
    t: StudentDashboardTranslateFn;
    /** รหัสใน URL แดชบอร์ด — ใช้ลิงก์ /student/[code]/negamon */
    code: string;
    classroom: ClassroomRecord;
    student: DashboardStudent;
    levelConfigResolved: LevelConfigInput;
    negamonSettings: {
        enabled?: boolean;
        allowStudentChoice?: boolean;
    } | null;
    studentMonsterState: {
        form: { icon: string; name: string };
        rankIndex: number;
    } | null;
    onOpenStarterSelection: () => void;
}

export function StudentDashboardMonsterTab({
    t,
    code,
    classroom,
    student,
    levelConfigResolved,
    negamonSettings,
    studentMonsterState,
    onOpenStarterSelection,
}: StudentDashboardMonsterTabProps) {
    return (
        <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-stone-100/95 to-stone-200/40 p-4 shadow-inner sm:p-5">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <span className="text-2xl" aria-hidden>
                    🐣
                </span>
                <h3 className="text-base font-black tracking-tight text-stone-800">
                    {t("tabStudentMonster")}
                </h3>
            </div>
            {negamonSettings?.enabled ? (
                <div className="mb-4 flex flex-wrap gap-2">
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-violet-200 bg-white font-bold text-violet-800 hover:bg-violet-50"
                    >
                        <Link href={`/student/${encodeURIComponent(code)}/negamon/codex`}>
                            <Library className="mr-1.5 h-3.5 w-3.5" />
                            {t("negamonInfoNavCodex")}
                        </Link>
                    </Button>
                    {studentMonsterState ? (
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-amber-200 bg-white font-bold text-amber-900 hover:bg-amber-50"
                        >
                            <Link href={`/student/${encodeURIComponent(code)}/negamon`}>
                                <User className="mr-1.5 h-3.5 w-3.5" />
                                {t("negamonInfoOpenFullProfile")}
                            </Link>
                        </Button>
                    ) : null}
                </div>
            ) : null}
            {negamonSettings?.enabled ? (
                studentMonsterState ? (
                    <MonsterCard
                        studentId={student.id}
                        behaviorPoints={student.behaviorPoints}
                        levelConfig={levelConfigResolved}
                        gamifiedSettings={classroom.gamifiedSettings}
                        equippedFrame={student.equippedFrame}
                    />
                ) : negamonSettings.allowStudentChoice ? (
                    <div className="flex flex-col items-center gap-4 py-10 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-emerald-200 bg-white text-4xl shadow-md">
                            🥚
                        </div>
                        <div>
                            <p className="text-lg font-black text-emerald-800">
                                {t("negamonCardTitle")}
                            </p>
                            <p className="mt-1 text-sm font-medium text-emerald-600">
                                {t("negamonPickBuddyLine")}
                            </p>
                        </div>
                        <Button
                            onClick={onOpenStarterSelection}
                            className="rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3 font-black text-white shadow-[0_5px_0_0_rgba(4,120,87,0.6)] hover:from-emerald-300 hover:to-emerald-500 active:translate-y-1 active:shadow-[0_2px_0_0_rgba(4,120,87,0.6)]"
                        >
                            {t("negamonChooseMonster")}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-slate-200 bg-white text-4xl shadow-md">
                            🔒
                        </div>
                        <p className="text-lg font-black text-slate-700">
                            {t("negamonCardTitle")}
                        </p>
                        <p className="text-sm font-medium text-slate-500">
                            {t("negamonWaitTeacherLine")}
                        </p>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-slate-200 bg-white text-4xl shadow-md">
                        💀
                    </div>
                    <p className="text-sm font-bold text-slate-500">
                        {t("negamonDisabledByTeacher")}
                    </p>
                </div>
            )}
        </div>
    );
}
