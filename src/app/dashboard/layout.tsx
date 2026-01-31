import { auth } from "@/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SessionProvider } from "next-auth/react"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    // @ts-ignore
    const role = session?.user?.role || "STUDENT"
    const isStudent = role === "STUDENT"

    return (
        <SessionProvider session={session}>
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                {/* Sidebar for Desktop */}
                {/* Sidebar for Desktop - Hidden for all users as per request to move menus to dashboard */}
                {/* <aside className="hidden w-64 flex-col md:flex">
                        <Sidebar />
                </aside> */}

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
