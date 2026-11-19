"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format, isToday, isYesterday } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { useLanguage } from "@/components/providers/language-provider";
import type {
  HistoryRecord,
  StudentDashboardClientProps,
} from "@/lib/services/student-dashboard/student-dashboard.types";
import { StudentDashboardHeader } from "./student-dashboard-header";
import { StudentDashboardSidebar } from "./student-dashboard-sidebar";
import { StudentDashboardMainTabs } from "./student-dashboard-main-tabs";
import { StudentDashboardUrlParamsHandler } from "./student-dashboard-url-params-handler";
import { saveStudentIdentity } from "@/lib/player-session";
import { useSocket } from "@/components/providers/socket-provider";
import { useClassroomPresence } from "@/components/classroom/use-classroom-presence";

const NotificationTray = dynamic(
  () => import("@/components/dashboard/notification-tray").then((m) => m.NotificationTray),
  { ssr: false }
);

export function StudentDashboardClient({
  student,
  classroom,
  history: initialHistory,
  submissions: initialSubmissions,
  academicTotal,
  totalPositive,
  totalNegative,
  themeClass,
  themeStyle,
  classIcon,
  isImageIcon,
  currentUserId,
  code,
}: StudentDashboardClientProps) {
  const { t, language } = useLanguage();
  const { socket, isConnected } = useSocket();
  const dateLocale = language === "th" ? th : enUS;
  const [activeTab, setActiveTab] = useState("assignments");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "pending" | "completed">("all");
  const [assignmentSort, setAssignmentSort] = useState<"default" | "deadline">("default");

  useEffect(() => {
    saveStudentIdentity(student.id, student.loginCode);
  }, [student.id, student.loginCode]);

  const canAccessBoard = Boolean(
    currentUserId && student.userId && currentUserId === student.userId
  );

  useClassroomPresence({
    classroomId: classroom.id,
    socket,
    isConnected,
    studentId: student.id,
    studentCode: student.loginCode,
    leaveOnUnmount: true,
  });

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 pb-20">
      <StudentDashboardUrlParamsHandler setActiveTab={setActiveTab} />
      <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-indigo-200/20 blur-[100px]" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/2 translate-y-1/2 rounded-full bg-purple-200/20 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <StudentDashboardHeader
          t={t}
          classroom={classroom}
          student={student}
          code={code}
          currentUserId={currentUserId}
          classIcon={classIcon}
          isImageIcon={isImageIcon}
          themeClass={themeClass}
          themeStyle={themeStyle}
          notificationTray={<NotificationTray studentCode={code} />}
        />

        <div className="grid gap-8 md:grid-cols-4">
          <StudentDashboardSidebar
            student={student}
            classId={classroom.id}
            academicTotal={academicTotal}
            totalPositive={totalPositive}
            totalNegative={totalNegative}
          />

          <StudentDashboardMainTabs
            t={t}
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
            onActiveTabChange={setActiveTab}
            onAssignmentFilterChange={setAssignmentFilter}
            onAssignmentSortToggle={() =>
              setAssignmentSort((value) => (value === "default" ? "deadline" : "default"))
            }
          />
        </div>
      </div>
    </div>
  );
}
