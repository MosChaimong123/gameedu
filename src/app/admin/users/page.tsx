import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UserTable } from "./user-table";
import { PageBackLink } from "@/components/ui/page-back-link";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { isAppRole, type AppRole } from "@/lib/roles";

export default async function UserManagementPage() {
    const session = await auth();
    const role = session?.user?.role;
    
    if (!session?.user || role !== "ADMIN") {
        redirect("/dashboard");
    }

    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            plan: true,
            planStatus: true,
            planExpiry: true,
        },
    });

    const normalizedUsers = users.map((user) => ({
        ...user,
        role: isAppRole(user.role) ? user.role : ("USER" satisfies AppRole),
    }));

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <PageBackLink href="/admin" labelKey="navBackAdmin" />
                        <AdminSectionHeader
                            titleKey="adminUsersTitle"
                            descKey="adminUsersDesc"
                            icon="users"
                            iconClassName="text-purple-600"
                        />
                    </div>
                </div>

                <UserTable initialUsers={normalizedUsers} />
            </div>
        </div>
    );
}
