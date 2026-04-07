"use client";

import { useState } from "react";
import { StudentAvatar } from "./student-avatar";
import { AddStudentDialog } from "./add-student-dialog";
import { PointMenu } from "./point-menu";
import { TimerWidget } from "./toolkit/timer-widget";
import { RandomPicker } from "./toolkit/random-picker";
import { GroupMaker } from "./toolkit/group-maker";
import { ClassroomTable } from "./classroom-table";
import { AddAssignmentDialog } from "./add-assignment-dialog";
import { StudentManagerDialog } from "./student-manager-dialog";
import { StudentHistoryModal } from "./student-history-modal";
import { ClassroomSettingsDialog } from "./classroom-settings-dialog";
import { ClassroomDashboardToolbar } from "./classroom-dashboard-toolbar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import useSound from "use-sound";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { sumAcademicTotal } from "@/lib/academic-score";
import { NegamonClassroomOverview } from "@/components/negamon/negamon-classroom-overview";
import { NegamonSettingsDialog } from "@/components/negamon/negamon-settings";
import {
    ClassroomAttendanceBanner,
    ClassroomSelectionBanner,
} from "./classroom-dashboard-banners";
import { useClassroomDashboardState } from "./use-classroom-dashboard-state";
import { useClassroomAttendanceFlow } from "./use-classroom-attendance-flow";
import { useClassroomDashboardUiState } from "./use-classroom-dashboard-ui-state";
import { useClassroomPointsFlow } from "./use-classroom-points-flow";
import { useClassroomSelectionFlow } from "./use-classroom-selection-flow";
import type { AssignmentWithChecklist } from "./classroom-table";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";

interface ClassroomDashboardProps {
    classroom: ClassroomDashboardViewModel;
    /** When set (e.g. from `?focus=assignments`), open table view for assignment columns. */
    initialClassFocus?: "assignments" | null;
    /** When set (e.g. from `?highlightAssignmentId=`), scroll/highlight that assignment column. */
    highlightAssignmentId?: string | null;
}

