import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { getThemeBgClass, getThemeBgStyle, getRankEntry } from "@/lib/classroom-utils";
import { CheckCircle, Clock, BookOpen, Star, History, PlayCircle } from "lucide-react";
import Link from "next/link";
import { StudentAvatarSection } from "@/components/student/student-avatar-section";
import { NotificationTray } from "@/components/dashboard/notification-tray";
import { SyncAccountButton } from "@/components/student/sync-account-button";

export default async function StudentDashboardPage(
    props: { params: Promise<{ code: string }> }
) {
    const { code } = await props.params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    const student = await db.student.findUnique({
        where: { loginCode: code.toUpperCase() },
        include: {
            classroom: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    emoji: true,
                    theme: true,
                    levelConfig: true,
                    teacher: { select: { name: true } },
                    assignments: {
                        orderBy: { order: 'asc' },
                        select: { id: true, name: true, description: true, type: true, maxScore: true, passScore: true, deadline: true, checklists: true, visible: true }
                    }
                }
            },
            history: { orderBy: { timestamp: 'desc' }, take: 30 },
            submissions: { select: { assignmentId: true, score: true, submittedAt: true } }
        }
    });

    if (!student) return notFound();

    // Cast to any to bypass Prisma's temporary linting issues after schema changes
    const sObj = student as any;
    const classroom = sObj.classroom;
    const history = sObj.history;
    const submissions = sObj.submissions;
    
    // Helper: calculate total score from bitmask and checklist items with points
    const calculateChecklistScore = (bitmask: number, checklistItems: any[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            const points = typeof item === 'object' ? (item.points || 0) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    const submissionMap = new Map(submissions.map((s: any) => [s.assignmentId, s]));
    const academicTotal = sObj.classroom.assignments.reduce((sum: number, assignment: any) => {
        const submission = submissionMap.get(assignment.id) as any;
        if (!submission) return sum;
        if (assignment.type === 'checklist') {
            return sum + calculateChecklistScore(submission.score, assignment.checklists);
        }
        return sum + submission.score;
    }, 0);
    const totalPoints = student.points + academicTotal;
    
    // Rank is now calculated ONLY from academic points
    const rankEntry = getRankEntry(academicTotal, classroom.levelConfig);

    const theme = classroom.theme || "from-indigo-500 to-purple-600";
    const isCustomTheme = theme.startsWith("custom:");
    const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
    const themeClass = isCustomTheme ? "" : `bg-gradient-to-br ${theme}`;

    const classIcon = classroom.emoji;
    const isImageIcon = classIcon?.startsWith('data:image') || classIcon?.startsWith('http');

    const totalPositive = history.filter((h: any) => h.value > 0).reduce((s: number, h: any) => s + h.value, 0);
    const totalNegative = Math.abs(history.filter((h: any) => h.value < 0).reduce((s: number, h: any) => s + h.value, 0));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden relative">
            <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">

                {/* ===== Header: Classroom Info ===== */}
                <div
                    className={`rounded-3xl shadow-xl border border-white/20 text-white p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 ${themeClass}`}
                    style={themeStyle}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 shadow-inner overflow-hidden text-3xl shrink-0">
                            {isImageIcon
                                ? <img src={classIcon!} alt="icon" className="w-full h-full object-cover" />
                                : <span>{classIcon || classroom.image || "🏫"}</span>
                            }
                        </div>
                        <div>
                            <p className="text-white/70 text-xs uppercase tracking-wider font-semibold">ห้องเรียน</p>
                            <h2 className="text-2xl font-black text-white leading-tight">{classroom.name}</h2>
                            <p className="text-white/70 text-sm mt-0.5">ครู: {classroom.teacher.name || "N/A"}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/30">
                        {/* Sync Button if eligible */}
                        {currentUserId && !student.userId && (
                            <SyncAccountButton loginCode={code} />
                        )}
                        
                        <NotificationTray studentCode={code} />
                        <div className="w-px h-8 bg-white/20" />
                        <div className="text-center pr-2">
                            <p className="text-white/70 text-[10px] uppercase tracking-wide">สถานะ</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-white text-xs font-semibold">ออนไลน์</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">

                    {/* ===== Left: Character Card (Client island with avatar picker) ===== */}
                    <div className="md:col-span-1">
                        <StudentAvatarSection
                            studentId={student.id}
                            classId={classroom.id}
                            loginCode={student.loginCode}
                            initialAvatar={student.avatar || student.id}
                            name={student.name}
                            nickname={student.nickname}
                            points={academicTotal}
                            behaviorPoints={student.points}
                            rankEntry={rankEntry}
                            totalPositive={totalPositive}
                            totalNegative={totalNegative}
                            themeClass={themeClass}
                            themeStyle={themeStyle}
                        />
                    </div>

                    {/* ===== Right: Assignments + Point History ===== */}
                    <div className="md:col-span-2 space-y-4">

                        {/* Assignments */}
                        {classroom.assignments.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-6">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-500" />
                                    <h2 className="font-bold text-slate-800 text-base">งานที่ได้รับ</h2>
                                    <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{classroom.assignments.length} งาน</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {classroom.assignments.filter((a: any) => a.visible).map((assignment: any) => {
                                        const submission = submissionMap.get(assignment.id) as any;
                                        const isDone = !!submission;
                                        const passed = isDone && assignment.passScore != null ? submission!.score >= assignment.passScore : isDone;
                                        const isQuiz = assignment.type === "quiz";

                                        return (
                                            <div key={assignment.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-green-100' : isQuiz ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                                    {isDone ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : isQuiz ? (
                                                        <PlayCircle className="w-5 h-5 text-indigo-500" />
                                                    ) : (
                                                        <Clock className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold text-sm ${isDone ? 'text-slate-500' : 'text-slate-800'}`}>{assignment.name}</p>
                                                    {assignment.description && !isDone && (
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">{assignment.description}</p>
                                                    )}
                                                     <div className="flex items-center gap-2 mt-1">
                                                         <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                                                             {isQuiz ? '📝 แบบทดสอบ' : assignment.type === 'score' ? '📊 ให้คะแนน' : '✅ เช็คลิสต์'} 
                                                             {assignment.maxScore > 0 && ` · เต็ม ${assignment.maxScore}`}
                                                         </p>
                                                    {assignment.deadline && !isDone && (
                                                             <div className={`flex items-center gap-1 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md ${
                                                                 new Date(assignment.deadline) < new Date() 
                                                                     ? 'bg-red-50 text-red-500 font-bold' 
                                                                     : 'bg-orange-50 text-orange-500'
                                                             }`}>
                                                                 <Clock className="w-3 h-3" />
                                                                 {new Date(assignment.deadline).toLocaleDateString()}
                                                             </div>
                                                         )}
                                                     </div>

                                                     {/* Checklist Items Display */}
                                                     {assignment.type === 'checklist' && Array.isArray(assignment.checklists) && (
                                                         <div className="mt-2 space-y-1 pl-1">
                                                             {(assignment.checklists as any[]).map((item, i) => {
                                                                 const bitmask = submission?.score ?? 0;
                                                                 const itemChecked = (bitmask & (1 << i)) !== 0;
                                                                 const itemText = typeof item === 'object' ? item.text : item;
                                                                 const itemPoints = typeof item === 'object' ? item.points : 0;
                                                                 
                                                                 return (
                                                                     <div key={i} className="flex items-center gap-2 text-[10px] sm:text-xs">
                                                                         <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                                                             itemChecked 
                                                                                 ? 'bg-emerald-500 border-emerald-600 text-white' 
                                                                                 : 'bg-white border-slate-200 text-transparent'
                                                                         }`}>
                                                                             <CheckCircle className="w-2.5 h-2.5" />
                                                                         </div>
                                                                         <span className={`${itemChecked ? 'text-slate-500 line-through' : 'text-slate-600 font-medium'}`}>
                                                                             {itemText}
                                                                             {itemPoints > 0 && <span className="ml-1 text-[#10b981] font-bold">({itemPoints})</span>}
                                                                         </span>
                                                                     </div>
                                                                 );
                                                             })}
                                                         </div>
                                                     )}
                                                 </div>

                                                {isDone ? (
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <p className={`font-black text-lg leading-tight ${passed ? 'text-green-600' : 'text-red-500'}`}>
                                                                {assignment.type === 'checklist' 
                                                                    ? calculateChecklistScore(submission.score, assignment.checklists)
                                                                    : submission.score
                                                                } <span className="text-xs font-bold text-slate-400">คะแนน</span>
                                                            </p>
                                                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                                    {passed ? 'ผ่าน' : 'ยังไม่ผ่าน'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : isQuiz ? (
                                                    <Link
                                                        href={`/student/${code}/quiz/${assignment.id}`}
                                                        className={`text-xs font-bold px-4 py-2 rounded-xl text-white shrink-0 flex items-center gap-1 hover:opacity-90 transition-opacity shadow-sm ${themeClass}`}
                                                        style={themeStyle}
                                                    >
                                                        <PlayCircle className="w-3.5 h-3.5" /> เริ่มทำ
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">รอคะแนน</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Point History */}
                        <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-500" />
                                <h2 className="font-bold text-slate-800 text-base">ประวัติคะแนน</h2>
                            </div>
                            {history.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>ยังไม่มีการบันทึกคะแนน</p>
                                    <p className="text-sm mt-1">คะแนนจะแสดงเมื่อครูให้หรือหักคะแนน</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-50">
                                    {history.map((record: any) => (
                                        <li key={record.id} className="px-5 py-3 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm leading-tight">{record.reason}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-sm border shrink-0 ${
                                                record.value > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {record.value > 0 ? '+' : ''}{record.value}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
