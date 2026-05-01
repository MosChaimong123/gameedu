import { auth } from "@/auth"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { db } from "@/lib/db"
import { getEffectivePlan } from "@/lib/plan/plan-access"

export default async function DashboardPage() {
    const session = await auth()
    const role = session?.user?.role ?? "STUDENT"
    const plan = getEffectivePlan(session?.user?.plan)

    const [newsRows, missionRows] = await Promise.all([
        db.teacherNewsItem.findMany({
            where: { isActive: true, audiencePlans: { has: plan } },
            orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
            take: 12,
        }),
        db.teacherMission.findMany({
            where: { isActive: true, audiencePlans: { has: plan } },
            orderBy: [{ sortOrder: "asc" }],
            take: 12,
        }),
    ])

    const insightsNews = newsRows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        tag: row.tag,
        tagColor: row.tagColor,
        mascot: row.mascot,
        publishedAt: row.publishedAt.toISOString(),
    }))

    const insightsMissions = missionRows.map((row) => ({
        id: row.id,
        title: row.title,
        reward: row.reward,
        completed: row.completedDemo,
        mascot: row.mascot,
    }))

    return (
        <DashboardContent role={role} insightsNews={insightsNews} insightsMissions={insightsMissions} />
    )
}