export function ClassroomDashboard({
    classroom: initialClassroom,
    initialClassFocus = null,
    highlightAssignmentId = null,
}: ClassroomDashboardProps) {
    const { t } = useLanguage();
    const [selectedStudent, setSelectedStudent] = useState<ClassroomDashboardViewModel["students"][number] | null>(null);
    const { toast } = useToast();
    const { socket, isConnected } = useSocket();
    const {
        classroom,
        setClassroom,
        applyUpdatedStudentPoints,
        updateAssignments,
        updateStudents,
        appendStudents,
        updateSkills,
        updateClassroomBasics,
        resetLocalBehaviorPoints,
    } = useClassroomDashboardState(initialClassroom);
    const {
        menuOpen,
        setMenuOpen,
        loading,
        setLoading,
        viewMode,
        setViewMode,
        showTimer,
        setShowTimer,
        showRandomPicker,
        setShowRandomPicker,
        showGroupMaker,
        setShowGroupMaker,
        showResetConfirm,
        setShowResetConfirm,
        showAddAssignment,
        setShowAddAssignment,
        showStudentManager,
        setShowStudentManager,
        showSettings,
        setShowSettings,
        historyStudentId,
        setHistoryStudentId,
        mobileToolbarOpen,
        setMobileToolbarOpen,
        showNegamonSettings,
        setShowNegamonSettings,
    } = useClassroomDashboardUiState({
        initialViewMode: initialClassFocus === "assignments" ? "table" : "grid",
    });
    const {
        isAttendanceMode,
        setIsAttendanceMode,
        hasChanges,
        enterAttendanceMode,
        cycleStudentAttendance,
        restoreAttendanceSnapshot,
        exitAttendanceMode,
        saveAttendance,
    } = useClassroomAttendanceFlow({
        classroomId: classroom.id,
        students: classroom.students,
        setClassroom,
        toast,
        t,
    }) as unknown as {
        isAttendanceMode: boolean;
        setIsAttendanceMode: React.Dispatch<React.SetStateAction<boolean>>;
        hasChanges: boolean;
        enterAttendanceMode: () => void;
        cycleStudentAttendance: (studentId: string) => void;
        restoreAttendanceSnapshot: () => void;
        exitAttendanceMode: () => void;
        saveAttendance: () => Promise<boolean>;
    };
    const {
        isSelectMultiple,
        setIsSelectMultiple,
        selectedStudentIds,
        setSelectedStudentIds,
        groupFilter,
        setGroupFilter,
        savedGroups,
        setSavedGroups,
        visibleStudentIds,
        toggleStudentSelection,
        clearSelectionMode,
    } = useClassroomSelectionFlow({
        classroomId: classroom.id,
        studentIds: classroom.students.map((student) => student.id),
    });

    // Sound Effects
    const [playDing] = useSound("/sounds/ding.mp3");
    const [playThud] = useSound("/sounds/thud.mp3");
    const { awardPoints, resetPoints } = useClassroomPointsFlow({
        classroomId: classroom.id,
        selectedStudent: selectedStudent as never,
        selectedStudentIds,
        isSelectMultiple,
        socket,
        isConnected,
        playDing,
        playThud,
        setClassroom,
        applyUpdatedStudentPoints,
        toast,
        t,
    });

    const handleStudentClick = (student: ClassroomDashboardViewModel["students"][number]) => {
        if (isAttendanceMode) {
            cycleStudentAttendance(student.id);
        } else if (isSelectMultiple) {
            toggleStudentSelection(student.id);
        } else {
            setSelectedStudent(student);
            setMenuOpen(true);
        }
    };

    const handleSaveAttendance = async () => {
        setLoading(true);
        try {
            const ok = await saveAttendance();
            if (ok) {
                exitAttendanceMode();
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const handleResetPoints = async () => {
        setLoading(true);
        try {
            await resetPoints();
        } catch {
        } finally {
            setLoading(false);
            setShowResetConfirm(false);
        }
    };

    const handleAwardPoint = async (skillId: string, weight: number) => {
        if (!selectedStudent && selectedStudentIds.length === 0) return;
        setLoading(true);

        setMenuOpen(false);
        try {
            await awardPoints(skillId, weight);
        } finally {
            setLoading(false);
            if (!isSelectMultiple) {
                setSelectedStudent(null);
            } else {
                setIsSelectMultiple(false);
                setSelectedStudentIds([]);
            }
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 relative">
            {/* Toolbar */}
            {!isAttendanceMode && (
                <ClassroomDashboardToolbar
                    t={t}
                    classroom={classroom}
                    isConnected={isConnected}
                    viewMode={viewMode}
                    mobileToolbarOpen={mobileToolbarOpen}
                    isSelectMultiple={isSelectMultiple}
                    selectedStudentIds={selectedStudentIds}
                    onToggleMobileToolbar={() => setMobileToolbarOpen((open) => !open)}
                    onOpenAddAssignment={() => setShowAddAssignment(true)}
                    onSelectViewMode={(mode) => {
                        setViewMode(mode);
                        exitAttendanceMode();
                        clearSelectionMode();
                    }}
                    onOpenTimer={() => setShowTimer(true)}
                    onOpenRandomPicker={() => setShowRandomPicker(true)}
                    onOpenGroupMaker={() => setShowGroupMaker(true)}
                    onStudentsAdded={appendStudents as never}
                    onOpenStudentManager={() => setShowStudentManager(true)}
                    onRankSettingsSaved={updateClassroomBasics as never}
                    onOpenNegamonSettings={() => setShowNegamonSettings(true)}
                    onEnterAttendanceMode={() => {
                        enterAttendanceMode();
                        setIsAttendanceMode(true);
                        setViewMode("grid");
                    }}
                    onToggleSelectMultiple={() => setIsSelectMultiple((value) => !value)}
                    onOpenSettings={() => setShowSettings(true)}
                />
            )}

            {isAttendanceMode && (
                <ClassroomAttendanceBanner
                    theme={classroom.theme || ""}
                    hasChanges={hasChanges}
                    loading={loading}
                    onCancel={restoreAttendanceSnapshot}
                    onSave={handleSaveAttendance}
                />
            )}

            {isSelectMultiple && !isAttendanceMode && (
                <ClassroomSelectionBanner
                    theme={classroom.theme || ""}
                    selectedStudentIds={selectedStudentIds}
                    savedGroups={savedGroups}
                    groupFilter={groupFilter}
                    loading={loading}
                    visibleStudentIds={visibleStudentIds}
                    onSelectAll={() => setSelectedStudentIds(visibleStudentIds)}
                    onClearSelection={() => setSelectedStudentIds([])}
                    onGroupFilterChange={(value) => {
                        setGroupFilter(value);
                        setSelectedStudentIds([]);
                    }}
                    onCancel={clearSelectionMode}
                    onOpenFeedback={() => {
                        if (selectedStudentIds.length === 0) {
                            toast({
                                title: t("error"),
                                description: t("toastSelectAtLeastOneStudent"),
                                variant: "destructive",
                            });
                            return;
                        }
                        setMenuOpen(true);
                    }}
                />
            )}

            {/* Grid Area */}
            {viewMode === "grid" ? (
                <div className={`min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 transition-all sm:p-6 ${isAttendanceMode ? "border-indigo-300 bg-indigo-50/30" : ""}`}>
                    {classroom.students.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-medium text-slate-600">{t("emptyClassTitle")}</h3>
                        <p className="mb-6">{t("emptyClassDesc")}</p>
                        <AddStudentDialog
                            classId={classroom.id}
                            theme={classroom.theme || ''}
                            onStudentAdded={(students) => appendStudents(students as never)}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:gap-5 md:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] md:gap-6">
                        {classroom.students.filter((s) => !isSelectMultiple || groupFilter === "all" || visibleStudentIds.includes(s.id)).map((student) => (
                            <StudentAvatar
                                key={student.id}
                                {...student}
                                avatarSeed={student.avatar || student.id}
                                onClick={() => handleStudentClick(student)}
                                onContextMenu={(e) => { e.preventDefault(); setHistoryStudentId(student.id); }}
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
            ) : viewMode === "negamon" ? (
                <div className="min-h-0 flex-1 w-full animate-in slide-in-from-bottom-2 rounded-xl border border-dashed border-violet-100 bg-violet-50/20 p-4 sm:p-6">
                    <NegamonClassroomOverview
                        classroomId={classroom.id}
                        students={classroom.students as never}
                        levelConfig={classroom.levelConfig as LevelConfigInput}
                        gamifiedSettings={classroom.gamifiedSettings}
                        onOpenSettings={() => setShowNegamonSettings(true)}
                    />
                </div>
            ) : (
                <div className="flex-1 min-h-0 w-full animate-in slide-in-from-bottom-2">
                    <ClassroomTable 
                        classId={classroom.id}
                        students={classroom.students}
                        assignments={classroom.assignments as AssignmentWithChecklist[]}
                        levelConfig={classroom.levelConfig as LevelConfigInput}
                        isAttendanceMode={isAttendanceMode}
                        onStudentClick={handleStudentClick as never}
                        highlightAssignmentId={highlightAssignmentId}
                    />
                </div>
            )}

            <PointMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                studentName={isSelectMultiple ? t("selectedCount", { count: selectedStudentIds.length }) : (selectedStudent?.name || "")}
                skills={classroom.skills}
                onSelectSkill={handleAwardPoint}
                loading={loading}
                classId={classroom.id}
                onSkillsChanged={(skills) => updateSkills(skills as never)}
                theme={classroom.theme || ""}
            />

            {/* Confirmation Dialogs */}
            <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("resetPoints")}</DialogTitle>
                        <DialogDescription className="py-3 text-base text-slate-600">
                            {t("resetPointsConfirm")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowResetConfirm(false)} disabled={loading}>
                            {t("cancel")}
                        </Button>
                        <Button variant="destructive" onClick={handleResetPoints} disabled={loading} className="bg-red-600 hover:bg-red-700 shadow-sm">
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
                onAdded={updateAssignments}
                assignments={classroom.assignments}
            />

            <StudentManagerDialog
                classId={classroom.id}
                theme={classroom.theme || ''}
                open={showStudentManager}
                onOpenChange={setShowStudentManager}
                onChanged={(students) => updateStudents(students as never)}
                students={classroom.students as never}
            />

            {/* Widgets */}
            {showTimer && <TimerWidget onClose={() => setShowTimer(false)} />}
            {showRandomPicker && (
                <RandomPicker
                    students={classroom.students as never}
                    theme={classroom.theme || ''}
                    levelConfig={classroom.levelConfig}
                    onClose={() => setShowRandomPicker(false)}
                />
            )}
            {showGroupMaker && (
                <GroupMaker
                    students={classroom.students as never}
                    skills={classroom.skills}
                    theme={classroom.theme || ''}
                    levelConfig={classroom.levelConfig}
                    onSavedGroupsChange={setSavedGroups}
                    onClose={() => setShowGroupMaker(false)}
                />
            )}

            <StudentHistoryModal
                classId={classroom.id}
                studentId={historyStudentId}
                open={!!historyStudentId}
                onOpenChange={(o) => !o && setHistoryStudentId(null)}
                theme={classroom.theme || ''}
            />

            <ClassroomSettingsDialog
                classroom={classroom}
                open={showSettings}
                onOpenChange={setShowSettings}
                onSaved={updateClassroomBasics as never}
                onPointsReset={resetLocalBehaviorPoints}
            />

            <NegamonSettingsDialog
                open={showNegamonSettings}
                onOpenChange={setShowNegamonSettings}
                classroomId={classroom.id}
                students={classroom.students.map((s) => ({ id: s.id, name: s.name }))}
                currentSettings={getNegamonSettings(classroom.gamifiedSettings)}
                existingGamifiedSettings={
                    classroom.gamifiedSettings &&
                    typeof classroom.gamifiedSettings === "object" &&
                    !Array.isArray(classroom.gamifiedSettings)
                        ? (classroom.gamifiedSettings as Record<string, unknown>)
                        : null
                }
                onSaved={(settings, gamifiedSettings) => {
                    setClassroom((prev) => ({
                        ...prev,
                        gamifiedSettings: (
                            gamifiedSettings ?? {
                                ...(prev.gamifiedSettings &&
                                typeof prev.gamifiedSettings === "object" &&
                                !Array.isArray(prev.gamifiedSettings)
                                    ? (prev.gamifiedSettings as Record<string, unknown>)
                                    : {}),
                                negamon: settings,
                            }
                        ) as ClassroomDashboardViewModel["gamifiedSettings"],
                    }));
                }}
            />

        </div>
    );
}

