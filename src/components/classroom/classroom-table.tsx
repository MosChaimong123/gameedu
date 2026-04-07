"use client";

import { Assignment } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getRankEntry, type LevelConfigInput } from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    assignmentTypeBadgeClassName,
    dbAssignmentTypeToFormType,
} from "@/lib/assignment-type";
import { assignmentFormTypeLabel } from "@/lib/assignment-form-type-label";
import { formatDeadlineDisplayTh, isAssignmentDeadlinePast } from "@/lib/datetime-local";
import { shouldFlagIntegrityForTeacher } from "@/lib/quiz-integrity";
import { checklistCheckedScore } from "@/lib/academic-score";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";

type ChecklistItem = string | { text?: string; points?: number };

export type AssignmentWithChecklist = Assignment & {
    checklists?: ChecklistItem[] | null;
};

type StudentScoreMap = Record<string, Record<string, number>>;

type StudentWithSubmissions = ClassroomDashboardViewModel["students"][number];

interface ClassroomTableProps {
    classId: string;
    students: StudentWithSubmissions[];
    assignments: AssignmentWithChecklist[];
    levelConfig: unknown;
    isAttendanceMode?: boolean;
    onStudentClick?: (student: StudentWithSubmissions) => void;
    /** Scroll to and briefly highlight this assignment (desktop column or mobile card block). */
    highlightAssignmentId?: string | null;
}

