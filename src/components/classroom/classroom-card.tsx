"use client";

import Image from "next/image";
import Link from "next/link";
import { Classroom } from "@prisma/client";
import { ArrowRight, Users } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import { ClassroomDuplicateButton } from "./classroom-duplicate-button";
import { ClassroomManagementButton } from "./classroom-management-button";

interface ClassroomCardProps {
    classroom: Classroom & { _count?: { students: number } };
    studentCount?: number;
}

export function ClassroomCard({ classroom, studentCount }: ClassroomCardProps) {
    const { t } = useLanguage();
    const { id, name, grade, emoji, theme, image } = classroom;
    const count = studentCount ?? classroom._count?.students ?? 0;
    const icon = emoji || image || "🏫";

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
