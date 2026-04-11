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

  const [userCount, teacherCount, studentDbCount, setCount, gameCount] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "TEACHER" } }),
    db.user.count({ where: { role: "STUDENT" } }),
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
      createdAt: true,
      image: true,
    },
  });

  return (
    <AdminDashboardClient
      userName={session.user.name || ""}
      displayInitial={session.user.name?.charAt(0) || "A"}
      counts={{
        users: userCount,
        teachers: teacherCount,
        students: studentDbCount,
        sets: setCount,
        games: gameCount,
      }}
      recentUsers={recentUsers.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      }))}
    />
  );
}
