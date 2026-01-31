import { auth } from "@/auth"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
    const session = await auth()
    // @ts-ignore
    const role = session?.user?.role || "STUDENT" // Default to Student for safety

    return <DashboardContent role={role} />
}
