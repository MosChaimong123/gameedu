"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
    LayoutDashboard,
    MessageSquare,
    BarChart3,
    CheckCircle2,
    Clock,
    Trophy,
    Award,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import Image from "next/image";
import { PageBackLink } from "@/components/ui/page-back-link";
import { StudentAvatarSection } from "./student-avatar-section";
import { LeaderboardTab } from "./LeaderboardTab";
import { EventBanner } from "./EventBanner";
import { SyncAccountButton } from "./sync-account-button";
import { NotificationTray } from "@/components/dashboard/notification-tray";
import { ClassBoard } from "@/components/board/ClassBoard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { th } from "date-fns/locale";
import { AccessibilityControlPanel } from "@/components/accessibility/AccessibilityControlPanel";
import type { RankEntry, LevelConfigInput } from "@/lib/classroom-utils";

type ChecklistItem = string | { text: string; points?: number };

interface AssignmentRecord {
    id: string;
    name: string;
    description?: string | null;
    visible?: boolean;
    type?: string;
    checklists?: ChecklistItem[];
    maxScore?: number;
    passScore?: number;
}

interface SubmissionRecord {
    assignmentId: string;
    score: number;
}

export interface HistoryRecord {
    timestamp: string;
    value: number;
    reason: string;
}

interface TeacherRecord {
    name?: string | null;
}

export interface ClassroomRecord {
    id: string;
    name: string;
    teacher: TeacherRecord;
    gamifiedSettings: Record<string, unknown>;
    levelConfig?: unknown;
    assignments?: AssignmentRecord[];
}

interface DashboardStudent {
    id: string;
    classId: string;
    loginCode: string;
    name: string;
    nickname?: string | null;
    avatar?: string | null;
    userId?: string | null;
    points: number;
}

interface StudentDashboardClientProps {
    student: DashboardStudent;
    classroom: ClassroomRecord;
    history: HistoryRecord[];
    submissions: SubmissionRecord[];
    academicTotal: number;
    totalPositive: number;
    totalNegative: number;
    rankEntry: RankEntry;
    themeClass: string;
    themeStyle: CSSProperties;
    classIcon: string | null;
    isImageIcon: boolean;
    currentUserId?: string;
    code: string;
}

