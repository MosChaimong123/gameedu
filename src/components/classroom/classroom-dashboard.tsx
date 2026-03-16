"use client";

import { useState, useEffect } from "react";
import { Classroom, Student, Skill, Assignment, AssignmentSubmission } from "@prisma/client";
import { StudentAvatar } from "./student-avatar";
import { AddStudentDialog } from "./add-student-dialog";
import { StudentLoginsDialog } from "./student-logins-dialog";
import { PointMenu } from "./point-menu";
import { TimerWidget } from "./toolkit/timer-widget";
import { RandomPicker } from "./toolkit/random-picker";
import { GroupMaker } from "./toolkit/group-maker";
import { ClassroomTable } from "./classroom-table";
import { ClassroomSettingsDialog } from "./classroom-settings-dialog";
import { AddAssignmentDialog } from "./add-assignment-dialog";
import { StudentManagerDialog } from "./student-manager-dialog";
import { StudentHistoryModal } from "./student-history-modal";
import { SummonBossDialog } from "./summon-boss-dialog";
import { CustomAchievementManagerButton } from "./CustomAchievementManagerButton";
import { EventManagerButton } from "./EventManagerButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Users, Timer, Shuffle, Settings, LayoutGrid, TableProperties, Plus, UserCog, History } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import useSound from "use-sound";

interface ClassroomDashboardProps {
    classroom: Classroom & {
        students: (Student & { submissions: AssignmentSubmission[] })[];
        skills: Skill[];
        assignments: Assignment[];
    };
}

