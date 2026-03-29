import { auth } from "@/auth"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
    const session = await auth()
    const role = session?.user?.role ?? "STUDENT"

    return <DashboardContent role={role} />
}
