import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SetList } from "./set-list";
import { PageBackLink } from "@/components/ui/page-back-link";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";

export default async function SetManagementPage() {
    const session = await auth();
    const role = session?.user?.role;
    
    if (!session?.user || role !== "ADMIN") {
        redirect("/dashboard");
    }

    const sets = await db.questionSet.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            creator: {
                select: { name: true, email: true }
            },
        }
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <PageBackLink href="/admin" labelKey="navBackAdmin" />
                        <AdminSectionHeader
                            titleKey="adminSetsTitle"
                            descKey="adminSetsDesc"
                            icon="bookOpen"
                            iconClassName="text-orange-600"
                        />
                    </div>
                </div>

                <SetList initialSets={sets} />
            </div>
        </div>
    );
}
