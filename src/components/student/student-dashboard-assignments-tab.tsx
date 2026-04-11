"use client";

import Link from "next/link";
import {
    BookOpen,
    CheckCircle2,
    CheckSquare,
    Clock,
    Filter,
    LayoutDashboard,
    SortAsc,
    Star,
} from "lucide-react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { assignmentFormTypeLabel } from "@/lib/assignment-form-type-label";
import {
    assignmentTypeBadgeClassName,
    dbAssignmentTypeToFormType,
} from "@/lib/assignment-type";
import {
    checklistCheckedCount,
    checklistCheckedScore,
} from "@/lib/academic-score";
import { cn } from "@/lib/utils";
import type {
    ClassroomRecord,
    StudentDashboardTranslateFn,
    SubmissionRecord,
} from "@/lib/services/student-dashboard/student-dashboard.types";

interface StudentDashboardAssignmentsTabProps {
    t: StudentDashboardTranslateFn;
    classroom: ClassroomRecord;
    code: string;
    submissions: SubmissionRecord[];
    assignmentFilter: "all" | "pending" | "completed";
    assignmentSort: "default" | "deadline";
    dateLocale: Locale;
    onAssignmentFilterChange: (value: "all" | "pending" | "completed") => void;
    onAssignmentSortToggle: () => void;
}

