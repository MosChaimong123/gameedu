import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UserTable } from "./user-table";
import { PageBackLink } from "@/components/ui/page-back-link";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { isAppRole, type AppRole } from "@/lib/roles";
import {
    buildAdminUsersWhere,
    clampAdminUsersPage,
    parseAdminUsersSearchParams,
} from "@/lib/admin-users-pagination";

type UserManagementPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UserManagementPage({ searchParams }: UserManagementPageProps) {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || role !== "ADMIN") {
        redirect("/dashboard");
    }

    const listParams = parseAdminUsersSearchParams(await searchParams);
    const where = buildAdminUsersWhere(listParams.q, listParams.role, listParams.verification);
    const total = await db.user.count({ where });
    const page = clampAdminUsersPage(listParams.page, total, listParams.pageSize);
    const skip = (page - 1) * listParams.pageSize;

    const [roleCounts, verificationCounts, users] = await Promise.all([
        Promise.all([
            db.user.count({ where: { role: "ADMIN" } }),
            db.user.count({ where: { role: "TEACHER" } }),
            db.user.count({ where: { role: "STUDENT" } }),
            db.user.count({ where: { role: "USER" } }),
        ]),
        Promise.all([
            db.user.count({ where: { emailVerified: { not: null } } }),
            db.user.count({ where: { emailVerified: null } }),
        ]),
        db.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: listParams.pageSize,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                plan: true,
                planStatus: true,
                planExpiry: true,
                emailVerified: true,
                password: true,
                _count: {
                    select: {
                        classrooms: true,
                        studentProfiles: true,
                    },
                },
            },
        }),
    ]);

    const normalizedUsers = users.map(({ password, ...user }) => ({
        ...user,
        role: isAppRole(user.role) ? user.role : ("USER" satisfies AppRole),
        hasPassword: !!password,
    }));

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
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

                <UserTable
                    users={normalizedUsers}
                    total={total}
                    page={page}
                    pageSize={listParams.pageSize}
                    query={listParams.q}
                    roleFilter={listParams.role}
                    verificationFilter={listParams.verification}
                    counts={{
                        admins: roleCounts[0],
                        teachers: roleCounts[1],
                        students: roleCounts[2],
                        users: roleCounts[3],
                        verified: verificationCounts[0],
                        unverified: verificationCounts[1],
                    }}
                />
            </div>
        </div>
    );
}
