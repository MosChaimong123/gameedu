"use client";

import { Users } from "lucide-react";
import { AddStudentDialog } from "./add-student-dialog";
import { StudentAvatar } from "./student-avatar";
import { ClassroomTable } from "./classroom-table";
import { NegamonClassroomOverview } from "@/components/negamon/negamon-classroom-overview";
import { sumAcademicTotal } from "@/lib/academic-score";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import type { AssignmentWithChecklist } from "./classroom-table";
import type {
    ClassroomDashboardViewModel,
} from "@/lib/services/classroom-dashboard/get-classroom-dashboard";
import type { DashboardTranslateFn } from "./classroom-dashboard.types";

interface ClassroomDashboardContentProps {
    t: DashboardTranslateFn;
    classroom: ClassroomDashboardViewModel;
    viewMode: "grid" | "table" | "negamon";
    isAttendanceMode: boolean;
    isSelectMultiple: boolean;
    groupFilter: string;
    visibleStudentIds: string[];
    selectedStudentIds: string[];
    highlightAssignmentId?: string | null;
    onStudentClick: (student: ClassroomDashboardViewModel["students"][number]) => void;
    onHistoryStudent: (studentId: string) => void;
    onStudentsAdded: (students: ClassroomDashboardViewModel["students"]) => void;
    onOpenNegamonSettings: () => void;
}

export function ClassroomDashboardContent({
    t,
    classroom,
    viewMode,
    isAttendanceMode,
    isSelectMultiple,
    groupFilter,
    visibleStudentIds,
    selectedStudentIds,
    highlightAssignmentId,
    onStudentClick,
    onHistoryStudent,
    onStudentsAdded,
    onOpenNegamonSettings,
}: ClassroomDashboardContentProps) {
    if (viewMode === "grid") {
        return (
            <div
                className={`min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 transition-all sm:p-6 ${
                    isAttendanceMode ? "border-indigo-300 bg-indigo-50/30" : ""
                }`}
            >
                {classroom.students.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <Users className="mb-4 h-16 w-16 opacity-20" />
                        <h3 className="text-xl font-medium text-slate-600">{t("emptyClassTitle")}</h3>
                        <p className="mb-6">{t("emptyClassDesc")}</p>
                        <AddStudentDialog
                            classId={classroom.id}
                            theme={classroom.theme || ""}
                            onStudentAdded={(students) => onStudentsAdded(students as never)}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:gap-5 md:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] md:gap-6">
                        {classroom.students
                            .filter(
                                (student) =>
                                    !isSelectMultiple ||
                                    groupFilter === "all" ||
                                    visibleStudentIds.includes(student.id)
                            )
                            .map((student) => (
                                <StudentAvatar
                                    key={student.id}
                                    {...student}
                                    avatarSeed={student.avatar || student.id}
                                    onClick={() => onStudentClick(student)}
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        onHistoryStudent(student.id);
                                    }}
                                    attendance={student.attendance || "PRESENT"}
                                    levelConfig={classroom.levelConfig as LevelConfigInput}
                                    isSelected={selectedStudentIds.includes(student.id)}
                                    academicPoints={sumAcademicTotal(
                                        classroom.assignments,
                                        student.submissions ?? []
                                    )}
                                    behaviorPoints={student.behaviorPoints}
                                    className={isAttendanceMode ? "hover:scale-100" : ""}
                                />
                            ))}
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === "negamon") {
        return (
            <div className="min-h-0 flex-1 w-full animate-in slide-in-from-bottom-2 rounded-xl border border-dashed border-violet-100 bg-violet-50/20 p-4 sm:p-6">
                <NegamonClassroomOverview
                    classroomId={classroom.id}
                    students={classroom.students as never}
                    levelConfig={classroom.levelConfig as LevelConfigInput}
                    gamifiedSettings={classroom.gamifiedSettings}
                    onOpenSettings={onOpenNegamonSettings}
                />
            </div>
        );
    }

    return (
        <div className="min-h-0 w-full flex-1 animate-in slide-in-from-bottom-2">
            <ClassroomTable
                classId={classroom.id}
                students={classroom.students as never}
                assignments={classroom.assignments as AssignmentWithChecklist[]}
                levelConfig={classroom.levelConfig as LevelConfigInput}
                isAttendanceMode={isAttendanceMode}
                onStudentClick={onStudentClick}
                highlightAssignmentId={highlightAssignmentId}
            />
        </div>
    );
}
