import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { StudentDashboardClient } from "@/components/student/StudentDashboardClient";
import { getStudentAccessSession, STUDENT_ACCESS_ROUTE_KEY } from "@/lib/auth/student-access-session";
import { getStudentDashboard } from "@/lib/services/student-dashboard/get-student-dashboard";
import { isCivilizationIdleEnabledForClass } from "@/lib/civilization-idle";

export const metadata = {
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};

export default async function StudentAccessDashboardPage() {
  const accessSession = await getStudentAccessSession();
  if (!accessSession) redirect("/student?error=session_expired");

  const accountSession = await auth();
  const dashboard = await getStudentDashboard(accessSession.student.loginCode);
  if (!dashboard || dashboard.student.id !== accessSession.studentId) {
    redirect("/student?error=session_expired");
  }

  return (
    <StudentDashboardClient
      student={{ ...dashboard.student, loginCode: STUDENT_ACCESS_ROUTE_KEY }}
      classroom={dashboard.classroom}
      history={dashboard.history}
      submissions={dashboard.submissions}
      academicTotal={dashboard.academicTotal}
      totalPositive={dashboard.totalPositive}
      totalNegative={dashboard.totalNegative}
      rankEntry={dashboard.rankEntry}
      themeClass={dashboard.themeClass}
      themeStyle={dashboard.themeStyle}
      classIcon={dashboard.classIcon}
      isImageIcon={dashboard.isImageIcon}
      currentUserId={accountSession?.user?.id}
      code={STUDENT_ACCESS_ROUTE_KEY}
      civilizationIdleEnabled={isCivilizationIdleEnabledForClass(accessSession.classId)}
    />
  );
}
