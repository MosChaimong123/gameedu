"use client";

import { useState, useEffect } from "react";
import { Classroom, Student, Skill } from "@prisma/client";
import { StudentAvatar } from "./student-avatar";
import { AddStudentDialog } from "./add-student-dialog";
import { StudentLoginsDialog } from "./student-logins-dialog";
import { PointMenu } from "./point-menu";
import { TimerWidget } from "./toolkit/timer-widget";
import { RandomPicker } from "./toolkit/random-picker";
import { GroupMaker } from "./toolkit/group-maker";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, Timer, Shuffle, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import useSound from "use-sound";

interface ClassroomDashboardProps {
    classroom: Classroom & {
        students: Student[];
        skills: Skill[];
    };
}

export function ClassroomDashboard({ classroom: initialClassroom }: ClassroomDashboardProps) {
    const [classroom, setClassroom] = useState(initialClassroom);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Attendance State
    const [isAttendanceMode, setIsAttendanceMode] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Toolkit State
    const [showTimer, setShowTimer] = useState(false);
    const [showRandomPicker, setShowRandomPicker] = useState(false);
    const [showGroupMaker, setShowGroupMaker] = useState(false);

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

    const handleAwardPoint = async (skillId: string, weight: number) => {
        if (!selectedStudent) return;
        setLoading(true);

        const oldPoints = selectedStudent.points;
        const newPoints = oldPoints + weight;

        // Optimistic Update
        setClassroom(prev => ({
            ...prev,
            students: prev.students.map(s =>
                s.id === selectedStudent.id ? { ...s, points: newPoints } : s
            )
        }));

        setMenuOpen(false);
        if (weight > 0) playDing();
        else playThud();

        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/points`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    skillId,
                    weight
                })
            });

            if (!res.ok) throw new Error("Failed to award point");

            socket?.emit("classroom-update", {
                classId: classroom.id,
                type: "POINT_UPDATE",
                data: {
                    studentId: selectedStudent.id,
                    points: newPoints,
                    skillId
                }
            });

        } catch (error) {
            // Revert
            setClassroom(prev => ({
                ...prev,
                students: prev.students.map(s =>
                    s.id === selectedStudent.id ? { ...s, points: oldPoints } : s
                )
            }));
            toast({
                title: "Error",
                description: "Failed to award points.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setSelectedStudent(null);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 relative">
            {/* Toolbar */}
            {!isAttendanceMode && (
                <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            {classroom.image && <span className="text-3xl">{classroom.image}</span>}
                            {classroom.name}
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="flex items-center gap-1 text-slate-500">
                            <Users className="w-4 h-4" />
                            <span>{classroom.students.length} Students</span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} title={isConnected ? "Connected" : "Disconnected"} />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowTimer(true)}>
                            <Timer className="w-4 h-4 mr-2" />
                            Timer
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowRandomPicker(true)}>
                            <Shuffle className="w-4 h-4 mr-2" />
                            Random
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowGroupMaker(true)}>
                            <Users className="w-4 h-4 mr-2" />
                            Groups
                        </Button>
                        <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <AddStudentDialog
                            classId={classroom.id}
                            onStudentAdded={() => window.location.reload()}
                        />
                        <StudentLoginsDialog 
                            students={classroom.students} 
                            classId={classroom.id} 
                        />
                    </div>
                </div>
            )}

            {/* Attendance Header */}
            {isAttendanceMode && (
                <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Attendance Mode
                    </h2>
                    <p className="text-indigo-100 text-sm">Tap students to mark Absent, Late, or Left Early</p>
                </div>
            )}

            {/* Grid Area */}
            <div className={`flex-1 bg-slate-50/50 p-6 rounded-xl border border-dashed border-slate-200 min-h-[500px] transition-all ${isAttendanceMode ? "border-indigo-300 bg-indigo-50/30" : ""}`}>
                {classroom.students.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-medium text-slate-600">This class is empty</h3>
                        <p className="mb-6">Add students to start awarding points!</p>
                        <AddStudentDialog classId={classroom.id} onStudentAdded={() => window.location.reload()} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {classroom.students.map((student) => (
                            <StudentAvatar
                                key={student.id}
                                id={student.id}
                                name={student.name}
                                avatarSeed={student.avatar || student.id}
                                points={student.points}
                                attendance={student.attendance || "PRESENT"}
                                onClick={() => handleStudentClick(student)}
                                className={isAttendanceMode ? "hover:scale-100" : ""}
                            />
                        ))}
                    </div>
                )}
            </div>

            <PointMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                studentName={selectedStudent?.name || ""}
                skills={classroom.skills}
                onSelectSkill={handleAwardPoint}
                loading={loading}
            />

            {/* Widgets */}
            {showTimer && <TimerWidget onClose={() => setShowTimer(false)} />}
            {showRandomPicker && (
                <RandomPicker
                    students={classroom.students}
                    onClose={() => setShowRandomPicker(false)}
                />
            )}
            {showGroupMaker && <GroupMaker students={classroom.students} onClose={() => setShowGroupMaker(false)} />}

            {/* Bottom Action Bar */}
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
                            Cancel
                        </Button>
                        <div className="text-slate-400 text-sm font-medium">
                            {hasChanges ? "Unsaved Changes" : "Ready"}
                        </div>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={saveAttendance}
                            disabled={loading}
                        >
                            Save Attendance
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setIsAttendanceMode(true)}>
                            Attendance
                        </Button>
                        <Separator orientation="vertical" className="h-4" />
                        <Button variant="ghost" size="sm">Select Multiple</Button>
                        <Separator orientation="vertical" className="h-4" />
                        <Button variant="ghost" size="sm">Reset Points</Button>
                    </>
                )}
            </div>
        </div>
    );
}
