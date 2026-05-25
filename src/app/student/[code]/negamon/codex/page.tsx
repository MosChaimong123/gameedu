import { notFound } from "next/navigation";
import { getStudentDashboard } from "@/lib/services/student-dashboard/get-student-dashboard";
import { resolveNegamonSpeciesCatalog } from "@/lib/classroom-utils";
import { NegamonCodexClient } from "@/components/negamon/negamon-codex-client";
import { negamonCodexMetadata } from "@/lib/negamon-student-page-metadata";

export async function generateMetadata() {
    return negamonCodexMetadata();
}

export default async function StudentNegamonCodexPage(props: { params: Promise<{ code: string }> }) {
    const { code } = await props.params;
    const dashboard = await getStudentDashboard(code);
    if (!dashboard) return notFound();

    const negamon = dashboard.classroom.negamonSettings ?? null;
    const speciesList = resolveNegamonSpeciesCatalog(negamon);

    return (
        <NegamonCodexClient
            code={code}
            speciesList={speciesList}
            negamonEnabled={Boolean(negamon?.enabled)}
        />
    );
}
