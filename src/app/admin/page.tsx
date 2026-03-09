import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users, BookOpen, Gamepad2, ShieldCheck, Trash2, Settings } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
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
        select: { id: true, name: true, email: true, role: true, createdAt: true, image: true }
    });

    const stats = [
        { label: "ผู้ใช้ทั้งหมด", value: userCount, icon: Users, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", text: "text-blue-600" },
        { label: "ครู", value: teacherCount, icon: ShieldCheck, color: "from-purple-500 to-indigo-500", bg: "bg-purple-50", text: "text-purple-600" },
        { label: "นักเรียน", value: studentDbCount, icon: Users, color: "from-green-500 to-emerald-500", bg: "bg-green-50", text: "text-green-600" },
        { label: "ชุดคำถาม", value: setCount, icon: BookOpen, color: "from-orange-500 to-amber-500", bg: "bg-orange-50", text: "text-orange-600" },
        { label: "เกมที่เล่น", value: gameCount, icon: Gamepad2, color: "from-rose-500 to-pink-500", bg: "bg-rose-50", text: "text-rose-600" },
    ];

    const roleColors: Record<string, string> = {
        ADMIN: "bg-red-100 text-red-700",
        TEACHER: "bg-purple-100 text-purple-700",
        STUDENT: "bg-blue-100 text-blue-700",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Topbar */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="text-white font-black text-xl">GameEdu Admin</span>
                        <span className="ml-3 text-red-400 text-xs font-bold bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">ADMIN</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                        Teacher Dashboard →
                    </Link>
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {session.user.name?.charAt(0) || "A"}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Welcome */}
                <div>
                    <h1 className="text-3xl font-black text-slate-800">ยินดีต้อนรับ, {session.user.name || "Admin"} 👋</h1>
                    <p className="text-slate-500 mt-1">ภาพรวมระบบ GameEdu ทั้งหมด</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {stats.map(stat => (
                        <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <stat.icon className={`w-5 h-5 ${stat.text}`} />
                            </div>
                            <p className="text-3xl font-black text-slate-800">{stat.value.toLocaleString()}</p>
                            <p className="text-sm text-slate-500 mt-0.5 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Users */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-500" />
                            <h2 className="font-bold text-slate-800">ผู้ใช้ล่าสุด</h2>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{userCount} คน</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อ</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">อีเมล</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">บทบาท</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่สมัคร</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                                                    {user.image ? (
                                                        <img src={user.image} alt={user.name || ""} className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.name?.charAt(0) || "?"
                                                    )}
                                                </div>
                                                <span className="font-semibold text-slate-800 text-sm">{user.name || "ไม่ระบุชื่อ"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-sm">{user.email}</td>
                                        <td className="px-6 py-3">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleColors[user.role] || "bg-slate-100 text-slate-600"}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-400 text-xs">
                                            {new Date(user.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: "จัดการผู้ใช้ทั้งหมด", desc: "ดู/แก้ไข/ลบบัญชีผู้ใช้", icon: Users, href: "/admin/users", color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100 border-purple-100" },
                        { label: "ชุดคำถามทั้งหมด", desc: "ดูและลบเนื้อหาที่ไม่เหมาะสม", icon: BookOpen, href: "/admin/sets", color: "text-orange-600", bg: "bg-orange-50 hover:bg-orange-100 border-orange-100" },
                        { label: "หน้าแรกครู", desc: "กลับไปยังหน้าจัดการชั้นเรียน", icon: ShieldCheck, href: "/dashboard", color: "text-slate-600", bg: "bg-slate-50 hover:bg-slate-100 border-slate-200" },
                    ].map(link => (
                        <Link key={link.label} href={link.href}
                            className={`${link.bg} border rounded-2xl p-5 flex items-center gap-4 transition-colors group`}
                        >
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                <link.icon className={`w-6 h-6 ${link.color}`} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{link.label}</p>
                                <p className="text-xs text-slate-500">{link.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
