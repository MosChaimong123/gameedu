import { notFound, redirect } from "next/navigation";
import { getStudentDashboard } from "@/lib/services/student-dashboard/get-student-dashboard";
import { resolveNegamonSpeciesCatalog } from "@/lib/classroom-utils";
import { NegamonCodexClient } from "@/components/negamon/negamon-codex-client";
import { negamonCodexMetadata } from "@/lib/negamon-student-page-metadata";
import { getStudentAccessSession, STUDENT_ACCESS_ROUTE_KEY } from "@/lib/auth/student-access-session";

export async function generateMetadata() {
    return negamonCodexMetadata();
}

export default async function StudentNegamonCodexPage(props: { params: Promise<{ code: string }> }) {
    const { code } = await props.params;
    if (code !== STUDENT_ACCESS_ROUTE_KEY) redirect("/student");
    const accessSession = await getStudentAccessSession();
    if (!accessSession) redirect("/student?error=session_expired");
    const dashboard = await getStudentDashboard(accessSession.student.loginCode);
    if (!dashboard) return notFound();

    const negamon = dashboard.classroom.negamonSettings ?? null;
    const speciesList = resolveNegamonSpeciesCatalog(negamon);

    return (
        <NegamonCodexClient
            code={STUDENT_ACCESS_ROUTE_KEY}
            speciesList={speciesList}
            negamonEnabled={Boolean(negamon?.enabled)}
        />
    );
}
