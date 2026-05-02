import { auth } from "@/auth"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getOptionalDbModel } from "@/lib/db"
import { getEffectivePlan } from "@/lib/plan/plan-access"

type TeacherNewsRow = {
    id: string
    title: string
    body: string
    tag: string | null
    tagColor: string | null
    mascot: string | null
    publishedAt: Date
}

type TeacherMissionRow = {
    id: string
    title: string
    reward: number
    completedDemo: boolean
    mascot: string | null
}

export default async function DashboardPage() {
    const session = await auth()
    const role = session?.user?.role ?? "STUDENT"
    const plan = getEffectivePlan(session?.user?.plan)
    const teacherNewsItem = getOptionalDbModel<{
        findMany: (args: unknown) => Promise<TeacherNewsRow[]>
    }>("teacherNewsItem")
    const teacherMission = getOptionalDbModel<{
        findMany: (args: unknown) => Promise<TeacherMissionRow[]>
    }>("teacherMission")

    const [newsRows, missionRows] = await Promise.all([
        teacherNewsItem?.findMany({
            where: { isActive: true, audiencePlans: { has: plan } },
            orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
            take: 12,
        }) ?? Promise.resolve([]),
        teacherMission?.findMany({
            where: { isActive: true, audiencePlans: { has: plan } },
            orderBy: [{ sortOrder: "asc" }],
            take: 12,
        }) ?? Promise.resolve([]),
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
