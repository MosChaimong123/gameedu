"use client"

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle, Clock, BookOpen, Star, History, PlayCircle, LayoutDashboard, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { StudentAvatarSection } from "@/components/student/student-avatar-section";
import { NotificationTray } from "@/components/dashboard/notification-tray";
import { SyncAccountButton } from "@/components/student/sync-account-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassBoard } from "@/components/board/ClassBoard";
import { GlassCard } from "@/components/ui/GlassCard";
import { WorldBossBar } from "@/components/student/world-boss-bar";
import { useSocket } from "@/components/providers/socket-provider";

interface StudentDashboardClientProps {
    student: any;
    classroom: any;
    history: any[];
    submissions: any[];
    academicTotal: number;
    totalPositive: number;
    totalNegative: number;
    rankEntry: any;
    themeClass: string;
    themeStyle: any;
    classIcon: string | null;
    isImageIcon: boolean;
    currentUserId: string | undefined;
    code: string;
}

export function StudentDashboardClient({
    student: initialStudent,
    classroom: initialClassroom,
    history: initialHistory,
    submissions,
    academicTotal,
    totalPositive,
    totalNegative,
    rankEntry,
    themeClass,
    themeStyle,
    classIcon,
    isImageIcon,
    currentUserId,
    code
}: StudentDashboardClientProps) {
    const [classroom, setClassroom] = useState(initialClassroom);
    const [student, setStudent] = useState(initialStudent);
    const [history, setHistory] = useState(initialHistory);
    const { socket, isConnected } = useSocket();

    // Listen for Real-time Boss Updates
    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit("join-classroom", classroom.id);

        const handleBossUpdate = (payload: { type: string, data: any }) => {
            if (payload.type === "BOSS_UPDATE") {
                const { boss } = payload.data;
                setClassroom((prev: any) => ({
                    ...prev,
                    gamifiedSettings: {
                        ...(prev.gamifiedSettings as any || {}),
                        boss
                    }
                }));
            }
        };

        socket.on("classroom-event", handleBossUpdate);

        return () => {
            socket.emit("leave-classroom", classroom.id);
            socket.off("classroom-event", handleBossUpdate);
        };
    }, [socket, isConnected, classroom.id]);
    
    const submissionMap = new Map(submissions.map((s: any) => [s.assignmentId, s]));

    const calculateChecklistScore = (bitmask: number, checklistItems: any[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            const points = typeof item === 'object' ? (item.points || 0) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 overflow-hidden relative">
            {/* Background elements for depth */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">

                {/* ===== Back Button ===== */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6"
                >
                    <Link 
                        href="/student/home"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/40 hover:bg-white/60 backdrop-blur-md border border-white/50 text-slate-600 font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>กลับหน้าหลัก</span>
                    </Link>
                </motion.div>

                {/* ===== Header: Classroom Info ===== */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-[2rem] shadow-2xl border border-white/40 text-white p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden ${themeClass}`}
                    style={themeStyle}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <motion.div 
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl overflow-hidden text-4xl shrink-0"
                        >
                            {isImageIcon
                                ? <img src={classIcon!} alt="icon" className="w-full h-full object-cover" />
                                : <span>{classIcon || classroom.image || "🏫"}</span>
                            }
                        </motion.div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-black">Classroom</p>
                                <div className="h-px w-8 bg-white/30" />
                            </div>
                            <h2 className="text-3xl font-black text-white leading-tight drop-shadow-sm">{classroom.name}</h2>
                            <p className="text-white/70 text-sm mt-1 font-medium italic">ครู: {classroom.teacher.name || "N/A"}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-black/10 backdrop-blur-md rounded-[1.5rem] px-4 py-3 border border-white/10 relative z-10">
                        {/* Sync Button if eligible */}
                        {currentUserId && !student.userId && (
                            <SyncAccountButton loginCode={code} />
                        )}
                        
                        <NotificationTray studentCode={code} />
                        
                        <div className="w-px h-10 bg-white/10 hidden sm:block" />
                        
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-white/50 text-[10px] uppercase tracking-wide font-bold">Status</p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse" />
                                    <span className="text-white text-xs font-black">ONLINE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid md:grid-cols-4 gap-8">

                    {/* ===== Left: Character Sidebar ===== */}
                    <div className="md:col-span-1">
                        <StudentAvatarSection
                            studentId={student.id}
                            classId={classroom.id}
                            loginCode={student.loginCode}
                            initialAvatar={student.avatar || student.id}
                            name={student.name}
                            nickname={student.nickname}
                            points={academicTotal}
                            behaviorPoints={student.points}
                            rankEntry={rankEntry}
                            totalPositive={totalPositive}
                            totalNegative={totalNegative}
                            themeClass={themeClass}
                            themeStyle={themeStyle}
                            levelConfig={classroom.levelConfig}
                            gameStats={student.gameStats}
                            lastSyncTime={student.lastSyncTime}
                            onUpdateStudent={(updated: any) => {
                                setStudent((prev: any) => ({ ...prev, ...updated }));
                            }}
                        />
                    </div>

                    {/* ===== Right: Main Content ===== */}
                    <div className="md:col-span-3 space-y-8">
                        {/* World Boss System */}
                        <WorldBossBar boss={(classroom.gamifiedSettings as any)?.boss} />

                        <Tabs defaultValue="assignments" className="w-full">
                            <div className="flex items-center justify-between mb-6">
                                <TabsList className="bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
                                    <TabsTrigger value="assignments" className="rounded-xl px-8 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all">
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>ภารกิจ & ประวัติ</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="board" className="rounded-xl px-8 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all">
                                        <MessageSquare className="w-4 h-4" />
                                        <span>กระดานไอเดีย</span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="assignments" className="space-y-8 mt-0 border-none p-0 outline-hidden">
                                {/* Assignments Section */}
                                {classroom.assignments.length > 0 && (
                                    <GlassCard hover={false}>
                                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/30">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h2 className="font-black text-slate-800 text-lg tracking-tight">งานที่ได้รับ</h2>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Active Missions</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                {classroom.assignments.length} งาน
                                            </span>
                                        </div>
                                        <div className="divide-y divide-slate-100/50 bg-white/20">
                                            {classroom.assignments.filter((a: any) => a.visible).map((assignment: any, idx: number) => {
                                                const submission = submissionMap.get(assignment.id) as any;
                                                const isDone = !!submission;
                                                const passed = isDone && assignment.passScore != null ? submission!.score >= assignment.passScore : isDone;
                                                const isQuiz = assignment.type === "quiz";

                                                return (
                                                    <motion.div 
                                                        key={assignment.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.1 * idx }}
                                                        className="flex items-center gap-5 px-6 py-4 hover:bg-white/40 transition-all group"
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform group-hover:scale-110 ${
                                                            isDone 
                                                                ? 'bg-green-50 border-green-100 text-green-600' 
                                                                : isQuiz 
                                                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-500 animate-pulse' 
                                                                    : 'bg-slate-50 border-slate-100 text-slate-400'
                                                        }`}>
                                                            {isDone ? (
                                                                <CheckCircle className="w-6 h-6" />
                                                            ) : isQuiz ? (
                                                                <PlayCircle className="w-6 h-6" />
                                                            ) : (
                                                                <Clock className="w-6 h-6" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`font-black text-base tracking-tight ${isDone ? 'text-slate-400' : 'text-slate-800'}`}>
                                                                {assignment.name}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded-md border border-slate-100">
                                                                    {isQuiz ? '📝 QUIZ' : assignment.type === 'score' ? '📊 GRADING' : '✅ CHECKLIST'}
                                                                </span>
                                                                {assignment.maxScore > 0 && (
                                                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                                        FULL: {assignment.maxScore}
                                                                    </span>
                                                                )}
                                                                {assignment.deadline && !isDone && (
                                                                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                                        new Date(assignment.deadline) < new Date() 
                                                                            ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                                                            : 'bg-amber-50 text-amber-500 border border-amber-100'
                                                                    }`}>
                                                                        <Clock className="w-3 h-3" />
                                                                        {new Date(assignment.deadline).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Checklist Items Mini View - Enhanced */}
                                                            {assignment.type === 'checklist' && Array.isArray(assignment.checklists) && (
                                                                <div className="mt-4 flex flex-col gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                                                    {(assignment.checklists as any[]).map((item, i) => {
                                                                        const bitmask = submission?.score ?? 0;
                                                                        const itemChecked = (bitmask & (1 << i)) !== 0;
                                                                        const itemLabel = typeof item === 'object' ? (item.text || item.label || `Item ${i + 1}`) : item;
                                                                        const itemPoints = typeof item === 'object' ? (item.points || 0) : 1;
                                                                        
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-2.5">
                                                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border shadow-sm shrink-0 transition-colors ${
                                                                                    itemChecked 
                                                                                        ? 'bg-emerald-500 border-emerald-600 text-white' 
                                                                                        : 'bg-white border-slate-200 text-slate-300'
                                                                                }`}>
                                                                                    {itemChecked ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                                                                                </div>
                                                                                <span className={`text-xs font-bold leading-tight ${itemChecked ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                                    {itemLabel}
                                                                                    {itemPoints > 0 && <span className="ml-1.5 opacity-60 text-[9px]">({itemPoints} pts)</span>}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isDone ? (
                                                            <div className="text-right shrink-0">
                                                                <div className={`text-2xl font-black leading-tight ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                    {assignment.type === 'checklist' 
                                                                        ? calculateChecklistScore(submission.score, assignment.checklists)
                                                                        : submission.score
                                                                    }
                                                                    <span className="text-[10px] ml-1 opacity-60">PTS</span>
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border mt-1 inline-block ${
                                                                    passed 
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                                                }`}>
                                                                    {passed ? 'PASSED' : 'FAILED'}
                                                                </span>
                                                            </div>
                                                        ) : isQuiz ? (
                                                            <Link
                                                                href={`/student/${code}/quiz/${assignment.id}`}
                                                                className={`text-xs font-black px-6 py-3 rounded-2xl text-white shrink-0 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-200 ${themeClass}`}
                                                                style={themeStyle}
                                                            >
                                                                <PlayCircle className="w-4 h-4" /> START
                                                            </Link>
                                                        ) : (
                                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PENDING</span>
                                                                <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                    <motion.div 
                                                                        animate={{ x: [-20, 40] }}
                                                                        transition={{ duration: 1, repeat: Infinity }}
                                                                        className="w-4 h-full bg-slate-300 rounded-full"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </GlassCard>
                                )}

                                {/* Point History Section */}
                                <GlassCard hover={false}>
                                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-white/30">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                            <History className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-slate-800 text-lg tracking-tight">ประวัติคะแนน</h2>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Rewards & Penalties</p>
                                        </div>
                                    </div>
                                    {history.length === 0 ? (
                                        <div className="p-16 text-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                                                <Star className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <p className="font-bold text-slate-400 text-lg">ยังไม่มีความเคลื่อนไหว</p>
                                            <p className="text-sm text-slate-300 mt-1">คะแนนจะแสดงเมื่อมีการอัปเดตจากคุณครู</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white/20 divide-y divide-slate-100/50">
                                            {history.map((record: any, idx: number) => (
                                                <motion.div 
                                                    key={record.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.05 * idx }}
                                                    className="px-6 py-4 hover:bg-white/40 transition-colors flex justify-between items-center gap-6"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 text-base leading-tight tracking-tight">{record.reason}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <Clock className="w-3 h-3 text-slate-300" />
                                                            <p className="text-[11px] font-bold text-slate-400">
                                                                {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true, locale: th })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <motion.div 
                                                        whileHover={{ scale: 1.1, rotate: record.value > 0 ? 5 : -5 }}
                                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl border shrink-0 ${
                                                            record.value > 0 
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100' 
                                                                : 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100'
                                                        }`}
                                                    >
                                                        {record.value > 0 ? '+' : ''}{record.value}
                                                    </motion.div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </GlassCard>
                            </TabsContent>

                            <TabsContent value="board" className="mt-0 border-none p-0 outline-hidden">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white p-6 shadow-2xl overflow-hidden min-h-[500px]"
                                >
                                    <ClassBoard 
                                        classId={classroom.id} 
                                        studentId={student.id}
                                    />
                                </motion.div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
