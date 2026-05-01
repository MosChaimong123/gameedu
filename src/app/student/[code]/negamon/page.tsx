import { notFound } from "next/navigation";
import { getStudentDashboard } from "@/lib/services/student-dashboard/get-student-dashboard";
import { NegamonMyProfileClient } from "@/components/negamon/negamon-my-profile-client";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import { negamonProfileMetadata } from "@/lib/negamon-student-page-metadata";

export async function generateMetadata() {
    return negamonProfileMetadata();
}

export default async function StudentNegamonProfilePage(props: { params: Promise<{ code: string }> }) {
    const { code } = await props.params;
    const dashboard = await getStudentDashboard(code);
    if (!dashboard) return notFound();

    return (
        <NegamonMyProfileClient
            code={code}
            studentId={dashboard.student.id}
            behaviorPoints={dashboard.student.behaviorPoints}
            levelConfig={dashboard.classroom.levelConfig as LevelConfigInput}
            gamifiedSettings={dashboard.classroom.gamifiedSettings}
        />
    );
}
