"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PointMenu } from "./point-menu";
import { AddAssignmentDialog } from "./add-assignment-dialog";
import { StudentManagerDialog } from "./student-manager-dialog";
import { TimerWidget } from "./toolkit/timer-widget";
import { RandomPicker } from "./toolkit/random-picker";
import { GroupMaker } from "./toolkit/group-maker";
import { StudentHistoryModal } from "./student-history-modal";
import { ClassroomSettingsDialog } from "./classroom-settings-dialog";
import { NegamonSettingsDialog } from "@/components/negamon/negamon-settings";
import { getNegamonSettings } from "@/lib/classroom-utils";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";
import type { DashboardTranslateFn } from "./classroom-dashboard.types";

interface ClassroomDashboardOverlaysProps {
    t: DashboardTranslateFn;
    classroom: ClassroomDashboardViewModel;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    loading: boolean;
    showResetConfirm: boolean;
    setShowResetConfirm: (open: boolean) => void;
    showAddAssignment: boolean;
    setShowAddAssignment: (open: boolean) => void;
    showStudentManager: boolean;
    setShowStudentManager: (open: boolean) => void;
    showTimer: boolean;
    setShowTimer: (open: boolean) => void;
    showRandomPicker: boolean;
    setShowRandomPicker: (open: boolean) => void;
    showGroupMaker: boolean;
    setShowGroupMaker: (open: boolean) => void;
    historyStudentId: string | null;
    setHistoryStudentId: (studentId: string | null) => void;
    showSettings: boolean;
    setShowSettings: (open: boolean) => void;
    showNegamonSettings: boolean;
    setShowNegamonSettings: (open: boolean) => void;
    selectedStudentName: string;
    onSelectSkill: (skillId: string, weight: number) => void;
    onSkillsChanged: (skills: ClassroomDashboardViewModel["skills"]) => void;
    onResetPoints: () => void;
    onAssignmentsAdded: (assignments: ClassroomDashboardViewModel["assignments"]) => void;
    onStudentsChanged: (students: ClassroomDashboardViewModel["students"]) => void;
    onSavedGroupsChange: (savedGroups: { id: string; name: string; studentIds: string[] }[]) => void;
    onSavedClassroom: (classroom: ClassroomDashboardViewModel) => void;
    onPointsReset: () => void;
    onSavedNegamonSettings: (
        settings: unknown,
        gamifiedSettings?: Record<string, unknown> | null
    ) => void;
}

export function ClassroomDashboardOverlays({
    t,
    classroom,
    menuOpen,
    setMenuOpen,
    loading,
    showResetConfirm,
    setShowResetConfirm,
    showAddAssignment,
    setShowAddAssignment,
    showStudentManager,
    setShowStudentManager,
    showTimer,
    setShowTimer,
    showRandomPicker,
    setShowRandomPicker,
    showGroupMaker,
    setShowGroupMaker,
    historyStudentId,
    setHistoryStudentId,
    showSettings,
    setShowSettings,
    showNegamonSettings,
    setShowNegamonSettings,
    selectedStudentName,
    onSelectSkill,
    onSkillsChanged,
    onResetPoints,
    onAssignmentsAdded,
    onStudentsChanged,
    onSavedGroupsChange,
    onSavedClassroom,
    onPointsReset,
    onSavedNegamonSettings,
}: ClassroomDashboardOverlaysProps) {
    return (
        <>
            <PointMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                studentName={selectedStudentName}
                skills={classroom.skills}
                onSelectSkill={onSelectSkill}
                loading={loading}
                classId={classroom.id}
                onSkillsChanged={(skills) => onSkillsChanged(skills as never)}
                theme={classroom.theme || ""}
            />

            <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("resetPoints")}</DialogTitle>
                        <DialogDescription className="py-3 text-base text-slate-600">
                            {t("resetPointsConfirm")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setShowResetConfirm(false)}
                            disabled={loading}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onResetPoints}
                            disabled={loading}
                            className="bg-red-600 shadow-sm hover:bg-red-700"
                        >
                            {t("resetPoints")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AddAssignmentDialog
                classId={classroom.id}
                classroomQuizReviewMode={classroom.quizReviewMode}
                open={showAddAssignment}
                onOpenChange={setShowAddAssignment}
                onAdded={onAssignmentsAdded}
                assignments={classroom.assignments}
            />

            <StudentManagerDialog
                classId={classroom.id}
                theme={classroom.theme || ""}
                open={showStudentManager}
                onOpenChange={setShowStudentManager}
                onChanged={(students) => onStudentsChanged(students as never)}
                students={classroom.students as never}
            />

            {showTimer && <TimerWidget onClose={() => setShowTimer(false)} />}
            {showRandomPicker && (
                <RandomPicker
                    students={classroom.students as never}
                    theme={classroom.theme || ""}
                    levelConfig={classroom.levelConfig}
                    onClose={() => setShowRandomPicker(false)}
                />
            )}
            {showGroupMaker && (
                <GroupMaker
                    students={classroom.students as never}
                    skills={classroom.skills}
                    theme={classroom.theme || ""}
                    levelConfig={classroom.levelConfig}
                    onSavedGroupsChange={onSavedGroupsChange}
                    onClose={() => setShowGroupMaker(false)}
                />
            )}

            <StudentHistoryModal
                classId={classroom.id}
                studentId={historyStudentId}
                open={!!historyStudentId}
                onOpenChange={(open) => !open && setHistoryStudentId(null)}
                theme={classroom.theme || ""}
            />

            <ClassroomSettingsDialog
                classroom={classroom}
                open={showSettings}
                onOpenChange={setShowSettings}
                onSaved={onSavedClassroom as never}
                onPointsReset={onPointsReset}
            />

            <NegamonSettingsDialog
                open={showNegamonSettings}
                onOpenChange={setShowNegamonSettings}
                classroomId={classroom.id}
                students={classroom.students.map((student) => ({
                    id: student.id,
                    name: student.name,
                }))}
                currentSettings={getNegamonSettings(classroom.gamifiedSettings)}
                existingGamifiedSettings={
                    classroom.gamifiedSettings &&
                    typeof classroom.gamifiedSettings === "object" &&
                    !Array.isArray(classroom.gamifiedSettings)
                        ? (classroom.gamifiedSettings as Record<string, unknown>)
                        : null
                }
                onSaved={onSavedNegamonSettings}
            />
        </>
    );
}
