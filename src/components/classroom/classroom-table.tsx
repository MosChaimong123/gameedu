"use client";

import { Classroom, Student, Assignment, AssignmentSubmission } from "@prisma/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getStudentRank } from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";
import { Check } from "lucide-react";

type StudentWithSubmissions = Student & { submissions: AssignmentSubmission[] };

interface ClassroomTableProps {
    classId: string;
    students: StudentWithSubmissions[];
    assignments: Assignment[];
    levelConfig: any;
    onUpdatePoints: (studentId: string, diff: number) => void;
}

export function ClassroomTable({ classId, students, assignments, levelConfig, onUpdatePoints }: ClassroomTableProps) {
    const { t } = useLanguage();
    const initialScores: Record<string, Record<string, number>> = {};
    const sortedStudents = [...students].sort((a, b) => a.order - b.order);
    sortedStudents.forEach(s => {
        initialScores[s.id] = {};
        s.submissions.forEach(sub => {
            initialScores[s.id][sub.assignmentId] = sub.score;
        });
    });

    const [scores, setScores] = useState(initialScores);
    const [savingChecklist, setSavingChecklist] = useState<string | null>(null);
    const { toast } = useToast();

    const handleScoreChange = (studentId: string, assignmentId: string, value: string, maxScore: number) => {
        let numValue = value === "" ? 0 : parseInt(value, 10);
        if (isNaN(numValue)) return;
        
        if (numValue < 0) numValue = 0;
        if (numValue > maxScore) numValue = maxScore;
        
        setScores(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [assignmentId]: numValue
            }
        }));
    };

    const handleBlur = async (studentId: string, assignmentId: string) => {
        const currentScore = scores[studentId][assignmentId] || 0;
        const originalSubmission = students.find(s => s.id === studentId)?.submissions.find(sub => sub.assignmentId === assignmentId);
        const originalScore = originalSubmission?.score || 0;
        
        if (currentScore === originalScore) return;

        try {
            const res = await fetch(`/api/classrooms/${classId}/assignments/${assignmentId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, score: currentScore })
            });

            if (!res.ok) throw new Error("Failed");
            // Note: Do NOT call onUpdatePoints here.
            // student.points tracks behavior (skill) points only.
            // Academic scores are stored in submissions, computed separately.
        } catch (e) {
            toast({ title: "Error saving score", variant: "destructive" });
            setScores(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    [assignmentId]: originalScore
                }
            }));
        }
    };

    // Toggle a single checklist item bit: score is stored as bitmask
    // Item 0 = bit 0, item 1 = bit 1, etc.
    const handleChecklistToggle = async (
        studentId: string,
        assignment: Assignment,
        itemIndex: number
    ) => {
        const key = `${studentId}-${assignment.id}`;
        setSavingChecklist(key);

        const currentScore = scores[studentId]?.[assignment.id] ?? 0;
        const bit = 1 << itemIndex;
        const isChecked = (currentScore & bit) !== 0;
        const newScore = isChecked ? currentScore & ~bit : currentScore | bit;

        // Optimistic UI update
        setScores(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [assignment.id]: newScore
            }
        }));

        const originalScore = currentScore;

        try {
            const res = await fetch(`/api/classrooms/${classId}/assignments/${assignment.id}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, score: newScore })
            });

            if (!res.ok) throw new Error();
            // Note: Do NOT call onUpdatePoints — student.points is for behavior only.
        } catch {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
            setScores(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], [assignment.id]: originalScore }
            }));
        } finally {
            setSavingChecklist(null);
        }
    };

    // Helper: count how many boxes are checked
    const countChecked = (bitmask: number, total: number) => {
        let count = 0;
        for (let i = 0; i < total; i++) {
            if ((bitmask & (1 << i)) !== 0) count++;
        }
        return count;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm h-full flex flex-col">
            <div className="overflow-x-auto flex-1 h-full">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[60px] text-center border-r">#</TableHead>
                            <TableHead className="w-[180px] border-r">{t("studentName")}</TableHead>
                            <TableHead className="text-center w-[100px] border-r">{t("totalRank")}</TableHead>
                            <TableHead className="text-center w-[100px] border-r bg-emerald-50 text-emerald-700">พฤติกรรม</TableHead>
                            <TableHead className="text-center w-[100px] border-r bg-blue-50 text-blue-700">คะแนนเก็บ</TableHead>
                            <TableHead className="text-center w-[100px] border-r bg-indigo-50 text-indigo-700">{t("totalPoints")}</TableHead>
                            {assignments.map(a => (
                                <TableHead key={a.id} className={`text-center border-r ${a.type === 'checklist' ? 'min-w-[160px]' : 'min-w-[100px]'}`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="font-bold text-slate-800">{a.name}</span>
                                        {a.type === 'checklist' ? (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                                                เช็คลิสต์ {a.checklists.length} ข้อ
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-400">{t("maxScore", { score: a.maxScore })}</span>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="min-w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedStudents.map((student, index) => (
                            <TableRow key={student.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-bold text-indigo-600 text-center border-r bg-indigo-50/30">
                                    {(student.order ?? index) + 1}
                                </TableCell>
                                <TableCell className="border-r">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar || student.id}`} className="w-full h-full" />
                                        </div>
                                        <span className="font-semibold text-slate-700 truncate">{student.name}</span>
                                        {(student as any).nickname && (
                                            <span className="text-xs text-slate-400 italic truncate">({(student as any).nickname})</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r">
                                    <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {getStudentRank(student.submissions?.reduce((sum, sub) => sum + sub.score, 0) || 0, levelConfig)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center font-bold text-emerald-600 border-r bg-emerald-50/30">
                                    {student.points - (student.submissions?.reduce((sum, sub) => sum + sub.score, 0) || 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-blue-600 border-r bg-blue-50/30">
                                    {student.submissions?.reduce((sum, sub) => sum + sub.score, 0) || 0}
                                </TableCell>
                                <TableCell className="text-center font-bold text-indigo-700 border-r bg-indigo-50/50">
                                    {student.submissions?.reduce((sum, sub) => sum + sub.score, 0) || 0}
                                </TableCell>
                                {assignments.map(a => (
                                    <TableCell key={a.id} className="text-center p-1 border-r">
                                        {a.type === 'score' && (
                                            <Input 
                                                type="number" 
                                                min={0}
                                                max={a.maxScore}
                                                className={`w-16 text-center h-8 mx-auto focus-visible:ring-indigo-500 font-medium ${scores[student.id]?.[a.id] > a.maxScore ? "border-red-500 ring-red-500" : ""}`}
                                                value={scores[student.id]?.[a.id] ?? ""}
                                                onChange={(e) => handleScoreChange(student.id, a.id, e.target.value, a.maxScore)}
                                                onBlur={() => handleBlur(student.id, a.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                }}
                                            />
                                        )}
                                        {a.type === 'checklist' && (
                                            <div className="flex flex-col items-center gap-1.5 py-1 px-2">
                                                {/* Summary badge */}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    countChecked(scores[student.id]?.[a.id] ?? 0, a.checklists.length) === a.checklists.length
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {countChecked(scores[student.id]?.[a.id] ?? 0, a.checklists.length)}/{a.checklists.length}
                                                </span>
                                                {/* Checkbox grid */}
                                                <div className="flex flex-wrap gap-1 justify-center max-w-[140px]">
                                                    {a.checklists.map((item, i) => {
                                                        const bitmask = scores[student.id]?.[a.id] ?? 0;
                                                        const isChecked = (bitmask & (1 << i)) !== 0;
                                                        const saving = savingChecklist === `${student.id}-${a.id}`;
                                                        return (
                                                            <button
                                                                key={i}
                                                                title={item}
                                                                disabled={saving}
                                                                onClick={() => handleChecklistToggle(student.id, a, i)}
                                                                className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                                                                    isChecked
                                                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                                                        : 'bg-white border-slate-200 text-transparent hover:border-emerald-300 hover:bg-emerald-50'
                                                                } ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-110'}`}
                                                            >
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {a.type === 'quiz' && (
                                            <div className="text-slate-400 text-xs italic">[Quiz]</div>
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell></TableCell>
                            </TableRow>
                        ))}
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={assignments.length + 5} className="text-center p-12 text-slate-500">
                                    {t("noStudentsYet")}
                                </TableCell>
                            </TableRow>
                        )}
                        {students.length > 0 && assignments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500 italic bg-yellow-50/30">
                                    {t("noAssignmentsYet")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