export function StudentDashboardAssignmentsTab({
    t,
    classroom,
    code,
    submissions,
    assignmentFilter,
    assignmentSort,
    dateLocale,
    onAssignmentFilterChange,
    onAssignmentSortToggle,
}: StudentDashboardAssignmentsTabProps) {
    const submissionMap = new Map<string, SubmissionRecord>(
        submissions.map((submission) => [submission.assignmentId, submission])
    );

    const visible = classroom.assignments?.filter((assignment) => assignment.visible !== false) ?? [];
    const withMeta = visible.map((assignment) => {
        const submission = submissionMap.get(assignment.id);
        const formType = dbAssignmentTypeToFormType(assignment.type);
        const isChecklist = formType === "checklist";
        const deadlineAt = assignment.deadline ? new Date(assignment.deadline) : null;
        const deadlineValid = deadlineAt !== null && !Number.isNaN(deadlineAt.getTime());
        const maxScore = isChecklist
            ? assignment.checklists?.reduce(
                  (sum: number, item) => sum + (typeof item === "object" ? item.points || 1 : 1),
                  0
              ) || 1
            : assignment.maxScore || 100;
        const checklistItems = assignment.checklists ?? [];
        const score = submission
            ? isChecklist
                ? checklistCheckedScore(submission.score, checklistItems)
                : submission.score
            : 0;
        const progressValue = isChecklist
            ? checklistCheckedCount(submission?.score || 0, checklistItems)
            : score;
        const maxValue = isChecklist ? assignment.checklists?.length || 1 : maxScore;
        const isCompleted = Boolean(
            submission &&
                (isChecklist
                    ? progressValue >= (assignment.passScore || maxValue * 0.5)
                    : score >= (assignment.passScore || maxScore * 0.5))
        );

        return {
            assignment,
            submission,
            formType,
            isChecklist,
            isQuiz: formType === "quiz",
            deadlineAt,
            deadlineValid,
            isDeadlinePast: Boolean(deadlineValid && deadlineAt! < new Date()),
            progressValue,
            maxValue,
            progress: (progressValue / maxValue) * 100,
            isCompleted,
        };
    });

    const filtered = withMeta.filter((item) =>
        assignmentFilter === "all"
            ? true
            : assignmentFilter === "completed"
              ? item.isCompleted
              : !item.isCompleted
    );

    const sorted =
        assignmentSort === "deadline"
            ? [...filtered].sort((a, b) => {
                  if (!a.deadlineAt && !b.deadlineAt) return 0;
                  if (!a.deadlineAt) return 1;
                  if (!b.deadlineAt) return -1;
                  return a.deadlineAt.getTime() - b.deadlineAt.getTime();
              })
            : filtered;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                    <LayoutDashboard className="h-5 w-5 text-indigo-500" />
                    {t("studentDashAssignmentsHeading")}
                </h3>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white/70 p-1 text-xs font-black">
                        <Filter className="ml-1 h-3 w-3 text-slate-400" />
                        {(["all", "pending", "completed"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => onAssignmentFilterChange(filter)}
                                className={`rounded-lg px-2.5 py-1 transition-all ${
                                    assignmentFilter === filter
                                        ? "bg-indigo-500 text-white shadow-sm"
                                        : "text-slate-500 hover:bg-slate-100"
                                }`}
                            >
                                {filter === "all"
                                    ? t("filterAssignmentsAll")
                                    : filter === "pending"
                                      ? t("filterAssignmentsPending")
                                      : t("filterAssignmentsDone")}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onAssignmentSortToggle}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-black transition-all ${
                            assignmentSort === "deadline"
                                ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                                : "border-slate-200 bg-white/70 text-slate-500 hover:bg-slate-50"
                        }`}
                        title={t("sortByDeadlineTitle")}
                    >
                        <SortAsc className="h-3 w-3" />
                        <span className="hidden sm:inline">{t("sortDeadlineToggle")}</span>
                    </button>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white/40 py-16 text-center">
                    <LayoutDashboard className="h-10 w-10 text-slate-200" />
                    <p className="font-black text-slate-400">
                        {assignmentFilter === "all"
                            ? t("studentDashNoAssignmentsAll")
                            : assignmentFilter === "pending"
                              ? t("studentDashNoAssignmentsPending")
                              : t("studentDashNoAssignmentsDone")}
                    </p>
                    {assignmentFilter !== "all" && (
                        <button
                            onClick={() => onAssignmentFilterChange("all")}
                            className="text-xs font-bold text-indigo-500 underline"
                        >
                            {t("studentDashViewAllAssignments")}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {sorted.map(
                        ({
                            assignment,
                            submission,
                            formType,
                            isChecklist,
                            isQuiz,
                            deadlineAt,
                            deadlineValid,
                            isDeadlinePast,
                            progressValue,
                            maxValue,
                            progress,
                            isCompleted,
                        }) => {
                            const iconBoxClass =
                                formType === "quiz"
                                    ? "bg-amber-50 text-amber-700"
                                    : formType === "checklist"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-blue-50 text-blue-600";
                            const TypeIcon =
                                formType === "quiz"
                                    ? BookOpen
                                    : formType === "checklist"
                                      ? CheckSquare
                                      : Star;

                            return (
                                <Card
                                    key={assignment.id}
                                    className="group overflow-hidden rounded-2xl border-white/60 bg-white/60 backdrop-blur-md transition-all hover:shadow-xl active:scale-[0.98]"
                                >
                                    <CardContent className="p-5">
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                                            <div
                                                className={`${iconBoxClass} rounded-xl p-2.5 transition-transform group-hover:scale-110`}
                                            >
                                                <TypeIcon className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase",
                                                        assignmentTypeBadgeClassName(formType)
                                                    )}
                                                >
                                                    {assignmentFormTypeLabel(t, formType)}
                                                </Badge>
                                                {isCompleted ? (
                                                    <Badge className="flex items-center gap-1 rounded-lg border-none bg-green-100 px-2 py-0.5 text-green-700">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        <span className="text-[10px] font-black uppercase">
                                                            {t("badgeStatusCompleted")}
                                                        </span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="flex items-center gap-1 rounded-lg border-slate-200 px-2 py-0.5 text-slate-400"
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        <span className="text-[10px] font-black uppercase">
                                                            {t("badgeStatusPending")}
                                                        </span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <h4 className="line-clamp-2 font-black text-slate-800">
                                                {assignment.name}
                                            </h4>
                                            {deadlineValid ? (
                                                <p
                                                    className={cn(
                                                        "mt-1 text-[10px] font-bold",
                                                        isDeadlinePast
                                                            ? "text-red-600"
                                                            : "text-slate-500"
                                                    )}
                                                >
                                                    {t("studentDashDueDatePrefix")}{" "}
                                                    {format(deadlineAt!, "d MMM yyyy HH:mm", {
                                                        locale: dateLocale,
                                                    })}
                                                </p>
                                            ) : null}
                                            {assignment.description?.trim() ? (
                                                <p className="mt-2 line-clamp-3 text-xs font-medium leading-relaxed text-slate-500">
                                                    {assignment.description.trim()}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                                                <span className="text-slate-400">
                                                    {t("studentDashProgressLabel")}
                                                </span>
                                                <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600">
                                                    {progressValue} / {maxValue}
                                                </span>
                                            </div>
                                            <Progress
                                                value={progress}
                                                className={`h-1.5 bg-slate-100 ${
                                                    isCompleted
                                                        ? "[&>div]:bg-green-500"
                                                        : "[&>div]:bg-indigo-500"
                                                }`}
                                            />
                                        </div>
                                        {isQuiz && !submission ? (
                                            <div className="mt-4">
                                                {isDeadlinePast ? (
                                                    <p className="text-center text-xs font-bold text-red-600">
                                                        {t("studentDashQuizClosed")}
                                                    </p>
                                                ) : (
                                                    <Button
                                                        asChild
                                                        className="h-11 w-full rounded-xl font-black shadow-md"
                                                    >
                                                        <Link href={`/student/${code}/quiz/${assignment.id}`}>
                                                            {t("studentDashTakeQuiz")}
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        ) : null}
                                        {isChecklist && assignment.checklists && (
                                            <div className="mt-4 space-y-2 border-t border-slate-100/50 pt-4">
                                                {assignment.checklists.map((item, index: number) => {
                                                    const isChecked = submission
                                                        ? (submission.score & (1 << index)) !== 0
                                                        : false;
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-2.5 group/item"
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "flex h-4 w-4 items-center justify-center rounded-md border transition-all duration-300",
                                                                    isChecked
                                                                        ? "border-green-500 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                                                                        : "border-slate-200 bg-white group-hover/item:border-indigo-300"
                                                                )}
                                                            >
                                                                {isChecked && (
                                                                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                                                )}
                                                            </div>
                                                            <span
                                                                className={cn(
                                                                    "text-[11px] font-bold transition-all",
                                                                    isChecked
                                                                        ? "text-slate-400 line-through decoration-slate-300"
                                                                        : "text-slate-600"
                                                                )}
                                                            >
                                                                {typeof item === "object" ? item.text : item}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
}
