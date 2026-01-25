import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SessionProvider } from "next-auth/react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SessionProvider>
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                {/* Sidebar for Desktop */}
                <aside className="hidden w-64 flex-col md:flex">
                    <Sidebar />
                </aside>

                {/* Main Content Area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </SessionProvider>
    )
}
