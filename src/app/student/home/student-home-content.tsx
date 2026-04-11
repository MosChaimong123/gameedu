"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, ClipboardList, PlayCircle, Star, Trophy } from "lucide-react";
import { JoinClassDialog } from "@/components/student/join-class-dialog";
import { getThemeBgStyle } from "@/lib/classroom-utils";
import {
    assignmentTypeBadgeClassName,
    dbAssignmentTypeToFormType,
} from "@/lib/assignment-type";
import { useLanguage } from "@/components/providers/language-provider";
import { assignmentFormTypeLabel } from "@/lib/assignment-form-type-label";
import { LanguageToggle } from "@/components/language-toggle";

export type StudentHomeSerializableAssignment = {
    id: string;
    name: string;
    maxScore: number;
    type: string;
    description?: string | null;
    deadline?: string | null;
};

export type StudentHomeSerializableRecord = {
    id: string;
    loginCode: string;
    behaviorPoints: number;
    classroom: {
        id: string;
        name: string;
        emoji: string | null;
        theme: string | null;
        teacherName: string | null;
        assignments: StudentHomeSerializableAssignment[];
    };
    submissions: { assignmentId: string; score: number | null }[];
    history: { id: string; reason: string; value: number }[];
};

export function StudentHomeContent({
    userName,
    userImage,
    studentRecords,
}: {
    userName: string | null;
    userImage: string | null;
    studentRecords: StudentHomeSerializableRecord[];
}) {
    const { t, language } = useLanguage();
    const dateLocale = language === "th" ? "th-TH" : "en-US";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 p-4 shadow-xl shadow-indigo-200/30 sm:p-6">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/20 text-3xl shadow-inner">
                            {userImage ? (
                                <Image
                                    src={userImage}
                                    alt={userName || ""}
                                    width={56}
                                    height={56}
                                    unoptimized
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                "🎮"
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-white/70">{t("welcomeBack")}</p>
                            <h1 className="text-2xl font-black text-white">{userName?.trim() || t("studentHomeDefaultName")}</h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <LanguageToggle className="border-white/50 bg-white/15 text-white hover:bg-white/25 hover:text-white" />
                        <JoinClassDialog />
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-indigo-200">
                    <div>
                        <h2 className="mb-1 text-xl font-black">{t("studentHomeJoinGameTitle")}</h2>
                        <p className="text-sm text-white/70">{t("studentHomeJoinGameSubtitle")}</p>
                    </div>
                    <Link
                        href="/play"
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-600 shadow-lg transition-all hover:shadow-xl active:scale-95"
                    >
                        {t("studentHomeJoinGameCta")}
                    </Link>
                </div>

                {studentRecords.length === 0 ? (
                    <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-md">
                        <Star className="mx-auto mb-4 h-16 w-16 text-slate-200" />
                        <h2 className="mb-2 text-xl font-bold text-slate-700">{t("studentHomeNoClassTitle")}</h2>
                        <p className="text-sm text-slate-400">{t("studentHomeNoClassDesc")}</p>
                    </div>
                ) : (
                    studentRecords.map((record) => {
                        const submissionMap = new Map(record.submissions.map((s) => [s.assignmentId, s]));
                        const pendingAssignments = record.classroom.assignments.filter((a) => !submissionMap.has(a.id));
                        const theme = record.classroom.theme || "from-indigo-500 to-purple-600";
                        const isCustom = theme.startsWith("custom:");
                        const themeClass = isCustom ? "" : `bg-gradient-to-br ${theme}`;
                        const themeStyle = isCustom ? getThemeBgStyle(theme) : {};

                        return (
                            <div key={record.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md">
                                <div
                                    className={`flex items-center justify-between px-6 py-4 text-white ${themeClass}`}
                                    style={themeStyle}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{record.classroom.emoji || "🏫"}</span>
                                        <div>
                                            <p className="text-lg font-black">{record.classroom.name}</p>
                                            <p className="text-xs text-white/70">
                                                {t("studentHomeTeacherLabel")}{" "}
                                                {record.classroom.teacherName ?? t("studentHomeTeacherUnknown")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black">{record.behaviorPoints}</p>
                                        <p className="text-xs text-white/70">{t("studentHomeBehaviorPointsShort")}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 p-5">
                                    {pendingAssignments.length > 0 && (
                                        <div>
                                            <p className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-600">
                                                <BookOpen className="h-4 w-4 text-purple-500" /> {t("studentHomePendingWorkTitle")}
                                            </p>
                                            <div className="space-y-2">
                                                {pendingAssignments.slice(0, 3).map((a) => {
                                                    const formType = dbAssignmentTypeToFormType(a.type);
                                                    const isQuiz = formType === "quiz";
                                                    const deadlinePast =
                                                        a.deadline != null && new Date(a.deadline) < new Date();
                                                    const canOpenQuiz = isQuiz && !deadlinePast;
                                                    const href = canOpenQuiz
                                                        ? `/student/${record.loginCode}/quiz/${a.id}`
                                                        : `/student/${record.loginCode}`;
                                                    return (
                                                        <Link
                                                            key={a.id}
                                                            href={href}
                                                            className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 p-3 transition-colors hover:bg-purple-100"
                                                        >
                                                            <div className="min-w-0 flex-1 pr-2">
                                                                <div className="flex flex-wrap items-center gap-1.5 gap-y-1">
                                                                    <p className="truncate text-sm font-semibold text-slate-800">{a.name}</p>
                                                                    <span
                                                                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${assignmentTypeBadgeClassName(formType)}`}
                                                                    >
                                                                        {assignmentFormTypeLabel(t, formType)}
                                                                    </span>
                                                                </div>
                                                                {a.description?.trim() ? (
                                                                    <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-500">
                                                                        {a.description.trim()}
                                                                    </p>
                                                                ) : null}
                                                                {a.deadline ? (
                                                                    <p
                                                                        className={`mt-0.5 text-[10px] font-medium ${new Date(a.deadline) < new Date() ? "text-red-500" : "text-orange-500"}`}
                                                                    >
                                                                        {t("studentHomeDueLabel")}{" "}
                                                                        {new Date(a.deadline).toLocaleDateString(dateLocale)}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-400">
                                                                    {t("maxScore", { score: a.maxScore })}
                                                                </span>
                                                                {isQuiz ? (
                                                                    <PlayCircle className="h-5 w-5 text-purple-500" />
                                                                ) : (
                                                                    <ClipboardList className="h-5 w-5 text-purple-500" />
                                                                )}
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {record.history.length > 0 && (
                                        <div>
                                            <p className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-600">
                                                <Trophy className="h-4 w-4 text-amber-500" /> {t("studentHomeRecentBehavior")}
                                            </p>
                                            <div className="space-y-1.5">
                                                {record.history.slice(0, 3).map((h) => (
                                                    <div key={h.id} className="flex items-center justify-between px-1 text-sm">
                                                        <span className="text-xs text-slate-600">{h.reason}</span>
                                                        <span
                                                            className={`text-sm font-bold ${h.value > 0 ? "text-green-600" : "text-red-500"}`}
                                                        >
                                                            {h.value > 0 ? "+" : ""}
                                                            {h.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Link
                                        href={`/student/${record.loginCode}`}
                                        className="block w-full rounded-xl border border-dashed border-slate-200 py-1 text-center text-xs font-bold text-slate-400 transition-colors hover:border-purple-200 hover:text-purple-600"
                                    >
                                        {t("studentHomeOpenProfile")}
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
