import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function StudentDashboardPage(
    props: { params: Promise<{ code: string }> }
) {
    const params = await props.params;
    const { code } = params;

    const student = await db.student.findUnique({
        where: { loginCode: code.toUpperCase() },
        include: {
            classroom: {
                select: { name: true, image: true, teacher: { select: { name: true } } }
            },
            history: {
                orderBy: { timestamp: 'desc' },
                take: 20
            }
        }
    });

    if (!student) {
        return notFound();
    }

    const { classroom, history } = student;
    const isPositiveBalance = student.points >= 0;

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl shadow-inner">
                            {classroom.image || "🏫"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{classroom.name}</h2>
                            <p className="text-slate-500 text-sm">Teacher: {classroom.teacher.name || "N/A"}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="px-4 py-1.5 text-sm bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Student Portal
                    </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Character Card */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="shadow-md border-0 bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 flex justify-center items-center relative">
                                <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                                <div className="w-32 h-32 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-white/10 backdrop-blur-sm flex justify-center items-center relative z-10">
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar || student.id}&backgroundColor=transparent`}
                                        alt="Monster Avatar"
                                        width={100}
                                        height={100}
                                        className="drop-shadow-lg transform transition-transform hover:scale-110 duration-300"
                                    />
                                </div>
                            </div>
                            <CardContent className="p-6 text-center space-y-2 relative">
                                <h1 className="text-2xl font-black text-slate-800">{student.name}</h1>
                                <div className="inline-flex items-center gap-2 mt-2">
                                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Points</span>
                                    <div className={`px-4 py-1.5 rounded-full text-lg font-bold shadow-sm border ${
                                        isPositiveBalance ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                    }`}>
                                        {student.points}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* History */}
                    <div className="md:col-span-2">
                        <Card className="shadow-sm border-slate-200 h-full animate-in fade-in slide-in-from-bottom-8">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {history.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                        </div>
                                        <p>No points recorded yet.</p>
                                        <p className="text-sm mt-1">Check back later when you earn points!</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {history.map((record) => (
                                            <li key={record.id} className="p-4 hover:bg-slate-50/80 transition-colors flex justify-between items-center group">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                        {record.reason}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-400">
                                                        {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-sm ${
                                                    record.value > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {record.value > 0 ? '+' : ''}{record.value}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
