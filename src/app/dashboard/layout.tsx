import { auth } from "@/auth"
import { DashboardAuthSync } from "@/components/auth/dashboard-auth-sync"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SessionProvider } from "next-auth/react"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    return (
        <SessionProvider session={session}>
            <DashboardAuthSync />
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                <aside className="hidden shrink-0 md:flex">
                    <Sidebar />
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <Topbar hideLeadingBrand />
                    <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                        {children}
                    </main>
                </div>
            </div>
        </SessionProvider>
    )
}
