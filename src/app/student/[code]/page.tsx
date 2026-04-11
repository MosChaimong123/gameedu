import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { StudentDashboardClient } from "@/components/student/StudentDashboardClient";
import { getStudentDashboard } from "@/lib/services/student-dashboard/get-student-dashboard";

export default async function StudentDashboardPage(
    props: { params: Promise<{ code: string }> }
) {
    const { code } = await props.params;
    const session = await auth();
    const currentUserId = session?.user?.id;
    const dashboard = await getStudentDashboard(code);

    if (!dashboard) return notFound();

    return (
        <StudentDashboardClient
            student={dashboard.student}
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
            currentUserId={currentUserId}
            code={code}
        />
    );
}
