"use client";

import { Button } from "@/components/ui/button";
import { MonsterCard } from "@/components/negamon/monster-card";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import type {
    ClassroomRecord,
    DashboardStudent,
    StudentDashboardTranslateFn,
} from "./StudentDashboardClient";

interface StudentDashboardMonsterTabProps {
    t: StudentDashboardTranslateFn;
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
    questGold?: number;
    onOpenStarterSelection: () => void;
}

export function StudentDashboardMonsterTab({
    t,
    classroom,
    student,
    levelConfigResolved,
    negamonSettings,
    studentMonsterState,
    questGold,
    onOpenStarterSelection,
}: StudentDashboardMonsterTabProps) {
    return (
        <div className="rounded-[2rem] border-4 border-emerald-200 bg-gradient-to-b from-emerald-50 to-teal-50 p-5 shadow-[0_6px_0_0_rgba(16,185,129,0.25)]">
            <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">🐣</span>
                <h3 className="text-base font-black text-emerald-900">
                    {t("tabStudentMonster")}
                </h3>
            </div>
            {negamonSettings?.enabled ? (
                studentMonsterState ? (
                    <MonsterCard
                        studentId={student.id}
                        behaviorPoints={student.behaviorPoints}
                        levelConfig={levelConfigResolved}
                        gamifiedSettings={classroom.gamifiedSettings}
                        loginCode={student.loginCode}
                        gold={questGold ?? student.gold}
                        negamonSkills={student.negamonSkills}
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
