"use client";

import { useMemo, useState, useRef } from "react";
import {
    MessageSquare,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { StudentAvatarSection } from "./student-avatar-section";
import { LeaderboardTab } from "./LeaderboardTab";
import { EventBanner } from "./EventBanner";
import { SyncAccountButton } from "./sync-account-button";
import { StudentDashboardHeader } from "./student-dashboard-header";
import { StudentDashboardTabNav } from "./student-dashboard-tab-nav";
import { StudentDashboardAssignmentsTab } from "./student-dashboard-assignments-tab";
import { StudentDashboardHistoryTab } from "./student-dashboard-history-tab";
import { StudentDashboardMonsterTab } from "./student-dashboard-monster-tab";
import dynamic from "next/dynamic";
const NotificationTray = dynamic(
    () => import("@/components/dashboard/notification-tray").then(m => m.NotificationTray),
    { ssr: false }
);
import { ClassBoard } from "@/components/board/ClassBoard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { AccessibilityControlPanel } from "@/components/accessibility/AccessibilityControlPanel";
import { useLanguage } from "@/components/providers/language-provider";
import {
    getNegamonSettings,
    getStudentMonsterState,
    calcMonsterStats,
    getActiveGoldMultiplier,
    type RankEntry,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import { useEvolveAnimation } from "@/components/negamon/evolve-animation";
import { StarterSelectionModal } from "@/components/negamon/StarterSelectionModal";
import { DailyQuestPanel } from "@/components/student/DailyQuestPanel";
import { GameHistoryTab } from "@/components/student/GameHistoryTab";
import { BattleTab } from "@/components/negamon/BattleArena";
import { calcGoldRateBonus } from "@/lib/negamon-passives";
import { useEffect } from "react";

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
    deadline?: string | Date | null;
}

export interface SubmissionRecord {
    assignmentId: string;
    score: number;
}

export interface HistoryRecord {
    timestamp: string;
    value: number;
    reason: string;
}

export interface UnlockedAchievement {
    achievementId: string;
    goldRewarded: number;
    unlockedAt: string;
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

export interface DashboardStudent {
    id: string;
    classId: string;
    loginCode: string;
    name: string;
    nickname?: string | null;
    avatar?: string | null;
    userId?: string | null;
    behaviorPoints: number;
    gold: number;
    streak: number;
    lastCheckIn: string | null;
    inventory: string[];
    equippedFrame: string | null;
    negamonSkills: string[];
}

export type StudentDashboardMode = "learn" | "game";

export type StudentDashboardTranslateFn = (
    key: string,
    params?: Record<string, string | number>
) => string;

export interface StudentDashboardClientProps {
    student: DashboardStudent;
    classroom: ClassroomRecord;
    history: HistoryRecord[];
    submissions: SubmissionRecord[];
    academicTotal: number;
    totalPositive: number;
    totalNegative: number;
    rankEntry: RankEntry;
    themeClass: string;
    themeStyle: React.CSSProperties;
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
    code,
}: StudentDashboardClientProps) {
    const { t, language } = useLanguage();
    const dateLocale = language === "th" ? th : enUS;
    const [classroom] = useState(initialClassroom);
    const [mode, setMode] = useState<StudentDashboardMode>("learn");
    const [activeTab, setActiveTab] = useState("assignments");
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [assignmentFilter, setAssignmentFilter] = useState<"all" | "pending" | "completed">("all");
    const [assignmentSort, setAssignmentSort] = useState<"default" | "deadline">("default");
    const [showAccessibility, setShowAccessibility] = useState(false);
    const [questGold, setQuestGold] = useState<number | undefined>(undefined);
    const [liveEvents, setLiveEvents] = useState<
        Array<{ active?: boolean; type?: string; multiplier?: number | string }>
    >([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch(`/api/classrooms/${classroom.id}/events`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLiveEvents(data.filter(e => e.active));
                }
            } catch (err) {
                console.error("Failed to fetch live events", err);
            }
        };
        fetchEvents();
        const interval = setInterval(fetchEvents, 30000); // 30s
        return () => clearInterval(interval);
    }, [classroom.id, classroom.gamifiedSettings]);

    function toggleMode() {
        setMode(m => {
            const next = m === "learn" ? "game" : "learn";
            setActiveTab(next === "learn" ? "assignments" : "leaderboard");
            return next;
        });
    }

    const canAccessBoard = Boolean(currentUserId && student.userId && currentUserId === student.userId);

    const levelConfigResolved = classroom.levelConfig as LevelConfigInput;
    const negamonSettings = useMemo(
        () => getNegamonSettings(classroom.gamifiedSettings),
        [classroom.gamifiedSettings]
    );
    
    const totalGoldRate = useMemo(() => {
        const baseRate = (rankEntry.goldRate ?? 0) + calcGoldRateBonus(student.negamonSkills);
        
        // Priority 1: Use live events if available (more fresh)
        if (liveEvents.length > 0) {
            const multipliers = liveEvents
                .filter(e => e.type === "GOLD_BOOST" || e.type === "GOLD_BOOST_3" || e.type === "CUSTOM")
                .map(e => Number(e.multiplier) || 1);
            if (multipliers.length > 0) {
                return baseRate * Math.max(...multipliers);
            }
        }
        
        // Priority 2: Fallback to initial settings
        const multiplier = getActiveGoldMultiplier(classroom.gamifiedSettings);
        return baseRate * multiplier;
    }, [rankEntry.goldRate, student.negamonSkills, classroom.gamifiedSettings, liveEvents]);

    const studentMonsterState = useMemo(() => {

        if (!negamonSettings?.enabled) return null;
        return getStudentMonsterState(student.id, student.behaviorPoints, levelConfigResolved, negamonSettings);
    }, [negamonSettings, student.id, student.behaviorPoints, levelConfigResolved]);

    // Auto-open selection modal if enabled, student choice allowed, and no monster yet
    // ตรวจ dismiss flag เพื่อไม่เปิดซ้ำถ้านักเรียนกด "ไว้ก่อน" ไปแล้ว
    useEffect(() => {
        if (!negamonSettings?.enabled || !negamonSettings.allowStudentChoice || studentMonsterState) return;
        const dismissed = localStorage.getItem(`negamon_intro_dismissed_${student.id}`);
        if (dismissed) return;
        const timer = window.setTimeout(() => setIsSelectionOpen(true), 0);
        return () => window.clearTimeout(timer);
    }, [negamonSettings?.enabled, negamonSettings?.allowStudentChoice, studentMonsterState, student.id]);

    // Evolve animation — triggers once when rankIndex has increased since last visit
    const { triggerEvolve, node: evolveNode } = useEvolveAnimation();
    const evolveChecked = useRef(false);
    useEffect(() => {
        if (evolveChecked.current || !studentMonsterState) return;
        evolveChecked.current = true;

        const storageKey = `negamon_rank_${student.id}`;
        const lastRank = parseInt(localStorage.getItem(storageKey) ?? "-1", 10);
        const currentRank = studentMonsterState.rankIndex;

        localStorage.setItem(storageKey, String(currentRank));

        if (lastRank >= 0 && currentRank > lastRank) {
            const species = findSpeciesById(studentMonsterState.speciesId);
            if (species) {
                const oldForm = species.forms[lastRank] ?? species.forms[0];
                const oldStats = calcMonsterStats(species.baseStats, lastRank);
                triggerEvolve(oldForm, studentMonsterState.form, oldStats, studentMonsterState.stats, studentMonsterState.speciesName);
            }
        }
    }, [student.id, studentMonsterState, triggerEvolve]);

    const groupedHistory = useMemo(() => {
        const groups: Record<string, HistoryRecord[]> = {};
        [...initialHistory]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .forEach((h) => {
                const date = new Date(h.timestamp);
                let dateStr = format(date, "d MMMM yyyy", { locale: dateLocale });
                if (isToday(date)) dateStr = t("dateLabelToday");
                else if (isYesterday(date)) dateStr = t("dateLabelYesterday");

                if (!groups[dateStr]) groups[dateStr] = [];
                groups[dateStr].push(h);
            });
        return groups;
    }, [initialHistory, t, dateLocale]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 overflow-hidden relative pb-20">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">                <StudentDashboardHeader
                    t={t}
                    classroom={classroom}
                    student={student}
                    code={code}
                    currentUserId={currentUserId}
                    mode={mode}
                    showAccessibility={showAccessibility}
                    classIcon={classIcon}
                    isImageIcon={isImageIcon}
                    themeClass={themeClass}
                    themeStyle={themeStyle}
                    notificationTray={<NotificationTray studentCode={code} />}
                    onToggleMode={toggleMode}
                    onToggleAccessibility={() => setShowAccessibility((value) => !value)}
                />

                {showAccessibility && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-6"
                    >
                        <AccessibilityControlPanel />
                    </motion.div>
                )}

                <div className="grid md:grid-cols-4 gap-8">
                    {/* ── Sidebar ── */}
                    <div className="md:col-span-1 space-y-4">
                        <StudentAvatarSection
                            studentId={student.id}
                            classId={classroom.id}
                            loginCode={student.loginCode}
                            initialAvatar={student.avatar || student.id}
                            name={student.name}
                            nickname={student.nickname}
                            points={academicTotal}
                            behaviorPoints={student.behaviorPoints}
                            initialGold={student.gold}
                            goldRate={totalGoldRate}
                            rankEntry={rankEntry}
                            totalPositive={totalPositive}
                            totalNegative={totalNegative}
                            themeClass={themeClass}
                            themeStyle={themeStyle}
                            levelConfig={classroom.levelConfig as LevelConfigInput}
                            initialInventory={student.inventory}
                            initialEquippedFrame={student.equippedFrame}
                            initialStreak={student.streak}
                            lastCheckIn={student.lastCheckIn}
                            mode={mode}
                            externalGold={questGold}
                        />
                    </div>

                    <div className="md:col-span-3 space-y-8">
                        <EventBanner classId={student.classId} />

                        <Tabs id="student-dashboard-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full" suppressHydrationWarning>
                            <StudentDashboardTabNav t={t} mode={mode} />

                            <TabsContent value="assignments" className="mt-0 border-none p-0 outline-hidden">
                                <StudentDashboardAssignmentsTab
                                    t={t}
                                    classroom={classroom}
                                    code={code}
                                    submissions={initialSubmissions}
                                    assignmentFilter={assignmentFilter}
                                    assignmentSort={assignmentSort}
                                    dateLocale={dateLocale}
                                    onAssignmentFilterChange={setAssignmentFilter}
                                    onAssignmentSortToggle={() =>
                                        setAssignmentSort((value) =>
                                            value === "default" ? "deadline" : "default"
                                        )
                                    }
                                />
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
                                                <h3 className="text-lg font-black text-slate-800">{t("studentDashBoardGateTitle")}</h3>
                                                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                                                    {t("studentDashBoardGateBody")}
                                                </p>
                                            </div>
                                            {currentUserId && !student.userId ? (
                                                <div className="flex justify-center">
                                                    <SyncAccountButton loginCode={code} />
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="border-slate-200 text-slate-500 px-3 py-1 rounded-full">
                                                    {t("studentDashBoardLoginHint")}
                                                </Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 border-none p-0 outline-hidden">
                                <StudentDashboardHistoryTab
                                    t={t}
                                    history={initialHistory}
                                    groupedHistory={groupedHistory}
                                    totalPositive={totalPositive}
                                    totalNegative={totalNegative}
                                    dateLocale={dateLocale}
                                />
                            </TabsContent>

                            <TabsContent value="leaderboard" className="mt-0 border-none p-0 outline-hidden">
                                <LeaderboardTab classId={classroom.id} currentStudentId={student.id} studentCode={student.loginCode} />
                            </TabsContent>


                            {/* ── Quest tab (game mode only) ── */}
                            <TabsContent value="quests" className="mt-0 border-none p-0 outline-hidden">
                                <DailyQuestPanel loginCode={student.loginCode} onGoldChange={setQuestGold} />
                            </TabsContent>

                            {/* ── Monster tab (game mode only) ── */}                            <TabsContent value="monster" className="mt-0 border-none p-0 outline-hidden">
                                <StudentDashboardMonsterTab
                                    t={t}
                                    classroom={classroom}
                                    student={student}
                                    levelConfigResolved={levelConfigResolved}
                                    negamonSettings={negamonSettings}
                                    studentMonsterState={studentMonsterState}
                                    questGold={questGold}
                                    onOpenStarterSelection={() => setIsSelectionOpen(true)}
                                />
                            </TabsContent>

                            {/* ── Battle tab (game mode only) ── */}
                            <TabsContent value="battle" className="mt-0 border-none p-0 outline-hidden">
                                <BattleTab
                                    classId={classroom.id}
                                    myStudentId={student.id}
                                    myStudentCode={student.loginCode}
                                    myMonster={studentMonsterState ? {
                                        formIcon: studentMonsterState.form.icon,
                                        formName: studentMonsterState.form.name,
                                        rankIndex: studentMonsterState.rankIndex,
                                    } : null}
                                    currentGold={questGold ?? student.gold}
                                    onGoldChange={setQuestGold}
                                />
                            </TabsContent>

                            {/* ── Game History tab (game mode only) ── */}
                            <TabsContent value="gamehistory" className="mt-0 border-none p-0 outline-hidden">
                                <GameHistoryTab history={initialHistory} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            <StarterSelectionModal
                loginCode={student.loginCode}
                isOpen={isSelectionOpen}
                onOpenChange={setIsSelectionOpen}
                allowedSpeciesIds={negamonSettings?.species?.map((s) => s.id)}
                onDismiss={() => localStorage.setItem(`negamon_intro_dismissed_${student.id}`, "1")}
            />
            {evolveNode}
        </div>
    );
}



