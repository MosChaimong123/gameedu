import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UserTable } from "./user-table";
import { Users, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function UserManagementPage() {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    if (!session?.user || role !== "ADMIN") {
        redirect("/dashboard");
    }

    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/admin" 
                            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-600" />
                                <h1 className="text-2xl font-black text-slate-800">จัดการผู้ใช้</h1>
                            </div>
                            <p className="text-slate-500 text-sm">จัดการสิทธิ์และข้อมูลของผู้ใช้งานทั้งหมดในระบบ</p>
                        </div>
                    </div>
                </div>

                <UserTable initialUsers={users} />
            </div>
        </div>
    );
}
