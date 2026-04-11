"use client"

import { cn } from "@/lib/utils"
import { GraduationCap, School } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

interface RoleSelectionProps {
    onSelect: (role: "STUDENT" | "TEACHER") => void
    selected?: "STUDENT" | "TEACHER"
}

export function RoleSelection({ onSelect, selected }: RoleSelectionProps) {
    const { t } = useLanguage()

    return (
        <div className="grid grid-cols-2 gap-4">
            <button
                type="button"
                onClick={() => onSelect("STUDENT")}
                className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:scale-105",
                    selected === "STUDENT"
                        ? "border-green-500 bg-green-50 text-green-700 shadow-md"
                        : "border-slate-200 hover:border-green-200 hover:bg-slate-50 text-slate-600"
                )}
            >
                <GraduationCap className={cn("w-10 h-10 mb-3", selected === "STUDENT" ? "text-green-600" : "text-slate-400")} />
                <span className="font-bold">{t("signupRoleStudent")}</span>
                <span className="text-xs text-center mt-1 opacity-80">{t("roleSelectionStudentDescShort")}</span>
            </button>

            <button
                type="button"
                onClick={() => onSelect("TEACHER")}
                className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:scale-105",
                    selected === "TEACHER"
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-md"
                        : "border-slate-200 hover:border-purple-200 hover:bg-slate-50 text-slate-600"
                )}
            >
                <School className={cn("w-10 h-10 mb-3", selected === "TEACHER" ? "text-purple-600" : "text-slate-400")} />
                <span className="font-bold">{t("signupRoleTeacher")}</span>
                <span className="text-xs text-center mt-1 opacity-80">{t("roleSelectionTeacherDescShort")}</span>
            </button>
        </div>
    )
}