export function ClassroomTable({ 
    classId, 
    students, 
    assignments, 
    levelConfig, 
    isAttendanceMode = false,
    onStudentClick,
    highlightAssignmentId = null,
}: ClassroomTableProps) {
    const { t } = useLanguage();

    useEffect(() => {
        if (!highlightAssignmentId) return;
        const desktop = document.getElementById(`assignment-col-${highlightAssignmentId}`);
        const mobile = document.querySelector(`[data-assignment-anchor="${highlightAssignmentId}"]`);
        const el = desktop ?? mobile;
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        el.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
        const timer = window.setTimeout(() => {
            el.classList.remove("ring-2", "ring-indigo-500", "ring-offset-2");
        }, 2800);
        return () => window.clearTimeout(timer);
    }, [highlightAssignmentId]);
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
            // student.behaviorPoints tracks behavior (skill) points only.
            // Academic scores are stored in submissions, computed separately.
        } catch {
            toast({
                title: t("toastAcademicScoreSaveFailedTitle"),
                description: t("toastAcademicScoreSaveFailedDesc"),
                variant: "destructive",
            });
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
            toast({
                title: t("toastChecklistSaveFailedTitle"),
                description: t("toastChecklistSaveFailedDesc"),
                variant: "destructive",
            });
            setScores(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], [assignment.id]: originalScore }
            }));
        } finally {
            setSavingChecklist(null);
        }
    };

    // Helper: calculate total academic points for a student from the reactive scores state
    const calculateTotalAcademicPoints = (studentId: string) => {
        return assignments.reduce((sum, a) => {
            const score = scores[studentId]?.[a.id] ?? 0;
            if (dbAssignmentTypeToFormType(a.type) === "checklist") {
                return sum + checklistCheckedScore(score, a.checklists ?? []);
            }
            return sum + score;
        }, 0);
    };

    const renderRankBlock = (studentId: string) => {
        const rank = getRankEntry(calculateTotalAcademicPoints(studentId), levelConfig as LevelConfigInput);
        return (
            <div className="flex flex-col items-center gap-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    {(rank.icon?.startsWith('data:image') || rank.icon?.startsWith('http')) ? (
                        <Image src={rank.icon} alt={rank.name} width={32} height={32} className="h-full w-full object-contain" unoptimized />
                    ) : (
                        <span className="text-xl">{rank.icon ?? "⭐"}</span>
                    )}
                </div>
                <span className="whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600">
                    {rank.name}
                </span>
            </div>
        );
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
            {/* Mobile: stacked cards (touch-friendly) */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 md:hidden">
                {sortedStudents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">{t("noStudentsYet")}</div>
                ) : (
                    sortedStudents.map((student, index) => (
                        <div
                            key={student.id}
                            role={isAttendanceMode ? "button" : undefined}
                            tabIndex={isAttendanceMode ? 0 : undefined}
                            onClick={() => isAttendanceMode && onStudentClick?.(student)}
                            onKeyDown={(e) => {
                                if (isAttendanceMode && (e.key === "Enter" || e.key === " ")) {
                                    e.preventDefault();
                                    onStudentClick?.(student);
                                }
                            }}
                            className={cn(
                                "space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm",
                                isAttendanceMode && "cursor-pointer touch-manipulation active:scale-[0.99] active:bg-indigo-50"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-black text-indigo-700">
                                    {(student.order ?? index) + 1}
                                </div>
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <div className={cn(
                                        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100",
                                        student.attendance === "ABSENT" && "opacity-50 grayscale",
                                        student.attendance === "LATE" && "border-2 border-yellow-400",
                                        student.attendance === "LEFT_EARLY" && "border-2 border-orange-400"
                                    )}>
                                        <Image src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar || student.id}`} alt={student.name} width={44} height={44} className="h-full w-full" unoptimized />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={cn(
                                            "truncate font-bold text-slate-800",
                                            student.attendance === "ABSENT" && "text-slate-400 line-through"
                                        )}>
                                            {student.name}
                                        </p>
                                        {student.nickname && (
                                            <p className="truncate text-xs italic text-slate-500">({student.nickname})</p>
                                        )}
                                        {isAttendanceMode && student.attendance !== "PRESENT" && (
                                            <span className={cn(
                                                "mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase text-white",
                                                student.attendance === "ABSENT" && "bg-red-500",
                                                student.attendance === "LATE" && "bg-yellow-500",
                                                student.attendance === "LEFT_EARLY" && "bg-orange-500"
                                            )}>
                                                {student.attendance === "ABSENT" ? t("absent") : student.attendance === "LATE" ? t("late") : t("leftEarly")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0">{renderRankBlock(student.id)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/90 p-3">
                                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{t("classroomTableBehaviorShort")}</p>
                                    <p className="text-xl font-black text-emerald-600">{student.behaviorPoints}</p>
                                </div>
                                <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{t("academicPointsColumnLabel")}</p>
                                    <p className="text-xl font-black text-blue-600">{calculateTotalAcademicPoints(student.id)}</p>
                                </div>
                            </div>

                            {assignments.length > 0 && (
                                <div className="space-y-3 border-t border-slate-200/80 pt-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("classroomTableMissionsSection")}</p>
                                    {assignments.map((a) => {
                                        const formType = dbAssignmentTypeToFormType(a.type);
                                        const dl = formatDeadlineDisplayTh(a.deadline);
                                        const dlPast = isAssignmentDeadlinePast(a.deadline);
                                        return (
                                        <div
                                            key={a.id}
                                            data-assignment-anchor={a.id}
                                            className="rounded-xl border border-slate-200 bg-white p-3"
                                        >
                                            <p className="mb-1 font-semibold text-slate-800">{a.name}</p>
                                            <div className="mb-2 flex flex-wrap items-center gap-1">
                                                <span
                                                    className={cn(
                                                        "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                                                        assignmentTypeBadgeClassName(formType)
                                                    )}
                                                >
                                                    {assignmentFormTypeLabel(t, formType)}
                                                </span>
                                                {dl ? (
                                                    <span
                                                        className={cn(
                                                            "text-[10px] font-bold",
                                                            dlPast ? "text-red-600" : "text-amber-700"
                                                        )}
                                                    >
                                                        {t("classroomTableDuePrefix")} {dl}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {a.description?.trim() ? (
                                                <p className="mb-2 line-clamp-2 text-[11px] font-medium text-slate-500">
                                                    {a.description.trim()}
                                                </p>
                                            ) : null}
                                            {formType === "score" && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs text-slate-500">{t("maxScore", { score: a.maxScore })}</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={a.maxScore}
                                                        className={cn(
                                                            "h-11 min-h-[44px] max-w-[8rem] text-center text-base font-semibold touch-manipulation",
                                                            (scores[student.id]?.[a.id] ?? 0) > a.maxScore && "border-red-500 ring-red-500"
                                                        )}
                                                        value={scores[student.id]?.[a.id] ?? ""}
                                                        onChange={(e) => handleScoreChange(student.id, a.id, e.target.value, a.maxScore)}
                                                        onBlur={() => handleBlur(student.id, a.id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") e.currentTarget.blur();
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {formType === "checklist" && (
                                                <div className="space-y-2">
                                                    <span className={cn(
                                                        "inline-block rounded-full px-2 py-0.5 text-xs font-bold",
                                                        checklistCheckedScore(scores[student.id]?.[a.id] ?? 0, a.checklists ?? []) === a.maxScore
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-slate-100 text-slate-600"
                                                    )}>
                                                        {t("classroomTableChecklistScoreDisplay", {
                                                            current: checklistCheckedScore(scores[student.id]?.[a.id] ?? 0, a.checklists ?? []),
                                                            max: a.maxScore,
                                                        })}
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(a.checklists ?? []).map((item, i) => {
                                                            const bitmask = scores[student.id]?.[a.id] ?? 0;
                                                            const isChecked = (bitmask & (1 << i)) !== 0;
                                                            const saving = savingChecklist === `${student.id}-${a.id}`;
                                                            const itemText = typeof item === "object" ? item.text : item;
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    title={itemText}
                                                                    disabled={saving}
                                                                    onClick={() => handleChecklistToggle(student.id, a, i)}
                                                                    className={cn(
                                                                        "flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 transition-all touch-manipulation",
                                                                        isChecked
                                                                            ? "border-emerald-600 bg-emerald-500 text-white shadow-sm"
                                                                            : "border-slate-200 bg-white text-transparent hover:border-emerald-300 hover:bg-emerald-50",
                                                                        saving && "cursor-wait opacity-50"
                                                                    )}
                                                                >
                                                                    <Check className="h-5 w-5 stroke-[3]" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {formType === "quiz" && (
                                                <div className="space-y-1 text-center">
                                                    {(() => {
                                                        const sub = student.submissions.find(
                                                            (s) => s.assignmentId === a.id
                                                        );
                                                        const flagged =
                                                            sub &&
                                                            shouldFlagIntegrityForTeacher(sub.cheatingLogs);
                                                        return sub ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <p className="text-sm font-black text-indigo-600">
                                                                    {t("classroomTableQuizScoreDisplay", { current: sub.score, max: a.maxScore })}
                                                                </p>
                                                                {flagged ? (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900"
                                                                        title={t("classroomTableIntegrityTooltip")}
                                                                    >
                                                                        <AlertTriangle className="h-3 w-3 shrink-0" />
                                                                        {t("classroomTableIntegrityShort")}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] font-semibold text-slate-400">
                                                                {t("classroomTableNotSubmitted")}
                                                            </p>
                                                        );
                                                    })()}
                                                    <p className="text-[10px] text-slate-500">
                                                        {t("classroomTableQuizSubmitHint")}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
                {sortedStudents.length > 0 && assignments.length === 0 && (
                    <p className="rounded-xl border border-amber-100 bg-amber-50/50 py-6 text-center text-sm text-amber-900/80">{t("noAssignmentsYet")}</p>
                )}
            </div>

            {/* Desktop: wide table + horizontal scroll */}
            <div className="hidden min-h-0 flex-1 flex-col md:flex">
                <div className="h-full min-h-0 flex-1 overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[60px] text-center border-r">#</TableHead>
                            <TableHead className="w-[180px] border-r">{t("studentName")}</TableHead>
                            <TableHead className="text-center w-[100px] border-r">{t("totalRank")}</TableHead>
                            <TableHead className="text-center w-[100px] border-r bg-emerald-50 text-emerald-700">{t("classroomTableBehaviorShort")}</TableHead>
                            <TableHead className="text-center w-[100px] border-r bg-blue-50 text-blue-700">{t("academicPointsColumnLabel")}</TableHead>
                            {assignments.map((a) => {
                                const formType = dbAssignmentTypeToFormType(a.type);
                                const dl = formatDeadlineDisplayTh(a.deadline);
                                const dlPast = isAssignmentDeadlinePast(a.deadline);
                                return (
                                <TableHead
                                    key={a.id}
                                    id={`assignment-col-${a.id}`}
                                    className={`text-center border-r ${formType === "checklist" ? "min-w-[160px]" : "min-w-[100px]"}`}
                                >
                                    <div className="flex flex-col items-center gap-0.5 px-0.5">
                                        <span className="font-bold text-slate-800 leading-tight">{a.name}</span>
                                        {formType === "checklist" ? (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                                                {t("classroomTableChecklistHeader", {
                                                    points: a.maxScore,
                                                    items: Array.isArray(a.checklists) ? a.checklists.length : 0,
                                                })}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-400">{t("maxScore", { score: a.maxScore })}</span>
                                        )}
                                        <span
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-wide rounded-full border px-1.5 py-0.5",
                                                assignmentTypeBadgeClassName(formType)
                                            )}
                                        >
                                            {assignmentFormTypeLabel(t, formType)}
                                        </span>
                                        {dl ? (
                                            <span
                                                className={cn(
                                                    "text-[9px] font-bold leading-tight text-center",
                                                    dlPast ? "text-red-600" : "text-amber-800"
                                                )}
                                            >
                                                {t("classroomTableDuePrefix")} {dl}
                                            </span>
                                        ) : null}
                                    </div>
                                </TableHead>
                                );
                            })}
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
                                    {renderRankBlock(student.id)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-emerald-600 border-r bg-emerald-50/30">
                                    {student.behaviorPoints}
                                </TableCell>
                                <TableCell className="text-center font-bold text-blue-600 border-r bg-blue-50/30">
                                    {calculateTotalAcademicPoints(student.id)}
                                </TableCell>
                                {assignments.map((a) => (
                                    <TableCell key={a.id} className="text-center p-1 border-r">
                                        {dbAssignmentTypeToFormType(a.type) === "score" && (
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
                                        {dbAssignmentTypeToFormType(a.type) === "checklist" && (
                                            <div className="flex flex-col items-center gap-1.5 py-1 px-2">
                                                {/* Summary badge */}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    checklistCheckedScore(scores[student.id]?.[a.id] ?? 0, a.checklists ?? []) === a.maxScore
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {t("classroomTableChecklistScoreDisplay", {
                                                        current: checklistCheckedScore(scores[student.id]?.[a.id] ?? 0, a.checklists ?? []),
                                                        max: a.maxScore,
                                                    })}
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
                                        {dbAssignmentTypeToFormType(a.type) === "quiz" && (
                                            (() => {
                                                const sub = student.submissions.find(
                                                    (s) => s.assignmentId === a.id
                                                );
                                                const flagged =
                                                    sub &&
                                                    shouldFlagIntegrityForTeacher(sub.cheatingLogs);
                                                return (
                                                    <div className="flex flex-col items-center gap-0.5 px-1 py-0.5">
                                                        {sub ? (
                                                            <>
                                                                <span className="flex items-center gap-0.5">
                                                                    <span className="text-sm font-black text-indigo-600">
                                                                        {sub.score}
                                                                    </span>
                                                                    {flagged ? (
                                                                        <span title={t("classroomTableIntegrityTooltip")}>
                                                                            <AlertTriangle
                                                                                className="h-3.5 w-3.5 text-amber-600"
                                                                                aria-label={t("classroomTableIntegrityShort")}
                                                                            />
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400">
                                                                    / {a.maxScore}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-slate-400">
                                                                {t("classroomTableNotSubmitted")}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()
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
        </div>
    );
}
