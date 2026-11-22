import { notFound, redirect } from "next/navigation";
import { getStudentDashboard } from "@/lib/services/student-dashboard/get-student-dashboard";
import { NegamonMyProfileClient } from "@/components/negamon/negamon-my-profile-client";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import { negamonProfileMetadata } from "@/lib/negamon-student-page-metadata";
import { getStudentAccessSession, STUDENT_ACCESS_ROUTE_KEY } from "@/lib/auth/student-access-session";

export async function generateMetadata() {
    return negamonProfileMetadata();
}

export default async function StudentNegamonProfilePage(props: { params: Promise<{ code: string }> }) {
    const { code } = await props.params;
    if (code !== STUDENT_ACCESS_ROUTE_KEY) redirect("/student");
    const accessSession = await getStudentAccessSession();
    if (!accessSession) redirect("/student?error=session_expired");
    const dashboard = await getStudentDashboard(accessSession.student.loginCode);
    if (!dashboard) return notFound();

    return (
        <NegamonMyProfileClient
            code={STUDENT_ACCESS_ROUTE_KEY}
            studentId={dashboard.student.id}
            studentName={dashboard.student.name}
            behaviorPoints={dashboard.student.behaviorPoints}
            levelConfig={dashboard.classroom.levelConfig as LevelConfigInput}
            negamonSettings={dashboard.classroom.negamonSettings ?? null}
            negamonSkills={dashboard.student.negamonSkills}
            negamonSkillLoadout={dashboard.student.negamonSkillLoadout}
        />
    );
}
