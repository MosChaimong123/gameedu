"use client";

import { useState, useEffect, useMemo } from "react";
import {
    LayoutDashboard,
    MessageSquare,
    Award,
    Settings,
    BarChart3,
    Users,
    Shield,
    ArrowLeft,
    ShoppingBag,
    Package,
    Swords,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Calendar,
    Trophy,
    Star,
    Flame, // Added Flame import
    ExternalLink // Added ExternalLink import as it was in the provided snippet
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { StudentAvatarSection } from "./student-avatar-section";
import { DailyQuestCard } from "./DailyQuestCard";
import { AchievementsTab } from "./AchievementsTab";
import { LeaderboardTab } from "./LeaderboardTab";
import { EventBanner } from "./EventBanner";
import { ShopTab } from "./ShopTab";
import { InventoryTab } from "./InventoryTab";
import { PvPArenaTab } from "./PvPArenaTab";
import { SkillTab } from "./SkillTab";
import { FarmingTab } from "./FarmingTab";
import { WorldBossBar } from "./world-boss-bar";
import { useSocket } from "@/components/providers/socket-provider";
import { getClassroomTheme } from "@/lib/classroom-utils";
import { IdleEngine } from "@/lib/game/idle-engine";
import { JobSelectionModal } from "@/components/rpg/JobSelectionModal";
import { SyncAccountButton } from "./sync-account-button";
import { NotificationTray } from "@/components/dashboard/notification-tray";
import { ClassBoard } from "@/components/board/ClassBoard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { th } from "date-fns/locale";

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
    currentUserId?: string;
    code: string;
}