export function StudentDashboardClient({
    student,
    classroom: initialClassroom,
    history: initialHistory,
    submissions: initialSubmissions,
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
    const [classroom] = useState(initialClassroom);
    const [activeTab, setActiveTab] = useState("assignments");
    const canAccessBoard = Boolean(currentUserId && student.userId && currentUserId === student.userId);

    const submissionMap = useMemo(
        () => new Map<string, SubmissionRecord>(initialSubmissions.map((s) => [s.assignmentId, s])),
        [initialSubmissions]
    );

    const calculateChecklistScore = (bitmask: number, checklistItems: ChecklistItem[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            const points = typeof item === "object" ? (item.points || 1) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    const calculateChecklistCount = (bitmask: number, checklistItems: ChecklistItem[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        let count = 0;
        for (let i = 0; i < checklistItems.length; i++) {
            if ((bitmask & (1 << i)) !== 0) count++;
        }
        return count;
    };

    const groupedHistory = useMemo(() => {
        const groups: Record<string, HistoryRecord[]> = {};
        [...initialHistory]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .forEach((h) => {
                const date = new Date(h.timestamp);
                let dateStr = format(date, "d MMMM yyyy", { locale: th });
                if (isToday(date)) dateStr = "วันนี้ (Today)";
                else if (isYesterday(date)) dateStr = "เมื่อวาน (Yesterday)";

                if (!groups[dateStr]) groups[dateStr] = [];
                groups[dateStr].push(h);
            });
        return groups;
    }, [initialHistory]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 overflow-hidden relative pb-20">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6"
                >
                    <PageBackLink
                        href="/student/home"
                        label="กลับหน้าหลัก"
                        className="rounded-xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-md hover:bg-white/60 [&>span]:text-xs [&>span]:font-black"
                    />
                </motion.div>

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
                            {isImageIcon ? (
                                <Image
                                    src={classIcon!}
                                    alt="icon"
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{classIcon || "🏫"}</span>
                            )}
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

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="mb-8"
                >
                    <AccessibilityControlPanel />
                </motion.div>

                <div className="grid md:grid-cols-4 gap-8">
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
                            levelConfig={classroom.levelConfig as LevelConfigInput}
                        />
                    </div>

                    <div className="md:col-span-3 space-y-8">
                        <EventBanner classId={student.classId} />

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full rounded-3xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)] grid grid-cols-4 gap-1.5 mb-6">
                                {[
                                    { value: "assignments", icon: <LayoutDashboard className="w-4 h-4" />, label: "ภารกิจ", color: "data-[state=active]:text-indigo-600 data-[state=active]:bg-indigo-50 data-[state=active]:border-indigo-200" },
                                    { value: "board", icon: <MessageSquare className="w-4 h-4" />, label: "ไอเดีย", color: "data-[state=active]:text-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:border-purple-200" },
                                    { value: "history", icon: <Trophy className="w-4 h-4" />, label: "ประวัติ", color: "data-[state=active]:text-amber-600 data-[state=active]:bg-amber-50 data-[state=active]:border-amber-200" },
                                    { value: "leaderboard", icon: <BarChart3 className="w-4 h-4" />, label: "อันดับ", color: "data-[state=active]:text-cyan-600 data-[state=active]:bg-cyan-50 data-[state=active]:border-cyan-200" },
                                ].map(({ value, icon, label, color }) => (
                                    <TabsTrigger
                                        key={value}
                                        value={value}
                                        className={`h-12 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 font-black text-slate-500 text-sm border border-transparent transition-all duration-200 data-[state=active]:shadow-sm ${color}`}
                                    >
                                        {icon}
                                        <span>{label}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <TabsContent value="assignments" className="mt-0 border-none p-0 outline-hidden">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black text-slate-800 px-2 flex items-center gap-2">
                                        <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                                        ภารกิจที่ได้รับมอบหมาย
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {classroom.assignments?.filter((a) => a.visible !== false).map((assignment) => {
                                            const submission = submissionMap.get(assignment.id);
                                            const isChecklist = assignment.type === "checklist";
                                            const maxScore = isChecklist
                                                ? assignment.checklists?.reduce((sum: number, item) => sum + (typeof item === "object" ? item.points || 1 : 1), 0) || 1
                                                : assignment.maxScore || 100;
                                            const checklistItems = assignment.checklists ?? [];
                                            const score = submission
                                                ? isChecklist
                                                    ? calculateChecklistScore(submission.score, checklistItems)
                                                    : submission.score
                                                : 0;
                                            const progressValue = isChecklist ? calculateChecklistCount(submission?.score || 0, checklistItems) : score;
                                            const maxValue = isChecklist ? assignment.checklists?.length || 1 : maxScore;
                                            const progress = (progressValue / maxValue) * 100;
                                            const isCompleted =
                                                submission &&
                                                (isChecklist
                                                    ? progressValue >= (assignment.passScore || maxValue * 0.5)
                                                    : score >= (assignment.passScore || maxScore * 0.5));

                                            return (
                                                <Card key={assignment.id} className="group hover:shadow-xl transition-all border-white/60 bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden active:scale-[0.98]">
                                                    <CardContent className="p-5">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                                                <LayoutDashboard className="w-5 h-5" />
                                                            </div>
                                                            {isCompleted ? (
                                                                <Badge className="bg-green-100 text-green-700 border-none px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span className="text-[10px] font-black uppercase">Completed</span>
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-slate-200 text-slate-400 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span className="text-[10px] font-black uppercase">Pending</span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="mb-4">
                                                            <h4 className="font-black text-slate-800 line-clamp-1">{assignment.name}</h4>
                                                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 font-medium">{assignment.description || "ไม่มีคำอธิบาย"}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                                                                <span className="text-slate-400">Progress</span>
                                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                                    {progressValue} / {maxValue}
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={progress}
                                                                className={`h-1.5 bg-slate-100 ${isCompleted ? "[&>div]:bg-green-500" : "[&>div]:bg-indigo-500"}`}
                                                            />
                                                        </div>
                                                        {isChecklist && assignment.checklists && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100/50 space-y-2">
                                                                {assignment.checklists.map((item, i: number) => {
                                                                    const isChecked = submission ? (submission.score & (1 << i)) !== 0 : false;
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-2.5 group/item">
                                                                            <div
                                                                                className={cn(
                                                                                    "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300",
                                                                                    isChecked
                                                                                        ? "bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                                                                                        : "border-slate-200 bg-white group-hover/item:border-indigo-300"
                                                                                )}
                                                                            >
                                                                                {isChecked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                            </div>
                                                                            <span
                                                                                className={cn(
                                                                                    "text-[11px] font-bold transition-all",
                                                                                    isChecked ? "text-slate-400 line-through decoration-slate-300" : "text-slate-600"
                                                                                )}
                                                                            >
                                                                                {typeof item === "object" ? item.text : item}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="board" className="mt-0 border-none p-0 outline-hidden">
                                {canAccessBoard ? (
                                    <ClassBoard classId={classroom.id} studentId={student.id} userId={currentUserId} isTeacher={false} />
                                ) : (
                                    <Card className="rounded-[2rem] border-white/60 bg-white/70 backdrop-blur-md shadow-sm">
                                        <CardContent className="p-8 text-center space-y-4">
                                            <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                                <MessageSquare className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-black text-slate-800">ต้องเชื่อมบัญชีก่อนใช้งานกระดานห้องเรียน</h3>
                                                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                                                    ระบบกระดานห้องเรียนผูกกับ session ของบัญชีที่เชื่อมกับนักเรียนแล้ว เพื่อป้องกันการสวมรอยโพสต์ คอมเมนต์ และโหวตแทนกัน
                                                </p>
                                            </div>
                                            {currentUserId && !student.userId ? (
                                                <div className="flex justify-center">
                                                    <SyncAccountButton loginCode={code} />
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="border-slate-200 text-slate-500 px-3 py-1 rounded-full">
                                                    เข้าสู่ระบบด้วยบัญชีที่ผูกกับนักเรียนเพื่อใช้งานกระดาน
                                                </Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 border-none p-0 outline-hidden">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black text-slate-800 px-2 flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                        ประวัติการได้รับคะแนน (History)
                                    </h3>
                                    <div className="bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/60 overflow-y-auto max-h-[600px] shadow-sm scroll-smooth">
                                        {initialHistory.length === 0 ? (
                                            <div className="p-12 text-center text-slate-400 font-bold bg-white/40">ยังไม่มีประวัติการได้รับคะแนน</div>
                                        ) : (
                                            Object.entries(groupedHistory).map(([dateLabel, entries]) => (
                                                <div key={dateLabel} className="first:rounded-t-[2rem] last:rounded-b-[2rem] overflow-hidden">
                                                    <div className="px-5 py-2.5 bg-slate-50/80 border-y border-slate-100/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dateLabel}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded-full">{entries.length} รายการ</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100/30">
                                                        {entries.map((h, idx: number) => (
                                                            <div key={idx} className="p-4 px-5 flex items-center justify-between hover:bg-white/60 transition-colors bg-white/20">
                                                                <div className="flex items-center gap-4">
                                                                    <div
                                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${h.value > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
                                                                    >
                                                                        <Award className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-800 text-sm whitespace-pre-wrap leading-tight mb-1">{h.reason}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                                            <Clock className="w-3 h-3" />
                                                                            {format(new Date(h.timestamp), "HH:mm", { locale: th })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-lg font-black shrink-0 ml-4 ${h.value > 0 ? "text-green-600" : "text-red-600"}`}>
                                                                    {h.value > 0 ? `+${h.value}` : h.value}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="leaderboard" className="mt-0 border-none p-0 outline-hidden">
                                <LeaderboardTab classId={classroom.id} currentStudentId={student.id} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
