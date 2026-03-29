"use client";

import { Student, Assignment, AssignmentSubmission } from "@prisma/client";
import Image from "next/image";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getRankEntry, type LevelConfigInput } from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ChecklistItem = string | { text?: string; points?: number };

export type AssignmentWithChecklist = Assignment & {
    checklists?: ChecklistItem[] | null;
};

type StudentScoreMap = Record<string, Record<string, number>>;

type StudentWithSubmissions = Student & {
    submissions: AssignmentSubmission[];
    nickname?: string | null;
};

interface ClassroomTableProps {
    classId: string;
    students: StudentWithSubmissions[];
    assignments: AssignmentWithChecklist[];
    levelConfig: unknown;
    isAttendanceMode?: boolean;
    onStudentClick?: (student: Student) => void;
}

export function ClassroomTable({ 
    classId, 
    students, 
    assignments, 
    levelConfig, 
    isAttendanceMode = false,
    onStudentClick
}: ClassroomTableProps) {
    const { t } = useLanguage();
    const sortedStudents = [...students].sort((a, b) => a.order - b.order);
    const initialScores: StudentScoreMap = {};
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
            const res = await fetch(`/api/classrooms/${classId}/assignments/${assignmentId}/manual-scores`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, score: currentScore })
            });

            if (!res.ok) throw new Error("Failed");
            await res.json();
            // student.points tracks behavior (skill) points only.
            // Academic scores are stored in submissions, computed separately.
        } catch {
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
            const res = await fetch(`/api/classrooms/${classId}/assignments/${assignment.id}/manual-scores`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, score: newScore })
            });

            if (!res.ok) throw new Error();
            await res.json();
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

    // Helper: calculate total score from bitmask and checklist items with points
    const calculateChecklistScore = (bitmask: number, checklistItems: ChecklistItem[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            // Support both old string array and new object array
            const points = typeof item === 'object' ? (item.points || 0) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    // Helper: count how many boxes are checked
    // Helper: calculate total academic points for a student from the reactive scores state
    const calculateTotalAcademicPoints = (studentId: string) => {
        return assignments.reduce((sum, a) => {
            const score = scores[studentId]?.[a.id] ?? 0;
            if (a.type === 'checklist') {
                return sum + calculateChecklistScore(score, a.checklists ?? []);
            }
            return sum + score;
        }, 0);
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
                            {assignments.map(a => (
                                <TableHead key={a.id} className={`text-center border-r ${a.type === 'checklist' ? 'min-w-[160px]' : 'min-w-[100px]'}`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="font-bold text-slate-800">{a.name}</span>
                                        {a.type === 'checklist' ? (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                                                {a.maxScore} คะแนน ({Array.isArray(a.checklists) ? a.checklists.length : 0} ข้อ)
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
                                <TableCell 
                                    className={cn(
                                        "border-r transition-colors",
                                        isAttendanceMode && "cursor-pointer hover:bg-indigo-50 active:bg-indigo-100"
                                    )}
                                    onClick={() => isAttendanceMode && onStudentClick?.(student)}
                                >
                                    <div className="flex items-center gap-2 relative">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 relative",
                                            student.attendance === "ABSENT" && "opacity-50 grayscale",
                                            student.attendance === "LATE" && "border-2 border-yellow-400",
                                            student.attendance === "LEFT_EARLY" && "border-2 border-orange-400"
                                        )}>
                                            <Image src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar || student.id}`} alt={student.name} width={32} height={32} className="w-full h-full" unoptimized />
                                            {student.attendance === "ABSENT" && <div className="absolute inset-0 bg-red-500/10" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "font-semibold text-slate-700 truncate",
                                                    student.attendance === "ABSENT" && "text-slate-400 line-through decoration-red-400/50"
                                                )}>
                                                    {student.name}
                                                </span>
                                                {isAttendanceMode && student.attendance !== "PRESENT" && (
                                                    <span className={cn(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded-md text-white uppercase tracking-tighter",
                                                        student.attendance === "ABSENT" && "bg-red-500",
                                                        student.attendance === "LATE" && "bg-yellow-500",
                                                        student.attendance === "LEFT_EARLY" && "bg-orange-500"
                                                    )}>
                                                        {student.attendance === "ABSENT" ? t("absent") : student.attendance === "LATE" ? t("late") : t("leftEarly")}
                                                    </span>
                                                )}
                                            </div>
                                            {student.nickname && (
                                                <span className="text-[10px] text-slate-400 italic truncate font-medium">({student.nickname})</span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r">
                                    {(() => {
                                        const rank = getRankEntry(calculateTotalAcademicPoints(student.id), levelConfig as LevelConfigInput);
                                        return (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                                                    {(rank.icon?.startsWith('data:image') || rank.icon?.startsWith('http')) ? (
                                                        <Image src={rank.icon} alt={rank.name} width={32} height={32} className="w-full h-full object-contain" unoptimized />
                                                    ) : (
                                                        <span className="text-xl">{rank.icon ?? "⭐"}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    {rank.name}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell className="text-center font-bold text-emerald-600 border-r bg-emerald-50/30">
                                    {student.points}
                                </TableCell>
                                <TableCell className="text-center font-bold text-blue-600 border-r bg-blue-50/30">
                                    {calculateTotalAcademicPoints(student.id)}
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
                                                    calculateChecklistScore(scores[student.id]?.[a.id] ?? 0, a.checklists ?? []) === a.maxScore
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {calculateChecklistScore(scores[student.id]?.[a.id] ?? 0, a.checklists ?? [])} / {a.maxScore} คะแนน
                                                </span>
                                                {/* Checkbox grid */}
                                                <div className="flex flex-wrap gap-1 justify-center max-w-[140px]">
                                                    {(a.checklists ?? []).map((item, i) => {
                                                        const bitmask = scores[student.id]?.[a.id] ?? 0;
                                                        const isChecked = (bitmask & (1 << i)) !== 0;
                                                        const saving = savingChecklist === `${student.id}-${a.id}`;
                                                        const itemText = typeof item === 'object' ? item.text : item;
                                                        return (
                                                            <button
                                                                key={i}
                                                                title={itemText}
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