export function StudentDashboardClient({
    student: initialStudent,
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
    const { t } = useLanguage();
    const { socket, isConnected } = useSocket();
    const [student, setStudent] = useState(initialStudent);
    const safeGameStats = useMemo(() => {
        const gs = student?.gameStats;
        if (!gs) return IdleEngine.getDefaultStats();
        if (typeof gs === 'string') {
            try {
                return JSON.parse(gs);
            } catch (e) {
                return IdleEngine.getDefaultStats();
            }
        }
        return gs;
    }, [student?.gameStats]);

    const gameStats = safeGameStats;
    const [classroom, setClassroom] = useState(initialClassroom);
    const [viewMode, setViewMode] = useState<"academic" | "game">("academic");
    const [activeTab, setActiveTab] = useState("assignments");
    const [showJobModal, setShowJobModal] = useState(false);

    const handleViewModeChange = (mode: "academic" | "game") => {
        setViewMode(mode);
        // Switch to the first logical tab of each mode
        if (mode === "academic") {
            setActiveTab("assignments");
        } else {
            setActiveTab("shop");
        }
    };

    // Socket.io for Real-time Boss HP & Events
    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit("join-classroom", classroom.id);

        const handleBossUpdate = (event: any) => {
            if (event.type === 'BOSS_HP_UPDATE') {
                setClassroom((prev: any) => ({
                    ...prev,
                    gamifiedSettings: {
                        ...((prev.gamifiedSettings as any) || {}),
                        boss: { ...((prev.gamifiedSettings as any)?.boss || {}), currentHp: event.currentHp }
                    }
                }));
            } else if (event.type === 'BOSS_SUMMONED') {
                setClassroom((prev: any) => ({
                    ...prev,
                    gamifiedSettings: { ...((prev.gamifiedSettings as any) || {}), boss: event.boss }
                }));
            } else if (event.type === 'BOSS_DEFEATED') {
                setClassroom((prev: any) => ({
                    ...prev,
                    gamifiedSettings: { ...((prev.gamifiedSettings as any) || {}), boss: null }
                }));
            }
        };

        socket.on("classroom-event", handleBossUpdate);

        return () => {
            socket.emit("leave-classroom", classroom.id);
            socket.off("classroom-event", handleBossUpdate);
        };
    }, [socket, isConnected, classroom.id]);

    // Check for Job Class Eligibility - only auto-show for FIRST base selection
    useEffect(() => {
        const level = (student.gameStats as any)?.level || 1;

        // Base Selection (Lv 5+) - only auto-show when no job has been selected yet
        if (level >= 5 && !student.jobClass) {
            setShowJobModal(true);
        }
    }, [student.gameStats, student.jobClass]);

    const submissionMap = useMemo(() => new Map(initialSubmissions.map((s: any) => [s.assignmentId, s])), [initialSubmissions]);

    const calculateChecklistScore = (bitmask: number, checklistItems: any[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            // Always treat each item as at least 1 point for progress/score calculation if it's a checklist
            const points = typeof item === 'object' ? (item.points || 1) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    const calculateChecklistCount = (bitmask: number, checklistItems: any[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        let count = 0;
        for (let i = 0; i < checklistItems.length; i++) {
            if ((bitmask & (1 << i)) !== 0) count++;
        }
        return count;
    };

    const groupedHistory = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        [...initialHistory]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .forEach(h => {
                const date = new Date(h.timestamp);
                let dateStr = format(date, 'd MMMM yyyy', { locale: th });
                if (isToday(date)) dateStr = "วันนี้ (Today)";
                else if (isYesterday(date)) dateStr = "เมื่อวาน (Yesterday)";

                if (!groups[dateStr]) groups[dateStr] = [];
                groups[dateStr].push(h);
            });
        return groups;
    }, [initialHistory, th]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 overflow-hidden relative pb-20">
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
                                : <span>{classIcon || "🏫"}</span>
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
                            items={student.items || []}
                            stamina={student.stamina}
                            maxStamina={student.maxStamina}
                            mana={student.mana}
                            jobClass={student.jobClass}
                            jobTier={student.jobTier || "BASE"}
                            advanceClass={student.advanceClass}
                            lastSyncTime={student.lastSyncTime}
                            onUpdateStudent={(updated: any) => {
                                setStudent((prev: any) => ({
                                    ...prev,
                                    ...updated,
                                    gameStats: updated.gameStats ? { ...prev.gameStats, ...updated.gameStats } : prev.gameStats
                                }));
                            }}
                        />
                    </div>

                    {/* ===== Right: Main Content ===== */}
                    <div className="md:col-span-3 space-y-8">
                        {/* Event Banner + Daily Quest Card + World Boss System */}
                        <EventBanner classId={student.classId} />
                        <DailyQuestCard
                            code={code}
                            onGoldEarned={(newGold) => {
                                setStudent((prev: any) => ({
                                    ...prev,
                                    gameStats: { ...(prev.gameStats || {}), gold: newGold }
                                }));
                            }}
                        />
                        <WorldBossBar
                            boss={(classroom.gamifiedSettings as any)?.boss}
                            classId={classroom.id}
                            studentId={student.id}
                            stamina={student.stamina}
                            onAttackSuccess={(data) => {
                                // Update Boss HP and Student Stamina
                                setClassroom((prev: any) => ({
                                    ...prev,
                                    gamifiedSettings: {
                                        ...prev.gamifiedSettings,
                                        boss: data.boss
                                    }
                                }));
                                setStudent((prev: any) => ({
                                    ...prev,
                                    stamina: data.staminaLeft
                                }));
                            }}
                        />

                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => {
                                setActiveTab(value);
                                if (value === "shop") {
                                    window.dispatchEvent(new CustomEvent("trigger-quest", { detail: { questId: "DAILY_SHOP_VISIT" } }));
                                } else if (value === "inventory") {
                                    window.dispatchEvent(new CustomEvent("trigger-quest", { detail: { questId: "DAILY_INVENTORY_CHECK" } }));
                                }
                            }}
                            className="w-full"
                        >
                            {/* View Mode Switcher (Academic vs RPG) */}
                            <div className="flex justify-center mb-8">
                                <div className="bg-slate-200/50 backdrop-blur-md p-1 rounded-2xl border border-white/40 shadow-inner flex items-center relative">
                                    <button
                                        onClick={() => handleViewModeChange("academic")}
                                        className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all relative z-10 flex items-center gap-2.5 ${viewMode === 'academic' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <LayoutDashboard className={`w-4 h-4 ${viewMode === 'academic' ? 'animate-pulse' : ''}`} />
                                        <span>ภารกิจเรียนรู้ (ACADEMIC)</span>
                                    </button>
                                    <button
                                        onClick={() => handleViewModeChange("game")}
                                        className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all relative z-10 flex items-center gap-2.5 ${viewMode === 'game' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Shield className={`w-4 h-4 ${viewMode === 'game' ? 'animate-bounce' : ''}`} />
                                        <span>ระบบเกม (RPG SYSTEM)</span>
                                    </button>

                                    {/* Animated Background Slider */}
                                    <motion.div
                                        className="absolute top-1 bottom-1 bg-white rounded-xl shadow-md border border-slate-200/50"
                                        initial={false}
                                        animate={{
                                            left: viewMode === "academic" ? "4px" : "calc(50% + 1px)",
                                            right: viewMode === "academic" ? "calc(50% + 1px)" : "4px"
                                        }}
                                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                    />
                                </div>
                            </div>

                            <div className="w-full mb-6">
                                <TabsList className="bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm w-full flex flex-wrap justify-center gap-2">
                                    {viewMode === "academic" ? (
                                        <>
                                            <TabsTrigger value="assignments" className="rounded-xl px-6 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span>ภารกิจ</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="board" className="rounded-xl px-6 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <MessageSquare className="w-4 h-4" />
                                                <span>กระดานไอเดีย</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="history" className="rounded-xl px-6 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <Trophy className="w-4 h-4" />
                                                <span>ประวัติ</span>
                                            </TabsTrigger>
                                        </>
                                    ) : (
                                        <>
                                            <TabsTrigger value="shop" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <ShoppingBag className="w-4 h-4" />
                                                <span>ร้านค้า</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="inventory" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <Package className="w-4 h-4" />
                                                <span>คลังแสง</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="skills" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <Star className="w-4 h-4" />
                                                <span>ทักษะ</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="farming" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <Flame className="w-4 h-4" />
                                                <span>ฟาร์ม</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="leaderboard" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <BarChart3 className="w-4 h-4" />
                                                <span>อันดับ</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="achievements" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <Award className="w-4 h-4" />
                                                <span>ความสำเร็จ</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="pvp" className="rounded-xl px-5 py-2.5 flex items-center gap-2.5 data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-md font-black text-slate-500 transition-all flex-1 sm:flex-initial min-w-[120px]">
                                                <Swords className="w-4 h-4" />
                                                <span>Arena</span>
                                            </TabsTrigger>
                                        </>
                                    )}
                                </TabsList>
                            </div>

                            <TabsContent value="assignments" className="mt-0 border-none p-0 outline-hidden">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black text-slate-800 px-2 flex items-center gap-2">
                                        <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                                        ภารกิจที่ได้รับมอบหมาย
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {classroom.assignments?.filter((a: any) => a.visible !== false).map((assignment: any) => {
                                            const submission = submissionMap.get(assignment.id);
                                            const isChecklist = assignment.type === 'checklist';
                                            const maxScore = isChecklist ? (assignment.checklists?.reduce((sum: number, item: any) => sum + (item.points || 1), 0) || 1) : (assignment.maxScore || 100);
                                            const score = submission ? (isChecklist ? calculateChecklistScore(submission.score, assignment.checklists) : submission.score) : 0;
                                            const progressValue = isChecklist ? calculateChecklistCount(submission?.score || 0, assignment.checklists) : score;
                                            const maxValue = isChecklist ? (assignment.checklists?.length || 1) : maxScore;
                                            const progress = (progressValue / maxValue) * 100;
                                            const isCompleted = submission && (isChecklist ? progressValue >= (assignment.passScore || maxValue * 0.5) : score >= (assignment.passScore || maxScore * 0.5));

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
                                                            <Progress value={progress} className={`h-1.5 bg-slate-100 ${isCompleted ? "[&>div]:bg-green-500" : "[&>div]:bg-indigo-500"}`} />
                                                        </div>

                                                        {isChecklist && assignment.checklists && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100/50 space-y-2">
                                                                {assignment.checklists.map((item: any, i: number) => {
                                                                    const isChecked = submission ? (submission.score & (1 << i)) !== 0 : false;
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-2.5 group/item">
                                                                            <div className={cn(
                                                                                "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300",
                                                                                isChecked
                                                                                    ? "bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                                                                                    : "border-slate-200 bg-white group-hover/item:border-indigo-300"
                                                                            )}>
                                                                                {isChecked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                            </div>
                                                                            <span className={cn(
                                                                                "text-[11px] font-bold transition-all",
                                                                                isChecked ? "text-slate-400 line-through decoration-slate-300" : "text-slate-600"
                                                                            )}>
                                                                                {typeof item === 'object' ? item.text : item}
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
                                <ClassBoard
                                    classId={classroom.id}
                                    studentId={student.id}
                                    userId={currentUserId}
                                    isTeacher={false}
                                />
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
                                            Object.entries(groupedHistory).map(([dateLabel, entries], gIdx) => (
                                                <div key={dateLabel} className="first:rounded-t-[2rem] last:rounded-b-[2rem] overflow-hidden">
                                                    <div className="px-5 py-2.5 bg-slate-50/80 border-y border-slate-100/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dateLabel}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded-full">{entries.length} รายการ</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100/30">
                                                        {entries.map((h: any, idx: number) => (
                                                            <div key={idx} className="p-4 px-5 flex items-center justify-between hover:bg-white/60 transition-colors bg-white/20">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${h.value > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                        <Award className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-800 text-sm whitespace-pre-wrap leading-tight mb-1">{h.reason}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                                            <Clock className="w-3 h-3" />
                                                                            {format(new Date(h.timestamp), 'HH:mm', { locale: th })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-lg font-black shrink-0 ml-4 ${h.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
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

                            <TabsContent value="shop" className="mt-0 border-none p-0 outline-hidden">
                                <ShopTab 
                                    studentId={student.id} 
                                    currentGold={(student.gameStats as any)?.gold || 0}
                                    currentPoints={student.points || 0}
                                    onPurchaseSuccess={({ gold, points }) => {
                                        setStudent((prev: any) => ({
                                            ...prev,
                                            ...(points !== undefined ? { points } : {}),
                                            gameStats: { 
                                                ...(prev.gameStats || {}), 
                                                ...(gold !== undefined ? { gold } : {}) 
                                            }
                                        }));
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="inventory" className="mt-0 border-none p-0 outline-hidden">
                                <InventoryTab 
                                    studentId={student.id}
                                    gold={(student.gameStats as any)?.gold || 0}
                                    points={student.points || 0}
                                    level={gameStats.level || 1}
                                    jobClass={student.jobClass}
                                    jobTier={student.jobTier || "BASE"}
                                    advanceClass={student.advanceClass}
                                    onUpdate={() => {}}
                                    onUpdateStudent={(updated: any) => {
                                        setStudent((prev: any) => ({ 
                                            ...prev, 
                                            ...updated,
                                            gameStats: updated.gameStats ? { ...prev.gameStats, ...updated.gameStats } : prev.gameStats
                                        }));
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="skills" className="mt-0 border-none p-0 outline-hidden">
                                <SkillTab 
                                    studentId={student.id} 
                                    classId={classroom.id}
                                    mana={student.mana || 0}
                                    stamina={student.stamina || 0}
                                    level={gameStats.level || 1}
                                    jobClass={student.jobClass}
                                    jobTier={student.jobTier || "BASE"}
                                    advanceClass={student.advanceClass}
                                    jobSkills={student.jobSkills || []}
                                    onShowJobModal={() => setShowJobModal(true)}
                                    onUpdateStudent={(updated: any) => {
                                        setStudent((prev: any) => ({ 
                                            ...prev, 
                                            ...updated,
                                            gameStats: updated.gameStats ? { ...prev.gameStats, ...updated.gameStats } : prev.gameStats
                                        }));
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="farming" className="mt-0 border-none p-0 outline-hidden">
                                <FarmingTab 
                                    code={code}
                                    studentId={student.id}
                                    mana={student.mana || 0}
                                    stamina={student.stamina || 0}
                                    level={gameStats.level || 1}
                                    jobClass={student.jobClass}
                                    jobTier={student.jobTier || "BASE"}
                                    advanceClass={student.advanceClass}
                                    jobSkills={(student.jobSkills as any) || []}
                                    onUpdateStudent={(updated: any) => {
                                        setStudent((prev: any) => ({ 
                                            ...prev, 
                                            ...updated,
                                            gameStats: updated.gameStats ? { ...prev.gameStats, ...updated.gameStats } : prev.gameStats
                                        }));
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="achievements" className="mt-0 border-none p-0 outline-hidden">
                                <AchievementsTab code={code} classId={student.classId} />
                            </TabsContent>

                            <TabsContent value="leaderboard" className="mt-0 border-none p-0 outline-hidden">
                                <LeaderboardTab classId={classroom.id} currentStudentId={student.id} />
                            </TabsContent>

                            <TabsContent value="pvp" className="mt-0 border-none p-0 outline-hidden">
                                <PvPArenaTab code={code} gold={(student.gameStats as any)?.gold || 0} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Job Selection Modal */}
            {showJobModal && (
                <JobSelectionModal
                    studentId={student.id}
                    level={(student.gameStats as any)?.level || 1}
                    jobClass={student.jobClass}
                    jobTier={student.jobTier || "BASE"}
                    advanceClass={student.advanceClass}
                    onClose={() => setShowJobModal(false)}
                    onJobSelected={async () => {
                        // Refresh student data to get new skills and stats
                        const res = await fetch(`/api/student/${code}`);
                        if (res.ok) {
                            const data = await res.json();
                            setStudent(data.student);
                        }
                    }}
                />
            )}
        </div>
    );
}
