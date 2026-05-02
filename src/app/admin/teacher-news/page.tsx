import { auth } from "@/auth";
import { getOptionalDbModel } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageBackLink } from "@/components/ui/page-back-link";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { TeacherNewsAdminClient } from "@/components/admin/teacher-news-admin-client";

export default async function AdminTeacherNewsPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const teacherNewsItem = getOptionalDbModel<{
        findMany: (args: unknown) => Promise<Array<{
            id: string;
            title: string;
            body: string;
            tag: string | null;
            tagColor: string | null;
            mascot: string | null;
            sortOrder: number;
            isActive: boolean;
            audiencePlans: string[];
            publishedAt: Date;
        }>>
    }>("teacherNewsItem");
    const items = teacherNewsItem
        ? await teacherNewsItem.findMany({
              orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
          })
        : [];

    const serialized = items.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        tag: row.tag,
        tagColor: row.tagColor,
        mascot: row.mascot,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        audiencePlans: row.audiencePlans,
        publishedAt: row.publishedAt.toISOString(),
    }));

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                    <PageBackLink href="/admin" labelKey="navBackAdmin" />
                    <AdminSectionHeader
                        titleKey="adminTeacherNewsPageTitle"
                        descKey="adminTeacherNewsPageDesc"
                        icon="newspaper"
                        iconClassName="text-indigo-600"
                    />
                </div>
                <TeacherNewsAdminClient initialItems={serialized} />
            </div>
        </div>
    );
}
