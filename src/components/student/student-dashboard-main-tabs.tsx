"use client";

import type { Locale } from "date-fns";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StudentDashboardTabNav } from "./student-dashboard-tab-nav";
import { StudentDashboardAssignmentsTab } from "./student-dashboard-assignments-tab";
import { StudentDashboardBoardTab } from "./student-dashboard-board-tab";
import { StudentDashboardHistoryTab } from "./student-dashboard-history-tab";
import { StudentCoursesTab } from "./student-courses-tab";
import { StudentLessonsTab } from "./student-lessons-tab";
import { isCoursesUiEnabled } from "@/lib/courses-ui-enabled";
import type {
    ClassroomRecord,
    DashboardStudent,
    HistoryRecord,
    StudentDashboardTranslateFn,
    SubmissionRecord,
} from "@/lib/services/student-dashboard/student-dashboard.types";

interface StudentDashboardMainTabsProps {
    t: StudentDashboardTranslateFn;
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
    onActiveTabChange: (value: string) => void;
    onAssignmentFilterChange: (value: "all" | "pending" | "completed") => void;
    onAssignmentSortToggle: () => void;
}

export function StudentDashboardMainTabs({
    t,
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
    onActiveTabChange,
    onAssignmentFilterChange,
    onAssignmentSortToggle,
}: StudentDashboardMainTabsProps) {
    return (
        <div className="md:col-span-3 space-y-8">
            <Tabs
                id="student-dashboard-tabs"
                value={activeTab}
                onValueChange={onActiveTabChange}
                className="w-full"
                suppressHydrationWarning
            >
                <StudentDashboardTabNav t={t} />

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

                <TabsContent value="lessons" className="mt-0 border-none p-0 outline-hidden">
                    <StudentLessonsTab code={code} />
                </TabsContent>

                {isCoursesUiEnabled() && (
                    <TabsContent value="courses" className="mt-0 border-none p-0 outline-hidden">
                        <StudentCoursesTab code={code} />
                    </TabsContent>
                )}

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

            </Tabs>
        </div>
    );
}
