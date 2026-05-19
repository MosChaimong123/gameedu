import { auth } from "@/auth";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [
    userCount,
    adminCount,
    teacherCount,
    studentDbCount,
    verifiedCount,
    unverifiedCount,
    setCount,
    gameCount,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "TEACHER" } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where: { emailVerified: null } }),
    db.questionSet.count(),
    db.gameHistory.count(),
  ]);

  const recentUsers = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      planStatus: true,
      planExpiry: true,
      emailVerified: true,
      createdAt: true,
      image: true,
      _count: {
        select: {
          classrooms: true,
          studentProfiles: true,
        },
      },
    },
  });

  return (
    <AdminDashboardClient
      userName={session.user.name || ""}
      displayInitial={session.user.name?.charAt(0) || "A"}
      counts={{
        users: userCount,
        admins: adminCount,
        teachers: teacherCount,
    students: studentDbCount,
    legacyUsers: userCount - adminCount - teacherCount - studentDbCount,
    verified: verifiedCount,
    unverified: unverifiedCount,
        sets: setCount,
        games: gameCount,
      }}
      recentUsers={recentUsers.map((user) => ({
        ...user,
        planExpiry: user.planExpiry ? user.planExpiry.toISOString() : null,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      }))}
    />
  );
}
