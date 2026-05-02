"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { format, isToday, isYesterday } from "date-fns";
import { enUS, th } from "date-fns/locale";
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
import { getFrameGoldRateMultiplierById } from "@/lib/shop-items";
import type {
    DashboardStudent,
    HistoryRecord,
    StudentDashboardClientProps,
    StudentDashboardMode,
} from "@/lib/services/student-dashboard/student-dashboard.types";
import { applyConsumeInventory } from "@/lib/battle-loadout";
import { StudentDashboardHeader } from "./student-dashboard-header";
import { StudentDashboardSidebar } from "./student-dashboard-sidebar";
import { StudentDashboardMainTabs } from "./student-dashboard-main-tabs";
import { StudentDashboardUrlParamsHandler } from "./student-dashboard-url-params-handler";
import { saveStudentIdentity } from "@/lib/player-session";

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
    const [questGold, setQuestGold] = useState<number | undefined>(undefined);
    const [economyPatch, setEconomyPatch] = useState<
        Partial<Pick<DashboardStudent, "inventory" | "battleLoadout">>
    >({});
    const [liveEvents, setLiveEvents] = useState<
        Array<{ active?: boolean; type?: string; multiplier?: number | string }>
    >([]);

    const liveStudent = useMemo(
        () => ({
            ...student,
            inventory: economyPatch.inventory ?? student.inventory,
            battleLoadout: economyPatch.battleLoadout ?? student.battleLoadout,
        }),
        [student, economyPatch]
    );

    useEffect(() => {
        saveStudentIdentity(liveStudent.id, liveStudent.loginCode);
    }, [liveStudent.id, liveStudent.loginCode]);

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

    const canAccessBoard = Boolean(
        currentUserId && liveStudent.userId && currentUserId === liveStudent.userId
    );
    const levelConfigResolved = classroom.levelConfig as LevelConfigInput;
    const negamonSettings = useMemo(
        () => getNegamonSettings(classroom.gamifiedSettings),
        [classroom.gamifiedSettings]
    );

    const totalGoldRate = useMemo(() => {
        const baseRate = rankEntry.goldRate ?? 0;
        const frameMult = getFrameGoldRateMultiplierById(liveStudent.equippedFrame);
        const frameAdjustedRate = baseRate * frameMult;

        if (liveEvents.length > 0) {
            const multipliers = liveEvents
                .filter((event) => event.type === "GOLD_BOOST" || event.type === "GOLD_BOOST_3" || event.type === "CUSTOM")
                .map((event) => Number(event.multiplier) || 1);

            if (multipliers.length > 0) {
                return frameAdjustedRate * Math.max(...multipliers);
            }
        }

        return frameAdjustedRate * getActiveGoldMultiplier(classroom.gamifiedSettings);
    }, [rankEntry.goldRate, liveStudent.equippedFrame, classroom.gamifiedSettings, liveEvents]);

    const studentMonsterState = useMemo(() => {
        if (!negamonSettings?.enabled) return null;
        return getStudentMonsterState(
            liveStudent.id,
            liveStudent.behaviorPoints,
            levelConfigResolved,
            negamonSettings
        );
    }, [negamonSettings, liveStudent.id, liveStudent.behaviorPoints, levelConfigResolved]);

    useEffect(() => {
        if (!negamonSettings?.enabled || !negamonSettings.allowStudentChoice || studentMonsterState) return;
        const dismissed = localStorage.getItem(`negamon_intro_dismissed_${liveStudent.id}`);
        if (dismissed) return;
        const timer = window.setTimeout(() => setIsSelectionOpen(true), 0);
        return () => window.clearTimeout(timer);
    }, [negamonSettings?.enabled, negamonSettings?.allowStudentChoice, studentMonsterState, liveStudent.id]);

    const { triggerEvolve, node: evolveNode } = useEvolveAnimation();
    const evolveChecked = useRef(false);

    useEffect(() => {
        if (evolveChecked.current || !studentMonsterState) return;
        evolveChecked.current = true;

        const storageKey = `negamon_rank_${liveStudent.id}`;
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
    }, [liveStudent.id, studentMonsterState, triggerEvolve]);

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
                    student={liveStudent}
                    code={code}
                    currentUserId={currentUserId}
                    mode={mode}
                    classIcon={classIcon}
                    isImageIcon={isImageIcon}
                    themeClass={themeClass}
                    themeStyle={themeStyle}
                    notificationTray={<NotificationTray studentCode={code} />}
                    onToggleMode={toggleMode}
                />

                <div className="grid md:grid-cols-4 gap-8">
                    <StudentDashboardSidebar
                        student={liveStudent}
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
                        onBattleConsumablesSpent={(ids) => {
                            setEconomyPatch((p) => {
                                const inv = applyConsumeInventory(p.inventory ?? student.inventory, ids);
                                const lo = (p.battleLoadout ?? student.battleLoadout).filter(
                                    (id) => !ids.includes(id)
                                );
                                return { ...p, inventory: inv, battleLoadout: lo };
                            });
                        }}
                    />
                </div>
            </div>

            <StarterSelectionModal
                loginCode={liveStudent.loginCode}
                isOpen={isSelectionOpen}
                onOpenChange={setIsSelectionOpen}
                allowedSpeciesIds={negamonSettings?.species?.map((species) => species.id)}
                onDismiss={() => localStorage.setItem(`negamon_intro_dismissed_${liveStudent.id}`, "1")}
            />
            {evolveNode}
        </div>
    );
}
