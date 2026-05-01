import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageBackLink } from "@/components/ui/page-back-link";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { TeacherMissionsAdminClient } from "@/components/admin/teacher-missions-admin-client";

export default async function AdminTeacherMissionsPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const items = await db.teacherMission.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const serialized = items.map((row) => ({
        id: row.id,
        title: row.title,
        reward: row.reward,
        completedDemo: row.completedDemo,
        mascot: row.mascot,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        audiencePlans: row.audiencePlans,
    }));

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                    <PageBackLink href="/admin" labelKey="navBackAdmin" />
                    <AdminSectionHeader
                        titleKey="adminTeacherMissionsPageTitle"
                        descKey="adminTeacherMissionsPageDesc"
                        icon="trophy"
                        iconClassName="text-purple-600"
                    />
                </div>
                <TeacherMissionsAdminClient initialItems={serialized} />
            </div>
        </div>
    );
}
