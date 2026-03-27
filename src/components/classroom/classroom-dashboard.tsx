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
import { AddAssignmentDialog } from "./add-assignment-dialog";
import { StudentManagerDialog } from "./student-manager-dialog";
import { StudentHistoryModal } from "./student-history-modal";
import { SummonBossDialog } from "./summon-boss-dialog";
import { CustomAchievementManagerButton } from "./CustomAchievementManagerButton";
import { EventManagerButton } from "./EventManagerButton";
import { ClassroomSettingsDialog } from "./classroom-settings-dialog";
import { ClassroomRankSettingsDialog } from "./classroom-rank-settings-dialog";
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
import { Users, Timer, Shuffle, Settings, LayoutGrid, TableProperties, Plus, UserCog, ClipboardCheck, CheckSquare } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import { normalizeBossesFromGamifiedSettings } from "@/lib/game/classroom-bosses";
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
    const [showSettings, setShowSettings] = useState(false);
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
            } else if (payload.type === "BOSS_HP_UPDATE") {
                const { bosses: evBosses, boss, instanceId, currentHp } = payload.data || {};
                setClassroom((prev) => {
                    const gs = { ...(prev.gamifiedSettings as Record<string, unknown>) || {} };
                    if (Array.isArray(evBosses)) {
                        return { ...prev, gamifiedSettings: { ...gs, bosses: evBosses } };
                    }
                    if (instanceId && boss) {
                        const list = normalizeBossesFromGamifiedSettings(gs);
                        const next = list.map((b) =>
                            b.instanceId === instanceId
                                ? { ...b, ...boss, currentHp: currentHp ?? (boss as { currentHp?: number }).currentHp }
                                : b
                        );
                        return { ...prev, gamifiedSettings: { ...gs, bosses: next } };
                    }
                    return prev;
                });
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
                <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden mb-6 flex flex-col">
                    
                    {/* Top Row: Class Info & View Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 bg-black/20 border-b border-slate-700/50">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 p-2 md:p-2.5 rounded-xl border border-white/30 backdrop-blur-sm shadow-inner shrink-0 flex items-center justify-center text-2xl overflow-hidden">
                                {classroom.emoji?.startsWith('data:image') || classroom.emoji?.startsWith('http') ? (
                                    <img src={classroom.emoji} alt="Class Icon" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{classroom.emoji || classroom.image || "🛡️"}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">ห้องเรียน</p>
                                <p className="text-xl font-bold leading-tight text-white drop-shadow-sm">{classroom.name}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Users className="w-3.5 h-3.5 text-white/70" />
                                    <span className="text-sm text-white/80 font-medium">{classroom.students.length} คน</span>
                                    <div className={`w-2 h-2 rounded-full ml-1 ${isConnected ? "bg-green-400" : "bg-red-400"}`} title={isConnected ? "Connected" : "Disconnected"} />
                                </div>
                            </div>
                        </div>

                        {/* View toggle directly in top row */}
                        <div className="flex items-center bg-white/10 p-1 rounded-xl shadow-inner gap-1 shrink-0">
                            <Button
                                size="sm"
                                className={`h-9 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === "grid" ? "bg-white text-indigo-700 shadow-md" : "text-white/80 hover:bg-white/20"}`}
                                onClick={() => { setViewMode("grid"); setIsAttendanceMode(false); setIsSelectMultiple(false); setSelectedStudentIds([]); }}
                            >
                                <LayoutGrid className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">{t("grid")}</span>
                            </Button>
                            <Button
                                size="sm"
                                className={`h-9 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === "table" ? "bg-white text-indigo-700 shadow-md" : "text-white/80 hover:bg-white/20"}`}
                                onClick={() => { setViewMode("table"); setIsAttendanceMode(false); setIsSelectMultiple(false); setSelectedStudentIds([]); }}
                            >
                                <TableProperties className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">{t("table")}</span>
                            </Button>
                            {viewMode === "table" && (
                                <Button
                                    size="sm"
                                    className="h-9 px-4 rounded-lg text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md ml-1"
                                    onClick={() => setShowAddAssignment(true)}
                                >
                                    <Plus className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">จัดการภารกิจ</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Wrap: Toolkits */}
                    <div className="flex flex-wrap w-full bg-black/5">
                        
                        {/* ══ GROUP 2: Toolkit ══ */}
                        <div className="flex flex-col justify-center px-5 py-4 border-r border-b border-slate-700/50 flex-grow sm:flex-grow-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">🛠 เครื่องมือ</p>
                            <div className="flex flex-wrap items-center gap-2">
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
                        <div className="flex flex-col justify-center px-5 py-4 border-r border-b border-slate-700/50 flex-grow sm:flex-grow-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">👤 นักเรียน</p>
                            <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                        </div>

                        {/* ══ GROUP 4: Gamification ══ */}
                        <div className="flex flex-col justify-center px-5 py-4 border-r border-b border-slate-700/50 flex-grow sm:flex-grow-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">🎮 Gamification</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <SummonBossDialog
                                    classId={classroom.id}
                                    gamifiedSettings={(classroom.gamifiedSettings as Record<string, unknown>) || {}}
                                    onBossesUpdated={(bosses) =>
                                        setClassroom((prev) => ({
                                            ...prev,
                                            gamifiedSettings: {
                                                ...((prev.gamifiedSettings as Record<string, unknown>) || {}),
                                                bosses,
                                            } as any,
                                        }))
                                    }
                                />
                                <ClassroomRankSettingsDialog classroom={classroom} />
                                <CustomAchievementManagerButton
                                    classId={classroom.id}
                                    students={classroom.students.map(s => ({ id: s.id, name: s.name }))}
                                />
                                <EventManagerButton classId={classroom.id} />
                            </div>
                        </div>

                        {/* ══ GROUP 5: Actions ══ */}
                        <div className="flex flex-col justify-center px-5 py-4 border-b border-slate-700/50 flex-grow sm:flex-grow-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">⚙️ Actions</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm"
                                    onClick={() => {
                                        setIsAttendanceMode(true);
                                        setViewMode("grid");
                                    }}
                                >
                                    <ClipboardCheck className="w-4 h-4 mr-1.5 text-emerald-300" />
                                    เช็คชื่อ
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className={`h-9 border-0 font-semibold shadow backdrop-blur-sm ${isSelectMultiple ? "bg-indigo-500 text-white hover:bg-indigo-400" : "bg-white/15 hover:bg-white/25 text-white"}`}
                                    onClick={() => setIsSelectMultiple(v => !v)}
                                >
                                    <CheckSquare className="w-4 h-4 mr-1.5" />
                                    เลือกหลายคน {isSelectMultiple && `(${selectedStudentIds.length})`}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm"
                                    onClick={() => setShowSettings(true)}
                                >
                                    <Settings className="w-4 h-4 mr-1.5 text-slate-300" />
                                    ตั้งค่า
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Header */}
            {isAttendanceMode && (
                <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top-2 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold italic tracking-tight uppercase">
                                {t("attendanceMode")}
                            </h2>
                            <p className="text-white/70 text-xs font-medium">
                                {t("attendanceDesc")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:block px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/10">
                            {hasChanges ? t("unsavedChanges") || "📝 มีการเปลี่ยนแปลง" : t("ready") || "✨ พร้อมบันทึก"}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                            onClick={() => {
                                setIsAttendanceMode(false);
                                setClassroom(classroom); // Initial version had a reset here, but we'll follow logic 
                                refreshData(); // Better refresh
                            }} 
                        >
                            {t("cancel")}
                        </Button>
                        <Button 
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border-0 font-black px-6"
                            onClick={saveAttendance}
                            disabled={loading}
                        >
                            {t("saveAttendance")}
                        </Button>
                    </div>
                </div>
            )}

            {/* Selection Header */}
            {isSelectMultiple && !isAttendanceMode && (
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top-2 mb-6 border-b-4 border-indigo-500">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500 rounded-lg shadow-lg">
                            <CheckSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black italic tracking-tight uppercase text-indigo-100">
                                {t("selectionMode") || "โหมดเลือกนักเรียน"}
                            </h2>
                            <p className="text-indigo-200/60 text-xs font-medium">
                                {t("selectedCount", { count: selectedStudentIds.length })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="bg-white/5 hover:bg-white/10 text-slate-300"
                            onClick={() => {
                                setIsSelectMultiple(false);
                                setSelectedStudentIds([]);
                            }} 
                        >
                            {t("cancel")}
                        </Button>
                        <Button 
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border-0 font-black px-6"
                            onClick={() => {
                                if (selectedStudentIds.length === 0) {
                                    toast({ title: t("error") || "Error", description: "Select students first", variant: "destructive" });
                                    return;
                                }
                                setMenuOpen(true);
                            }}
                            disabled={loading || selectedStudentIds.length === 0}
                        >
                            {t("giveFeedback") || "ให้แต้ม/สกิล"}
                        </Button>
                    </div>
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
                        isAttendanceMode={isAttendanceMode}
                        onStudentClick={handleStudentClick as any}
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

            <ClassroomSettingsDialog
                classroom={classroom}
                open={showSettings}
                onOpenChange={setShowSettings}
            />

        </div>
    );
}
