"use client";

import type { Locale } from "date-fns";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { EventBanner } from "./EventBanner";
import { LeaderboardTab } from "./LeaderboardTab";
import { StudentDashboardTabNav } from "./student-dashboard-tab-nav";
import { StudentDashboardAssignmentsTab } from "./student-dashboard-assignments-tab";
import { StudentDashboardBoardTab } from "./student-dashboard-board-tab";
import { StudentDashboardHistoryTab } from "./student-dashboard-history-tab";
import { StudentDashboardMonsterTab } from "./student-dashboard-monster-tab";
import { StudentDashboardGameTabs } from "./student-dashboard-game-tabs";
import type {
    ClassroomRecord,
    DashboardStudent,
    HistoryRecord,
    StudentDashboardMode,
    StudentDashboardTranslateFn,
    SubmissionRecord,
} from "@/lib/services/student-dashboard/student-dashboard.types";
import type { LevelConfigInput } from "@/lib/classroom-utils";

interface StudentDashboardMainTabsProps {
    t: StudentDashboardTranslateFn;
    mode: StudentDashboardMode;
    activeTab: string;
    classroom: ClassroomRecord;
    student: DashboardStudent;
    code: string;
    currentUserId?: string;
    canAccessBoard: boolean;
    submissions: SubmissionRecord[];
    assignmentFilter: "all" | "pending" | "completed";
    assignmentSort: "default" | "deadline";
    dateLocale: Locale;
    totalPositive: number;
    totalNegative: number;
    history: HistoryRecord[];
    groupedHistory: Record<string, HistoryRecord[]>;
    levelConfigResolved: LevelConfigInput;
    negamonSettings: {
        enabled?: boolean;
        allowStudentChoice?: boolean;
    } | null;
    studentMonsterState: {
        form: { icon: string; name: string };
        rankIndex: number;
    } | null;
    questGold?: number;
    onActiveTabChange: (value: string) => void;
    onAssignmentFilterChange: (value: "all" | "pending" | "completed") => void;
    onAssignmentSortToggle: () => void;
    onOpenStarterSelection: () => void;
    onGoldChange: (value: number | undefined) => void;
    onBattleConsumablesSpent?: (consumedItemIds: string[]) => void;
}

export function StudentDashboardMainTabs({
    t,
    mode,
    activeTab,
    classroom,
    student,
    code,
    currentUserId,
    canAccessBoard,
    submissions,
    assignmentFilter,
    assignmentSort,
    dateLocale,
    totalPositive,
    totalNegative,
    history,
    groupedHistory,
    levelConfigResolved,
    negamonSettings,
    studentMonsterState,
    questGold,
    onActiveTabChange,
    onAssignmentFilterChange,
    onAssignmentSortToggle,
    onOpenStarterSelection,
    onGoldChange,
    onBattleConsumablesSpent,
}: StudentDashboardMainTabsProps) {
    return (
        <div className="md:col-span-3 space-y-8">
            <EventBanner classId={student.classId} loginCode={code} />

            <Tabs
                id="student-dashboard-tabs"
                value={activeTab}
                onValueChange={onActiveTabChange}
                className="w-full"
                suppressHydrationWarning
            >
                <StudentDashboardTabNav t={t} mode={mode} />

                <TabsContent value="assignments" className="mt-0 border-none p-0 outline-hidden">
                    <StudentDashboardAssignmentsTab
                        t={t}
                        classroom={classroom}
                        code={code}
                        submissions={submissions}
                        assignmentFilter={assignmentFilter}
                        assignmentSort={assignmentSort}
                        dateLocale={dateLocale}
                        onAssignmentFilterChange={onAssignmentFilterChange}
                        onAssignmentSortToggle={onAssignmentSortToggle}
                    />
                </TabsContent>

                <StudentDashboardBoardTab
                    t={t}
                    classId={classroom.id}
                    studentId={student.id}
                    currentUserId={currentUserId}
                    studentUserId={student.userId}
                    code={code}
                    canAccessBoard={canAccessBoard}
                />

                <TabsContent value="history" className="mt-0 border-none p-0 outline-hidden">
                    <StudentDashboardHistoryTab
                        t={t}
                        history={history}
                        groupedHistory={groupedHistory}
                        totalPositive={totalPositive}
                        totalNegative={totalNegative}
                        dateLocale={dateLocale}
                    />
                </TabsContent>

                <TabsContent value="leaderboard" className="mt-0 border-none p-0 outline-hidden">
                    <LeaderboardTab
                        classId={classroom.id}
                        currentStudentId={student.id}
                        studentCode={student.loginCode}
                    />
                </TabsContent>

                <TabsContent value="monster" className="mt-0 border-none p-0 outline-hidden">
                    <StudentDashboardMonsterTab
                        t={t}
                        code={code}
                        classroom={classroom}
                        student={student}
                        levelConfigResolved={levelConfigResolved}
                        negamonSettings={negamonSettings}
                        studentMonsterState={studentMonsterState}
                        onOpenStarterSelection={onOpenStarterSelection}
                    />
                </TabsContent>

                <StudentDashboardGameTabs
                    classId={classroom.id}
                    studentId={student.id}
                    loginCode={student.loginCode}
                    questGold={questGold}
                    currentGold={student.gold}
                    inventory={student.inventory}
                    myMonster={studentMonsterState ? {
                        formIcon: studentMonsterState.form.icon,
                        formName: studentMonsterState.form.name,
                        rankIndex: studentMonsterState.rankIndex,
                    } : null}
                    history={history}
                    onGoldChange={onGoldChange}
                    onBattleConsumablesSpent={onBattleConsumablesSpent}
                />
            </Tabs>
        </div>
    );
}
