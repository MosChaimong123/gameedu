import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, PlayCircle, Star, Gamepad2, Bell, Trophy } from "lucide-react";
import Link from "next/link";
import { JoinClassDialog } from "@/components/student/join-class-dialog";
import { getThemeBgStyle } from "@/lib/classroom-utils";

export default async function StudentHomePage() {
    const session = await auth();
    const userId = session?.user?.id;
    const role = (session?.user as any)?.role;

    if (!session?.user || !userId) redirect("/login");

    // If teacher accidentally lands here, send to dashboard
    if (role === "TEACHER" || role === "ADMIN") redirect("/dashboard");

    // Find the student records linked to this Gmail account
    const studentRecords = await db.student.findMany({
        where: { userId },
        include: {
            classroom: {
                select: {
                    id: true,
                    name: true,
                    emoji: true,
                    theme: true,
                    teacher: { select: { name: true } },
                    assignments: {
                        where: { visible: true, type: "quiz" },
                        select: { id: true, name: true, maxScore: true } as any
                    }
                }
            },
            submissions: { select: { assignmentId: true, score: true } },
            history: { orderBy: { timestamp: "desc" }, take: 5 }
        },
        orderBy: { updatedAt: "desc" }
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 shadow-xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl border border-white/30 overflow-hidden shadow-inner">
                            {session.user.image ? <img src={session.user.image} alt={session.user.name || ""} className="w-full h-full object-cover" /> : "🎮"}
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Welcome back</p>
                            <h1 className="text-2xl font-black text-white">{session.user.name || "นักเรียน"}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <JoinClassDialog />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Join Game Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black mb-1">มีครูเปิดเกม?</h2>
                        <p className="text-white/70 text-sm">กรอก PIN เพื่อเข้าร่วมได้เลย!</p>
                    </div>
                    <Link href="/play" className="bg-white text-indigo-600 font-black text-sm px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95">
                        เข้าเกมเลย →
                    </Link>
                </div>

                {studentRecords.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-12 text-center">
                        <Star className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                        <h2 className="text-xl font-bold text-slate-700 mb-2">ยังไม่ได้เข้าห้องเรียน</h2>
                        <p className="text-slate-400 text-sm">ขอ Login Code จากครูผู้สอนหรือครูจะเพิ่มคุณเข้าห้องเรียนให้</p>
                    </div>
                ) : (
                    (studentRecords as any[]).map((record: any) => {
                        const submissionMap = new Map((record.submissions as any[]).map((s: any) => [s.assignmentId, s]));
                        const pendingAssignments = (record.classroom.assignments as any[]).filter((a: any) => !submissionMap.has(a.id));
                        const theme = record.classroom.theme || "from-indigo-500 to-purple-600";
                        const isCustom = theme.startsWith("custom:");
                        const themeClass = isCustom ? "" : `bg-gradient-to-br ${theme}`;
                        const themeStyle = isCustom ? getThemeBgStyle(theme) : {};

                        return (
                            <div key={record.id} className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
                                {/* Class Header */}
                                <div className={`px-6 py-4 text-white flex items-center justify-between ${themeClass}`} style={themeStyle}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{record.classroom.emoji || "🏫"}</span>
                                        <div>
                                            <p className="font-black text-lg">{record.classroom.name}</p>
                                            <p className="text-white/70 text-xs">ครู: {record.classroom.teacher.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black">{record.points}</p>
                                        <p className="text-white/70 text-xs">คะแนน</p>
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* Pending Assignments */}
                                    {pendingAssignments.length > 0 && (
                                        <div>
                                            <p className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1">
                                                <BookOpen className="w-4 h-4 text-purple-500" /> การบ้านที่ยังไม่ได้ส่ง
                                            </p>
                                            <div className="space-y-2">
                                                {pendingAssignments.slice(0, 3).map((a: any) => (
                                                    <Link key={a.id} href={`/student/${record.loginCode}/quiz/${a.id}`}
                                                        className="flex items-center justify-between bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl p-3 transition-colors">
                                                        <div>
                                                            <p className="font-semibold text-sm text-slate-800">{a.name}</p>
                                                            {a.deadline && (
                                                                <p className={`text-[10px] ${new Date(a.deadline) < new Date() ? 'text-red-500' : 'text-orange-500'} font-medium`}>
                                                                    ส่งภายใน: {new Date(a.deadline).toLocaleDateString("th-TH")}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">เต็ม {a.maxScore}</span>
                                                            <PlayCircle className="w-5 h-5 text-purple-500" />
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Points */}
                                    {record.history.length > 0 && (
                                        <div>
                                            <p className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1">
                                                <Trophy className="w-4 h-4 text-amber-500" /> คะแนนล่าสุด
                                            </p>
                                            <div className="space-y-1.5">
                                                {record.history.slice(0, 3).map((h: any) => (
                                                    <div key={h.id} className="flex items-center justify-between text-sm px-1">
                                                        <span className="text-slate-600 text-xs">{h.reason}</span>
                                                        <span className={`font-bold text-sm ${h.value > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {h.value > 0 ? '+' : ''}{h.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Link href={`/student/${record.loginCode}`}
                                        className="block w-full text-center text-xs font-bold text-slate-400 hover:text-purple-600 transition-colors py-1 border border-dashed border-slate-200 rounded-xl hover:border-purple-200">
                                        ดูโปรไฟล์นักเรียนเต็ม →
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
