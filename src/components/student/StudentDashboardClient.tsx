"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { format, isToday, isYesterday } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { AccessibilityControlPanel } from "@/components/accessibility/AccessibilityControlPanel";
import { useLanguage } from "@/components/providers/language-provider";
import {
    calcMonsterStats,
    getActiveGoldMultiplier,
    getNegamonSettings,
    getStudentMonsterState,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import { useEvolveAnimation } from "@/components/negamon/evolve-animation";
import { StarterSelectionModal } from "@/components/negamon/StarterSelectionModal";
import { calcGoldRateBonus } from "@/lib/negamon-passives";
import type {
    HistoryRecord,
    StudentDashboardClientProps,
    StudentDashboardMode,
} from "@/lib/services/student-dashboard/student-dashboard.types";
import { StudentDashboardHeader } from "./student-dashboard-header";
import { StudentDashboardSidebar } from "./student-dashboard-sidebar";
import { StudentDashboardMainTabs } from "./student-dashboard-main-tabs";
import { StudentDashboardUrlParamsHandler } from "./student-dashboard-url-params-handler";

const NotificationTray = dynamic(
    () => import("@/components/dashboard/notification-tray").then((m) => m.NotificationTray),
    { ssr: false }
);

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
                    setLiveEvents(data.filter((event) => event.active));
                }
            } catch (err) {
                console.error("Failed to fetch live events", err);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 30000);
        return () => clearInterval(interval);
    }, [classroom.id, classroom.gamifiedSettings]);

    function toggleMode() {
        setMode((currentMode) => {
            const nextMode = currentMode === "learn" ? "game" : "learn";
            setActiveTab(nextMode === "learn" ? "assignments" : "quests");
            return nextMode;
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

        if (liveEvents.length > 0) {
            const multipliers = liveEvents
                .filter((event) => event.type === "GOLD_BOOST" || event.type === "GOLD_BOOST_3" || event.type === "CUSTOM")
                .map((event) => Number(event.multiplier) || 1);

            if (multipliers.length > 0) {
                return baseRate * Math.max(...multipliers);
            }
        }

        return baseRate * getActiveGoldMultiplier(classroom.gamifiedSettings);
    }, [rankEntry.goldRate, student.negamonSkills, classroom.gamifiedSettings, liveEvents]);

    const studentMonsterState = useMemo(() => {
        if (!negamonSettings?.enabled) return null;
        return getStudentMonsterState(student.id, student.behaviorPoints, levelConfigResolved, negamonSettings);
    }, [negamonSettings, student.id, student.behaviorPoints, levelConfigResolved]);

    useEffect(() => {
        if (!negamonSettings?.enabled || !negamonSettings.allowStudentChoice || studentMonsterState) return;
        const dismissed = localStorage.getItem(`negamon_intro_dismissed_${student.id}`);
        if (dismissed) return;
        const timer = window.setTimeout(() => setIsSelectionOpen(true), 0);
        return () => window.clearTimeout(timer);
    }, [negamonSettings?.enabled, negamonSettings?.allowStudentChoice, studentMonsterState, student.id]);

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
                triggerEvolve(
                    oldForm,
                    studentMonsterState.form,
                    oldStats,
                    studentMonsterState.stats,
                    studentMonsterState.speciesName
                );
            }
        }
    }, [student.id, studentMonsterState, triggerEvolve]);

    const groupedHistory = useMemo(() => {
        const groups: Record<string, HistoryRecord[]> = {};

        [...initialHistory]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .forEach((historyEntry) => {
                const date = new Date(historyEntry.timestamp);
                let dateStr = format(date, "d MMMM yyyy", { locale: dateLocale });

                if (isToday(date)) dateStr = t("dateLabelToday");
                else if (isYesterday(date)) dateStr = t("dateLabelYesterday");

                if (!groups[dateStr]) groups[dateStr] = [];
                groups[dateStr].push(historyEntry);
            });

        return groups;
    }, [initialHistory, t, dateLocale]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 overflow-hidden relative pb-20">
            <StudentDashboardUrlParamsHandler code={code} setMode={setMode} setActiveTab={setActiveTab} />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                <StudentDashboardHeader
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
                    <StudentDashboardSidebar
                        student={student}
                        classId={classroom.id}
                        academicTotal={academicTotal}
                        totalGoldRate={totalGoldRate}
                        rankEntry={rankEntry}
                        totalPositive={totalPositive}
                        totalNegative={totalNegative}
                        themeClass={themeClass}
                        themeStyle={themeStyle}
                        levelConfigResolved={levelConfigResolved}
                        mode={mode}
                        questGold={questGold}
                        gameProfileMonster={
                            mode === "game" && studentMonsterState
                                ? {
                                      icon: studentMonsterState.form.icon,
                                      color: studentMonsterState.form.color,
                                      formName: studentMonsterState.form.name,
                                  }
                                : null
                        }
                    />

                    <StudentDashboardMainTabs
                        t={t}
                        mode={mode}
                        activeTab={activeTab}
                        classroom={classroom}
                        student={student}
                        code={code}
                        currentUserId={currentUserId}
                        canAccessBoard={canAccessBoard}
                        submissions={initialSubmissions}
                        assignmentFilter={assignmentFilter}
                        assignmentSort={assignmentSort}
                        dateLocale={dateLocale}
                        totalPositive={totalPositive}
                        totalNegative={totalNegative}
                        history={initialHistory}
                        groupedHistory={groupedHistory}
                        levelConfigResolved={levelConfigResolved}
                        negamonSettings={negamonSettings}
                        studentMonsterState={studentMonsterState}
                        questGold={questGold}
                        onActiveTabChange={setActiveTab}
                        onAssignmentFilterChange={setAssignmentFilter}
                        onAssignmentSortToggle={() =>
                            setAssignmentSort((value) =>
                                value === "default" ? "deadline" : "default"
                            )
                        }
                        onOpenStarterSelection={() => setIsSelectionOpen(true)}
                        onGoldChange={setQuestGold}
                    />
                </div>
            </div>

            <StarterSelectionModal
                loginCode={student.loginCode}
                isOpen={isSelectionOpen}
                onOpenChange={setIsSelectionOpen}
                allowedSpeciesIds={negamonSettings?.species?.map((species) => species.id)}
                onDismiss={() => localStorage.setItem(`negamon_intro_dismissed_${student.id}`, "1")}
            />
            {evolveNode}
        </div>
    );
}
