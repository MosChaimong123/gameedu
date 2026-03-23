"use client";

import { useState } from "react";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Classroom } from "@prisma/client";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import { ClassroomManagementButton } from "./classroom-management-button";
import { ClassroomDuplicateButton } from "./classroom-duplicate-button";

interface ClassroomCardProps {
    classroom: Classroom & { _count?: { students: number } };
    studentCount?: number;
}

export function ClassroomCard({ classroom, studentCount }: ClassroomCardProps) {
    const { id, name, grade, emoji, theme, image } = classroom;
    const count = studentCount ?? classroom._count?.students ?? 0;
    const icon = emoji || image || "🛡️";

    return (
        <div className="group relative">
            {/* Action Buttons */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <ClassroomDuplicateButton
                    classId={id}
                    name={name}
                />
                <ClassroomManagementButton
                    classId={id}
                    name={name}
                    theme={theme}
                />
            </div>

            <Link href={`/dashboard/classrooms/${id}`} className="block">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">

                {/* Colour banner */}
                <div 
                    className={`h-28 bg-gradient-to-br ${getThemeBgClass(theme)} relative overflow-hidden flex items-center justify-center`}
                    style={getThemeBgStyle(theme)}
                >
                    {/* Decorative circles */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-black/10 rounded-full" />

                    {/* Grade centered in banner */}
                    {grade && (
                        <div className="text-center z-10">
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">ระดับชั้น</p>
                            <p className="text-white text-3xl font-black drop-shadow-sm">{grade}</p>
                        </div>
                    )}

                    {/* Student count badge top-left */}
                    <div className="absolute top-3 left-3 bg-black/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {count}
                    </div>
                </div>

                {/* Icon badge */}
                <div className="px-5 pt-0 relative">
                    <div 
                        className={`-mt-6 w-14 h-14 rounded-2xl bg-gradient-to-br ${getThemeBgClass(theme)} shadow-lg flex items-center justify-center text-2xl border-4 border-white overflow-hidden`}
                        style={getThemeBgStyle(theme)}
                    >
                        {icon.startsWith('data:image') || icon.startsWith('http') ? (
                            <img src={icon} alt="Class Icon" className="w-full h-full object-cover" />
                        ) : (
                            <span>{icon}</span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="px-5 pt-3 pb-5">
                    <h3 className="text-2xl font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-tight">{name}</h3>

                    {/* Footer */}
                    <div 
                        className={`mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r ${getThemeBgClass(theme)} text-white text-sm font-bold flex items-center justify-center gap-2 group-hover:shadow-md transition-all`}
                        style={getThemeBgStyle(theme)}
                    >
                        เปิดห้องเรียน <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
                </div>
            </Link>
        </div>
    );
}
