"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    MessageSquare,
    CheckCircle2,
    Clock,
    Trophy,
    Award,
    Star,
    CheckSquare,
    BookOpen,
    SortAsc,
    Filter,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { StudentAvatarSection } from "./student-avatar-section";
import { LeaderboardTab } from "./LeaderboardTab";
import { EventBanner } from "./EventBanner";
import { SyncAccountButton } from "./sync-account-button";
import { StudentDashboardHeader } from "./student-dashboard-header";
import { StudentDashboardTabNav } from "./student-dashboard-tab-nav";
import dynamic from "next/dynamic";
const NotificationTray = dynamic(
    () => import("@/components/dashboard/notification-tray").then(m => m.NotificationTray),
    { ssr: false }
);
import { ClassBoard } from "@/components/board/ClassBoard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { AccessibilityControlPanel } from "@/components/accessibility/AccessibilityControlPanel";
import { useLanguage } from "@/components/providers/language-provider";
import { assignmentFormTypeLabel } from "@/lib/assignment-form-type-label";
import { formatPointHistoryReason } from "@/lib/point-history-reason";
import {
    getNegamonSettings,
    getStudentMonsterState,
    calcMonsterStats,
    getActiveGoldMultiplier,
    type RankEntry,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import { MonsterCard } from "@/components/negamon/monster-card";
import { useEvolveAnimation } from "@/components/negamon/evolve-animation";
import {
    assignmentTypeBadgeClassName,
    dbAssignmentTypeToFormType,
} from "@/lib/assignment-type";
import { checklistCheckedCount, checklistCheckedScore } from "@/lib/academic-score";
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
    params?: Record<string, unknown>
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

    const submissionMap = useMemo(
        () => new Map<string, SubmissionRecord>(initialSubmissions.map((s) => [s.assignmentId, s])),
        [initialSubmissions]
    );

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
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                                            {t("studentDashAssignmentsHeading")}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {/* Filter */}
                                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white/70 p-1 text-xs font-black">
                                                <Filter className="ml-1 h-3 w-3 text-slate-400" />
                                                {(["all", "pending", "completed"] as const).map((f) => (
                                                    <button
                                                        key={f}
                                                        onClick={() => setAssignmentFilter(f)}
                                                        className={`rounded-lg px-2.5 py-1 transition-all ${assignmentFilter === f ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
                                                    >
                                                        {f === "all" ? t("filterAssignmentsAll") : f === "pending" ? t("filterAssignmentsPending") : t("filterAssignmentsDone")}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Sort */}
                                            <button
                                                onClick={() => setAssignmentSort(s => s === "default" ? "deadline" : "default")}
                                                className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-black transition-all ${assignmentSort === "deadline" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white/70 text-slate-500 hover:bg-slate-50"}`}
                                                title={t("sortByDeadlineTitle")}
                                            >
                                                <SortAsc className="h-3 w-3" />
                                                <span className="hidden sm:inline">{t("sortDeadlineToggle")}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {(() => {
                                        const visible = classroom.assignments?.filter((a) => a.visible !== false) ?? [];
                                        const withMeta = visible.map((assignment) => {
                                            const submission = submissionMap.get(assignment.id);
                                            const formType = dbAssignmentTypeToFormType(assignment.type);
                                            const isChecklist = formType === "checklist";
                                            const deadlineAt = assignment.deadline ? new Date(assignment.deadline) : null;
                                            const deadlineValid = deadlineAt !== null && !Number.isNaN(deadlineAt.getTime());
                                            const maxScore = isChecklist
                                                ? assignment.checklists?.reduce((sum: number, item) => sum + (typeof item === "object" ? item.points || 1 : 1), 0) || 1
                                                : assignment.maxScore || 100;
                                            const checklistItems = assignment.checklists ?? [];
                                            const score = submission ? (isChecklist ? checklistCheckedScore(submission.score, checklistItems) : submission.score) : 0;
                                            const progressValue = isChecklist ? checklistCheckedCount(submission?.score || 0, checklistItems) : score;
                                            const maxValue = isChecklist ? (assignment.checklists?.length || 1) : maxScore;
                                            const isCompleted = Boolean(submission && (isChecklist
                                                ? progressValue >= (assignment.passScore || maxValue * 0.5)
                                                : score >= (assignment.passScore || maxScore * 0.5)));
                                            return { assignment, submission, formType, isChecklist, isQuiz: formType === "quiz", deadlineAt, deadlineValid, isDeadlinePast: Boolean(deadlineValid && deadlineAt! < new Date()), maxScore, checklistItems, score, progressValue, maxValue, progress: (progressValue / maxValue) * 100, isCompleted };
                                        });

                                        const filtered = withMeta.filter((a) =>
                                            assignmentFilter === "all" ? true :
                                            assignmentFilter === "completed" ? a.isCompleted :
                                            !a.isCompleted
                                        );
                                        const sorted = assignmentSort === "deadline"
                                            ? [...filtered].sort((a, b) => {
                                                if (!a.deadlineAt && !b.deadlineAt) return 0;
                                                if (!a.deadlineAt) return 1;
                                                if (!b.deadlineAt) return -1;
                                                return a.deadlineAt.getTime() - b.deadlineAt.getTime();
                                              })
                                            : filtered;

                                        if (sorted.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white/40 py-16 text-center">
                                                    <LayoutDashboard className="h-10 w-10 text-slate-200" />
                                                    <p className="font-black text-slate-400">
                                                        {assignmentFilter === "all" ? t("studentDashNoAssignmentsAll") : assignmentFilter === "pending" ? t("studentDashNoAssignmentsPending") : t("studentDashNoAssignmentsDone")}
                                                    </p>
                                                    {assignmentFilter !== "all" && (
                                                        <button onClick={() => setAssignmentFilter("all")} className="text-xs font-bold text-indigo-500 underline">
                                                            {t("studentDashViewAllAssignments")}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sorted.map(({ assignment, submission, formType, isChecklist, isQuiz, deadlineAt, deadlineValid, isDeadlinePast, progressValue, maxValue, progress, isCompleted }) => {
                                            const iconBoxClass =
                                                formType === "quiz"
                                                    ? "bg-amber-50 text-amber-700"
                                                    : formType === "checklist"
                                                      ? "bg-emerald-50 text-emerald-700"
                                                      : "bg-blue-50 text-blue-600";
                                            const TypeIcon =
                                                formType === "quiz"
                                                    ? BookOpen
                                                    : formType === "checklist"
                                                      ? CheckSquare
                                                      : Star;

                                            return (
                                                <Card key={assignment.id} className="group hover:shadow-xl transition-all border-white/60 bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden active:scale-[0.98]">
                                                    <CardContent className="p-5">
                                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                                                            <div
                                                                className={`${iconBoxClass} rounded-xl p-2.5 transition-transform group-hover:scale-110`}
                                                            >
                                                                <TypeIcon className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase",
                                                                        assignmentTypeBadgeClassName(formType)
                                                                    )}
                                                                >
                                                                    {assignmentFormTypeLabel(t, formType)}
                                                                </Badge>
                                                                {isCompleted ? (
                                                                    <Badge className="flex items-center gap-1 rounded-lg border-none bg-green-100 px-2 py-0.5 text-green-700">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        <span className="text-[10px] font-black uppercase">
                                                                            {t("badgeStatusCompleted")}
                                                                        </span>
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="flex items-center gap-1 rounded-lg border-slate-200 px-2 py-0.5 text-slate-400"
                                                                    >
                                                                        <Clock className="h-3 w-3" />
                                                                        <span className="text-[10px] font-black uppercase">
                                                                            {t("badgeStatusPending")}
                                                                        </span>
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="mb-4">
                                                            <h4 className="line-clamp-2 font-black text-slate-800">
                                                                {assignment.name}
                                                            </h4>
                                                            {deadlineValid ? (
                                                                <p
                                                                    className={cn(
                                                                        "mt-1 text-[10px] font-bold",
                                                                        isDeadlinePast
                                                                            ? "text-red-600"
                                                                            : "text-slate-500"
                                                                    )}
                                                                >
                                                                    {t("studentDashDueDatePrefix")}{" "}
                                                                    {format(deadlineAt!, "d MMM yyyy HH:mm", {
                                                                        locale: dateLocale,
                                                                    })}
                                                                </p>
                                                            ) : null}
                                                            {assignment.description?.trim() ? (
                                                                <p className="mt-2 line-clamp-3 text-xs font-medium leading-relaxed text-slate-500">
                                                                    {assignment.description.trim()}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                                                                <span className="text-slate-400">{t("studentDashProgressLabel")}</span>
                                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                                    {progressValue} / {maxValue}
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={progress}
                                                                className={`h-1.5 bg-slate-100 ${isCompleted ? "[&>div]:bg-green-500" : "[&>div]:bg-indigo-500"}`}
                                                            />
                                                        </div>
                                                        {isQuiz && !submission ? (
                                                            <div className="mt-4">
                                                                {isDeadlinePast ? (
                                                                    <p className="text-center text-xs font-bold text-red-600">
                                                                        {t("studentDashQuizClosed")}
                                                                    </p>
                                                                ) : (
                                                                    <Button
                                                                        asChild
                                                                        className="h-11 w-full rounded-xl font-black shadow-md"
                                                                    >
                                                                        <Link
                                                                            href={`/student/${code}/quiz/${assignment.id}`}
                                                                        >
                                                                            {t("studentDashTakeQuiz")}
                                                                        </Link>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ) : null}
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
                                        );
                                    })()}
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
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-amber-500" />
                                            {t("studentDashScoreHistoryTitle")}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-100 px-3 py-1.5">
                                                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                                <span className="text-xs font-black text-green-700">+{totalPositive.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-100 px-3 py-1.5">
                                                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                                                <span className="text-xs font-black text-red-600">{totalNegative.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/60 overflow-y-auto max-h-[600px] shadow-sm scroll-smooth">
                                        {initialHistory.length === 0 ? (
                                            <div className="p-12 text-center text-slate-400 font-bold bg-white/40">{t("studentDashNoScoreHistory")}</div>
                                        ) : (
                                            Object.entries(groupedHistory).map(([dateLabel, entries]) => (
                                                <div key={dateLabel} className="first:rounded-t-[2rem] last:rounded-b-[2rem] overflow-hidden">
                                                    <div className="px-5 py-2.5 bg-slate-50/80 border-y border-slate-100/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dateLabel}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded-full">{t("studentDashHistoryEntryCount", { count: entries.length })}</span>
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
                                                                        <p className="font-black text-slate-800 text-sm whitespace-pre-wrap leading-tight mb-1">
                                                                            {formatPointHistoryReason(h.reason, t)}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                                            <Clock className="w-3 h-3" />
                                                                            {format(new Date(h.timestamp), "HH:mm", { locale: dateLocale })}
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
                                <LeaderboardTab classId={classroom.id} currentStudentId={student.id} studentCode={student.loginCode} />
                            </TabsContent>


                            {/* ── Quest tab (game mode only) ── */}
                            <TabsContent value="quests" className="mt-0 border-none p-0 outline-hidden">
                                <DailyQuestPanel loginCode={student.loginCode} onGoldChange={setQuestGold} />
                            </TabsContent>

                            {/* ── Monster tab (game mode only) ── */}
                            <TabsContent value="monster" className="mt-0 border-none p-0 outline-hidden">
                                <div className="rounded-[2rem] border-4 border-emerald-200 bg-gradient-to-b from-emerald-50 to-teal-50 p-5 shadow-[0_6px_0_0_rgba(16,185,129,0.25)]">
                                    {/* header strip */}
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="text-2xl">🐾</span>
                                        <h3 className="text-base font-black text-emerald-900">{t("tabStudentMonster")}</h3>
                                    </div>
                                    {negamonSettings?.enabled ? (
                                        studentMonsterState ? (
                                            <MonsterCard
                                                studentId={student.id}
                                                behaviorPoints={student.behaviorPoints}
                                                levelConfig={levelConfigResolved}
                                                gamifiedSettings={classroom.gamifiedSettings}
                                                loginCode={student.loginCode}
                                                gold={questGold ?? student.gold}
                                                negamonSkills={student.negamonSkills}
                                            />
                                        ) : negamonSettings.allowStudentChoice ? (
                                            <div className="flex flex-col items-center gap-4 py-10 text-center">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-emerald-200 bg-white text-4xl shadow-md">
                                                    🥚
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-emerald-800">{t("negamonCardTitle")}</p>
                                                    <p className="mt-1 text-sm font-medium text-emerald-600">{t("negamonPickBuddyLine")}</p>
                                                </div>
                                                <Button
                                                    onClick={() => setIsSelectionOpen(true)}
                                                    className="rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3 font-black text-white shadow-[0_5px_0_0_rgba(4,120,87,0.6)] hover:from-emerald-300 hover:to-emerald-500 active:translate-y-1 active:shadow-[0_2px_0_0_rgba(4,120,87,0.6)]"
                                                >
                                                    {t("negamonChooseMonster")}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 py-10 text-center">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-slate-200 bg-white text-4xl shadow-md">
                                                    🔒
                                                </div>
                                                <p className="text-lg font-black text-slate-700">{t("negamonCardTitle")}</p>
                                                <p className="text-sm font-medium text-slate-500">{t("negamonWaitTeacherLine")}</p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-slate-200 bg-white text-4xl shadow-md">
                                                💤
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">{t("negamonDisabledByTeacher")}</p>
                                        </div>
                                    )}
                                </div>
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


