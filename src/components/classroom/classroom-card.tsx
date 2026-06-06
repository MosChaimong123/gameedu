"use client";

import Image from "next/image";
import Link from "next/link";
import { Classroom } from "@prisma/client";
import { ArrowRight, Bell, Link2, MessageCircleMore, Users } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import { ClassroomDuplicateButton } from "./classroom-duplicate-button";
import { ClassroomManagementButton } from "./classroom-management-button";

export type ClassroomLineReadiness = {
    groupCount: number;
    linkedStudentCount: number;
    studentCount: number;
    lastReminderSentAt: Date | string | null;
    lastReminderTargetCount: number | null;
    lastReminderType: string | null;
};

interface ClassroomCardProps {
    classroom: Classroom & { _count?: { students: number } };
    studentCount?: number;
    lineReadiness?: ClassroomLineReadiness;
}

function formatLastReminder(value: Date | string | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("th-TH", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}

function getLineReadinessLabel(args: {
    groupCount: number;
    linkedStudentCount: number;
    studentCount: number;
}) {
    if (args.groupCount <= 0) {
        return {
            label: "ยังไม่ผูก LINE",
            helper: "กดเข้าห้องเพื่อผูกกลุ่ม LINE",
            className: "border-amber-200 bg-amber-50 text-amber-800",
            iconClassName: "text-amber-600",
        };
    }
    if (args.studentCount > 0 && args.linkedStudentCount <= 0) {
        return {
            label: "ผูกกลุ่มแล้ว",
            helper: "รอนักเรียนเชื่อม LINE ส่วนตัว",
            className: "border-sky-200 bg-sky-50 text-sky-800",
            iconClassName: "text-sky-600",
        };
    }
    if (args.studentCount > 0 && args.linkedStudentCount < args.studentCount) {
        return {
            label: "LINE พร้อมบางส่วน",
            helper: "ยังมีนักเรียนที่ยังไม่เชื่อม LINE",
            className: "border-indigo-200 bg-indigo-50 text-indigo-800",
            iconClassName: "text-indigo-600",
        };
    }
    return {
        label: "LINE พร้อมใช้",
        helper: "กลุ่มและนักเรียนพร้อมรับงาน",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
        iconClassName: "text-emerald-600",
    };
}

export function ClassroomCard({ classroom, studentCount, lineReadiness }: ClassroomCardProps) {
    const { t } = useLanguage();
    const { id, name, grade, emoji, theme, image } = classroom;
    const count = studentCount ?? classroom._count?.students ?? 0;
    const icon = emoji || image || "🏫";
    const readiness = lineReadiness ? getLineReadinessLabel(lineReadiness) : null;
    const linkedPercent =
        lineReadiness && lineReadiness.studentCount > 0
            ? Math.round((lineReadiness.linkedStudentCount / lineReadiness.studentCount) * 100)
            : 0;
    const lastReminderLabel = formatLastReminder(lineReadiness?.lastReminderSentAt ?? null);

    return (
        <div className="group relative">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <ClassroomDuplicateButton classId={id} name={name} />
                <ClassroomManagementButton classId={id} name={name} theme={theme} />
            </div>

            <Link href={`/dashboard/classrooms/${id}`} className="block">
                <div className="cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div
                        className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${getThemeBgClass(theme)}`}
                        style={getThemeBgStyle(theme)}
                    >
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                        <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-black/10" />

                        {grade && (
                            <div className="z-10 text-center">
                                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                                    {t("classroomGradeLabel")}
                                </p>
                                <p className="text-3xl font-black text-white drop-shadow-sm">{grade}</p>
                            </div>
                        )}

                        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                            <Users className="h-3 w-3" />
                            {count}
                        </div>
                    </div>

                    <div className="relative px-5 pt-0">
                        <div
                            className={`-mt-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br text-2xl shadow-lg ${getThemeBgClass(theme)}`}
                            style={getThemeBgStyle(theme)}
                        >
                            {icon.startsWith("data:image") || icon.startsWith("http") ? (
                                <Image
                                    src={icon}
                                    alt={t("classroomIconAlt")}
                                    fill
                                    sizes="56px"
                                    unoptimized
                                    className="object-cover"
                                />
                            ) : (
                                <span>{icon}</span>
                            )}
                        </div>
                    </div>

                    <div className="px-5 pb-5 pt-3">
                        <h3 className="truncate text-2xl font-black leading-tight text-slate-800 transition-colors group-hover:text-indigo-600">
                            {name}
                        </h3>

                        {lineReadiness && readiness ? (
                            <div className={`mt-3 rounded-2xl border px-3 py-3 text-xs font-bold ${readiness.className}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <MessageCircleMore className={`h-4 w-4 shrink-0 ${readiness.iconClassName}`} />
                                        <div className="min-w-0">
                                            <p className="truncate">{readiness.label}</p>
                                            <p className="mt-0.5 text-[11px] font-semibold opacity-80">
                                                {lineReadiness.groupCount > 0
                                                    ? `${lineReadiness.groupCount} กลุ่ม · นักเรียน ${lineReadiness.linkedStudentCount}/${lineReadiness.studentCount} คน`
                                                    : readiness.helper}
                                            </p>
                                        </div>
                                    </div>
                                    {lineReadiness.groupCount > 0 ? (
                                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-black">
                                            {linkedPercent}%
                                        </span>
                                    ) : null}
                                </div>

                                {lineReadiness.groupCount > 0 ? (
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
                                        <div
                                            className="h-full rounded-full bg-current opacity-70"
                                            style={{ width: `${Math.min(100, Math.max(0, linkedPercent))}%` }}
                                        />
                                    </div>
                                ) : null}

                                {lastReminderLabel ? (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold opacity-85">
                                        <Bell className="h-3 w-3" />
                                        เตือนล่าสุด {lastReminderLabel}
                                        {lineReadiness.lastReminderTargetCount !== null
                                            ? ` · ${lineReadiness.lastReminderTargetCount} คน`
                                            : ""}
                                    </p>
                                ) : lineReadiness.groupCount > 0 ? (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold opacity-85">
                                        <Link2 className="h-3 w-3" />
                                        ยังไม่มีประวัติส่งเตือน LINE
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div
                            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-bold text-white transition-all group-hover:shadow-md ${getThemeBgClass(theme)}`}
                            style={getThemeBgStyle(theme)}
                        >
                            {t("classroomOpenRoom")}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