export function ClassroomDashboard({ classroom: initialClassroom }: ClassroomDashboardProps) {
    const { t } = useLanguage();
    const [classroom, setClassroom] = useState(initialClassroom);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Attendance State
    const [isAttendanceMode, setIsAttendanceMode] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Multi-Select State
    const [isSelectMultiple, setIsSelectMultiple] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    // Toolkit State
    const [showTimer, setShowTimer] = useState(false);
    const [showRandomPicker, setShowRandomPicker] = useState(false);
    const [showGroupMaker, setShowGroupMaker] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showAddAssignment, setShowAddAssignment] = useState(false);
    const [showStudentManager, setShowStudentManager] = useState(false);
    const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

    const { toast } = useToast();
    const { socket, isConnected } = useSocket();

    // Sound Effects
    const [playDing] = useSound("/sounds/ding.mp3");
    const [playThud] = useSound("/sounds/thud.mp3");

    // Join Classroom Room
    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit("join-classroom", classroom.id);

        const handleUpdate = (payload: { type: string, data: any }) => {
            if (payload.type === "POINT_UPDATE") {
                const { studentId, points } = payload.data;

                playDing();

                setClassroom(prev => ({
                    ...prev,
                    students: prev.students.map(s =>
                        s.id === studentId ? { ...s, points } : s
                    )
                }));
            } else if (payload.type === "BOSS_UPDATE") {
                const { boss } = payload.data;
                setClassroom(prev => ({
                    ...prev,
                    gamifiedSettings: {
                        ...(prev.gamifiedSettings as any || {}),
                        boss
                    }
                }));
            }
        };

        socket.on("classroom-event", handleUpdate);

        return () => {
            socket.emit("leave-classroom", classroom.id);
            socket.off("classroom-event", handleUpdate);
        };
    }, [socket, isConnected, classroom.id, playDing]);

    const handleStudentClick = (student: Student) => {
        if (isAttendanceMode) {
            // Cycle Attendance Status
            const statuses = ["PRESENT", "ABSENT", "LATE", "LEFT_EARLY"];
            const currentIndex = statuses.indexOf(student.attendance || "PRESENT");
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];

            setClassroom(prev => ({
                ...prev,
                students: prev.students.map(s =>
                    s.id === student.id ? { ...s, attendance: nextStatus } : s
                )
            }));
            setHasChanges(true);
        } else if (isSelectMultiple) {
            setSelectedStudentIds(prev => 
                prev.includes(student.id) 
                    ? prev.filter(id => id !== student.id)
                    : [...prev, student.id]
            );
        } else {
            setSelectedStudent(student);
            setMenuOpen(true);
        }
    };

    const saveAttendance = async () => {
        setLoading(true);
        try {
            // Filter only changed students? For simplicity, sending all or mapped changes.
            // Let's create a payload of all students' current status to be safe/easy
            const updates = classroom.students.map(s => ({
                studentId: s.id,
                status: s.attendance || "PRESENT"
            }));

            await fetch(`/api/classrooms/${classroom.id}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates })
            });

            toast({ title: "Attendance Saved", description: "Records updated successfully." });
            setIsAttendanceMode(false);
            setHasChanges(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to save attendance.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}`);
            if (res.ok) {
                const data = await res.json();
                setClassroom(data);
            }
        } catch (error) {
            console.error("Failed to refresh data", error);
        }
    };

    const handleResetPoints = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/points/reset`, {
                method: "POST"
            });

            if (!res.ok) throw new Error("Failed to reset points");

            // Optimistic fast update
            setClassroom(prev => ({
                ...prev,
                students: prev.students.map(s => ({ ...s, points: 0, submissions: [] }))
            }));
            
            toast({ title: "Success", description: "All points have been reset to 0." });
        } catch (error) {
            toast({ title: t("error") || "Error", description: "Failed to reset points.", variant: "destructive" });
        } finally {
            setLoading(false);
            setShowResetConfirm(false);
        }
    };

    const handleAwardPoint = async (skillId: string, weight: number) => {
        if (!selectedStudent && selectedStudentIds.length === 0) return;
        setLoading(true);

        const targetStudentIds = isSelectMultiple ? selectedStudentIds : (selectedStudent ? [selectedStudent.id] : []);

        // Optimistic Update
        setClassroom(prev => ({
            ...prev,
            students: prev.students.map(s =>
                targetStudentIds.includes(s.id) ? { ...s, points: s.points + weight } : s
            )
        }));

        setMenuOpen(false);
        if (weight > 0) playDing();
        else playThud();

        try {
            if (isSelectMultiple) {
                const res = await fetch(`/api/classrooms/${classroom.id}/points/batch`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentIds: targetStudentIds,
                        skillId,
                        weight
                    })
                });

                if (!res.ok) throw new Error("Failed to award points in batch");

                targetStudentIds.forEach(id => {
                    const student = classroom.students.find(s => s.id === id);
                    if (student) {
                         socket?.emit("classroom-update", {
                            classId: classroom.id,
                            type: "POINT_UPDATE",
                            data: { studentId: id, points: student.points + weight, skillId }
                        });
                    }
                });
            } else {
                const res = await fetch(`/api/classrooms/${classroom.id}/points`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentId: selectedStudent?.id,
                        skillId,
                        weight
                    })
                });

                if (!res.ok) throw new Error("Failed to award point");

                socket?.emit("classroom-update", {
                    classId: classroom.id,
                    type: "POINT_UPDATE",
                    data: {
                        studentId: selectedStudent?.id,
                        points: (selectedStudent?.points || 0) + weight,
                        skillId
                    }
                });
            }

        } catch (error) {
            // Revert
            setClassroom(prev => ({
                ...prev,
                students: prev.students.map(s =>
                    targetStudentIds.includes(s.id) ? { ...s, points: s.points - weight } : s
                )
            }));
            toast({
                title: "Error",
                description: "Failed to award points.",
                variant: "destructive"
            });
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

    const handleTablePointUpdate = (studentId: string, diff: number) => {
        setClassroom(prev => ({
            ...prev,
            students: prev.students.map(s =>
                s.id === studentId ? { ...s, points: s.points + diff } : s
            )
        }));
    };

    return (
        <div className="flex flex-col h-full space-y-6 relative">
            {/* Toolbar */}
            {!isAttendanceMode && (
                <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden mb-6 flex flex-col md:flex-row">
                    
                    {/* SCROLLABLE WRAPPER FOR MOBILE */}
                    <div className="flex w-full overflow-x-auto overflow-y-hidden scrollbar-hide divide-x divide-slate-700/50 flex-nowrap">

                        {/* ══ GROUP 1: Class Info ══ */}
                        <div className="flex items-center gap-4 px-5 py-4 min-w-max bg-black/10 shrink-0">
                            <div className="w-14 h-14 bg-white/20 p-2 md:p-2.5 rounded-xl border border-white/30 backdrop-blur-sm shadow-inner shrink-0 flex items-center justify-center text-2xl overflow-hidden">
                                {classroom.emoji?.startsWith('data:image') || classroom.emoji?.startsWith('http') ? (
                                    <img src={classroom.emoji} alt="Class Icon" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{classroom.emoji || classroom.image || "🛡️"}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">ห้องเรียน</p>
                                <p className="text-xl font-bold leading-tight drop-shadow-sm">{classroom.name}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Users className="w-3.5 h-3.5 text-white/70" />
                                    <span className="text-sm text-white/80 font-medium">{classroom.students.length} คน</span>
                                    <div className={`w-2 h-2 rounded-full ml-1 ${isConnected ? "bg-green-400" : "bg-red-400"}`} title={isConnected ? "Connected" : "Disconnected"} />
                                </div>
                            </div>
                            {/* View toggle inline with class info */}
                            <div className="flex bg-white/15 p-1 rounded-xl mx-2 xl:mx-4 shadow-inner gap-1 shrink-0">
                                <Button
                                    size="sm"
                                    className={`h-8 px-3 rounded-lg text-sm font-bold transition-all ${viewMode === "grid" ? "bg-white text-indigo-700 shadow-md" : "text-white/80 hover:bg-white/20"}`}
                                    onClick={() => { setViewMode("grid"); setIsAttendanceMode(false); setIsSelectMultiple(false); setSelectedStudentIds([]); }}
                                >
                                    <LayoutGrid className="w-4 h-4 md:mr-1" />
                                    <span className="hidden md:inline">{t("grid")}</span>
                                </Button>
                                <Button
                                    size="sm"
                                    className={`h-8 px-3 rounded-lg text-sm font-bold transition-all ${viewMode === "table" ? "bg-white text-indigo-700 shadow-md" : "text-white/80 hover:bg-white/20"}`}
                                    onClick={() => { setViewMode("table"); setIsAttendanceMode(false); setIsSelectMultiple(false); setSelectedStudentIds([]); }}
                                >
                                    <TableProperties className="w-4 h-4 md:mr-1" />
                                    <span className="hidden md:inline">{t("table")}</span>
                                </Button>
                                {viewMode === "table" && (
                                    <Button
                                        size="sm"
                                        className="h-8 px-3 rounded-lg text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md"
                                        onClick={() => setShowAddAssignment(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        <span className="hidden md:inline">จัดการภารกิจ</span>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* ══ GROUP 2: Toolkit ══ */}
                        <div className="flex flex-col justify-center px-5 py-3 bg-black/5 shrink-0 min-w-max">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">🛠 เครื่องมือ</p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm"
                                    onClick={() => setShowTimer(true)}
                                >
                                    <Timer className="w-4 h-4 mr-1.5 text-orange-300" />
                                    {t("timer")}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm"
                                    onClick={() => setShowRandomPicker(true)}
                                >
                                    <Shuffle className="w-4 h-4 mr-1.5 text-green-300" />
                                    {t("random")}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm"
                                    onClick={() => setShowGroupMaker(true)}
                                >
                                    <Users className="w-4 h-4 mr-1.5 text-blue-300" />
                                    {t("groups")}
                                </Button>
                            </div>
                        </div>

                        {/* ══ GROUP 3: Student Management ══ */}
                        <div className="flex flex-col justify-center px-5 py-3 bg-black/10 shrink-0 min-w-max">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">👤 จัดการนักเรียน</p>
                            <div className="flex items-center gap-2">
                                <ClassroomSettingsDialog classroom={classroom} />
                                <AddStudentDialog
                                    classId={classroom.id}
                                    theme={classroom.theme || ''}
                                    onStudentAdded={refreshData}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm"
                                    onClick={() => setShowStudentManager(true)}
                                >
                                    <UserCog className="w-4 h-4 mr-1.5 text-indigo-300" />
                                    จัดการนักเรียน
                                </Button>
                                <div className="bg-white/15 hover:bg-white/25 rounded-lg transition-colors shadow backdrop-blur-sm">
                                    <StudentLoginsDialog
                                        students={classroom.students}
                                        classId={classroom.id}
                                        theme={classroom.theme || ''}
                                    />
                                </div>
                                <SummonBossDialog 
                                    classId={classroom.id}
                                    currentBoss={(classroom.gamifiedSettings as any)?.boss}
                                    onBossSummoned={(boss) => setClassroom(prev => ({
                                        ...prev,
                                        gamifiedSettings: { ...((prev.gamifiedSettings as any) || {}), boss }
                                    }))}
                                    onBossDismissed={() => setClassroom(prev => ({
                                        ...prev,
                                        gamifiedSettings: { ...((prev.gamifiedSettings as any) || {}), boss: null }
                                    }))}
                                />
                                <CustomAchievementManagerButton
                                    classId={classroom.id}
                                    students={classroom.students.map(s => ({ id: s.id, name: s.name }))}
                                />
                                <EventManagerButton classId={classroom.id} />
                            </div>
                        </div>

                    </div>{/* End Scrollable Wrapper */}
                </div>
            )}

            {/* Attendance Header */}
            {isAttendanceMode && (
                <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        {t("attendanceMode")}
                    </h2>
                    <p className="text-indigo-100 text-sm">{t("attendanceDesc")}</p>
                </div>
            )}

            {/* Grid Area */}
            {viewMode === "grid" ? (
                <div className={`flex-1 bg-slate-50/50 p-6 rounded-xl border border-dashed border-slate-200 min-h-[500px] transition-all overflow-y-auto ${isAttendanceMode ? "border-indigo-300 bg-indigo-50/30" : ""}`}>
                    {classroom.students.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-medium text-slate-600">{t("emptyClassTitle")}</h3>
                        <p className="mb-6">{t("emptyClassDesc")}</p>
                        <AddStudentDialog classId={classroom.id} theme={classroom.theme || ''} onStudentAdded={refreshData} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {classroom.students.map((student) => (
                            <StudentAvatar
                                key={student.id}
                                {...student}
                                avatarSeed={student.avatar || student.id}
                                onClick={() => handleStudentClick(student)}
                                onContextMenu={(e) => { e.preventDefault(); setHistoryStudentId(student.id); }}
                                attendance={student.attendance || "PRESENT"}
                                levelConfig={classroom.levelConfig}
                                isSelected={selectedStudentIds.includes(student.id)}
                                academicPoints={
                                    student.submissions?.reduce((sum, sub) => sum + sub.score, 0) || 0
                                }
                                behaviorPoints={
                                    student.points
                                }
                                className={isAttendanceMode ? "hover:scale-100" : ""}
                            />
                        ))}
                    </div>
                )}
                </div>
            ) : (
                <div className="flex-1 min-h-[500px] w-full animate-in slide-in-from-bottom-2">
                    <ClassroomTable 
                        classId={classroom.id}
                        students={classroom.students}
                        assignments={classroom.assignments}
                        levelConfig={classroom.levelConfig}
                        onUpdatePoints={handleTablePointUpdate}
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
                onSkillsChanged={refreshData}
            />

            {/* Confirmation Dialogs */}
            <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("resetPoints")}</DialogTitle>
                        <DialogDescription className="py-3 text-base text-slate-600">
                            {t("resetPointsConfirm") || "Are you sure you want to reset all student points to 0? This cannot be undone."}
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
                open={showAddAssignment}
                onOpenChange={setShowAddAssignment}
                onAdded={refreshData}
                assignments={classroom.assignments}
            />

            <StudentManagerDialog
                classId={classroom.id}
                theme={classroom.theme || ''}
                open={showStudentManager}
                onOpenChange={setShowStudentManager}
                onChanged={refreshData}
                students={classroom.students}
            />

            {/* Widgets */}
            {showTimer && <TimerWidget onClose={() => setShowTimer(false)} />}
            {showRandomPicker && (
                <RandomPicker
                    students={classroom.students}
                    theme={classroom.theme || ''}
                    levelConfig={classroom.levelConfig}
                    onClose={() => setShowRandomPicker(false)}
                />
            )}
            {showGroupMaker && <GroupMaker students={classroom.students} skills={classroom.skills} theme={classroom.theme || ''} levelConfig={classroom.levelConfig} onClose={() => setShowGroupMaker(false)} />}

            <StudentHistoryModal
                classId={classroom.id}
                studentId={historyStudentId}
                open={!!historyStudentId}
                onOpenChange={(o) => !o && setHistoryStudentId(null)}
                theme={classroom.theme || ''}
            />

            {/* Bottom Action Bar */}
            {viewMode !== "table" && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg border border-slate-200 flex items-center gap-4 transition-all">
                    {isAttendanceMode ? (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    setIsAttendanceMode(false);
                                    setClassroom(initialClassroom); // Reset changes
                                }}
                            >
                                {t("cancel")}
                            </Button>
                            <div className="text-slate-400 text-sm font-medium">
                                {hasChanges ? t("unsavedChanges") || "Unsaved Changes" : t("ready") || "Ready"}
                            </div>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={saveAttendance}
                                disabled={loading}
                            >
                                {t("saveAttendance")}
                            </Button>
                        </>
                    ) : isSelectMultiple ? (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    setIsSelectMultiple(false);
                                    setSelectedStudentIds([]);
                                }}
                            >
                                {t("cancel")}
                            </Button>
                            <div className="text-slate-400 text-sm font-medium">
                                {t("selectedCount", { count: selectedStudentIds.length })}
                            </div>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                                onClick={() => {
                                    if (selectedStudentIds.length === 0) {
                                        toast({ title: t("error") || "Error", description: "Select students first", variant: "destructive" });
                                        return;
                                    }
                                    setMenuOpen(true);
                                }}
                                disabled={loading || selectedStudentIds.length === 0}
                            >
                                {t("giveFeedback")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsAttendanceMode(true)}>
                                {t("attendanceTitle")}
                            </Button>
                            <Separator orientation="vertical" className="h-4" />
                            <Button variant="ghost" size="sm" onClick={() => setIsSelectMultiple(true)}>
                                {t("selectMultiple")}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
