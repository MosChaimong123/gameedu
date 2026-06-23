"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, ChevronDown, ChevronRight, Clock, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageBackLink } from "@/components/ui/page-back-link"
import { cn } from "@/lib/utils"
import { PHYSICS_CURRICULUM_CATALOG } from "@/lib/physics/curriculum"
import type { PhysicsGradeLevel, PhysicsSemester, PhysicsCurriculumUnit } from "@/lib/physics/curriculum"
import { getPhysicsLessonTemplatesByUnit } from "@/lib/physics/lesson-templates"

const GRADE_LABELS: Record<PhysicsGradeLevel, string> = {
    m4: "ม.4",
    m5: "ม.5",
    m6: "ม.6",
}

const GRADES: PhysicsGradeLevel[] = ["m4", "m5", "m6"]

function UnitCard({ unit, gradeLabel }: { unit: PhysicsCurriculumUnit; gradeLabel: string }) {
    const [open, setOpen] = useState(true)
    const templates = getPhysicsLessonTemplatesByUnit(unit.id)
    const hasTemplates = templates.length > 0

    return (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50/60 transition-colors"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
                        หน่วยที่ {unit.order + 1}
                    </span>
                    {unit.recommendedHours && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                            <Clock className="h-3 w-3" />
                            {unit.recommendedHours} ชั่วโมง
                        </span>
                    )}
                    {hasTemplates && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                            {templates.length} template
                        </span>
                    )}
                    <h2 className="text-base font-black text-slate-900">{unit.title}</h2>
                </div>
                {open ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                )}
            </button>

            {open && (
                <div className="border-t border-slate-100 px-5 pb-5">
                    <div className="mb-4 mt-4 space-y-1.5">
                        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
                            <Target className="h-3.5 w-3.5" />
                            ผลการเรียนรู้ ({unit.learningOutcomes.length} ข้อ)
                        </p>
                        <ul className="space-y-1.5 pl-1">
                            {unit.learningOutcomes.map((outcome, index) => (
                                <li key={outcome.id} className="flex gap-2 text-sm text-slate-600">
                                    <span className="mt-0.5 shrink-0 text-xs font-black text-violet-400">
                                        {index + 1}.
                                    </span>
                                    <span className="leading-relaxed">{outcome.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {hasTemplates ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {templates.map((template, index) => (
                                <div
                                    key={template.id}
                                    className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
                                            {index + 1}
                                        </span>
                                        <h3 className="text-sm font-black leading-snug text-slate-900">
                                            {template.outline.title}
                                        </h3>
                                    </div>

                                    {template.outline.description && (
                                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                            {template.outline.description}
                                        </p>
                                    )}

                                    <div className="mb-3 space-y-0.5">
                                        {template.outline.topics.map((t) => (
                                            <p key={t.id} className="flex gap-1.5 text-xs text-slate-600">
                                                <span className="mt-0.5 shrink-0 text-violet-400">›</span>
                                                {t.title}
                                            </p>
                                        ))}
                                    </div>

                                    <div className="mb-3 flex flex-wrap gap-1">
                                        {template.learningOutcomeIds.map((id) => (
                                            <span
                                                key={id}
                                                className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-600"
                                            >
                                                {id.split("-").slice(-2).join("-")}
                                            </span>
                                        ))}
                                    </div>

                                    <Button
                                        asChild
                                        size="sm"
                                        className="mt-auto rounded-xl bg-violet-600 font-black text-white hover:bg-violet-700"
                                    >
                                        <Link
                                            href={`/dashboard/lessons/create?templateId=${template.id}&subject=ฟิสิกส์&gradeLevel=${gradeLabel}`}
                                        >
                                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                            ใช้ template นี้
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                            <p className="text-xs font-bold text-slate-400">ยังไม่มี template สำหรับหน่วยนี้</p>
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="mt-3 rounded-xl font-bold"
                            >
                                <Link
                                    href={`/dashboard/lessons/create?subject=ฟิสิกส์&gradeLevel=${gradeLabel}&unitId=${unit.id}`}
                                >
                                    สร้างบทเรียนเองจากหน่วยนี้
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function PhysicsTemplatePickerPage() {
    const [grade, setGrade] = useState<PhysicsGradeLevel>("m4")
    const [semester, setSemester] = useState<PhysicsSemester>(1)

    const currentMap = PHYSICS_CURRICULUM_CATALOG.find(
        (map) => map.gradeLevel === grade && map.semester === semester
    )

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageBackLink href="/dashboard/lessons" label="บทเรียนของฉัน" />

            <header className="rounded-[2rem] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-6 text-white shadow-xl shadow-violet-200">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                    <BookOpen className="h-4 w-4" />
                    Physics Template Library
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight">เทมเพลตบทเรียนฟิสิกส์</h1>
                <p className="mt-1 text-sm font-medium text-white/85">
                    เลือกบทเรียนที่ต้องการ แล้วให้ AI สร้างเนื้อหาตามโครงที่วางไว้แล้ว ครูแก้ไขและเพิ่มสื่อได้เลย
                </p>
            </header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex gap-2">
                    {GRADES.map((g) => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setGrade(g)}
                            className={cn(
                                "rounded-2xl border px-5 py-2.5 text-sm font-black transition",
                                grade === g
                                    ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                            )}
                        >
                            {GRADE_LABELS[g]}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {([1, 2] as PhysicsSemester[]).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setSemester(s)}
                            className={cn(
                                "rounded-2xl border px-4 py-2.5 text-sm font-black transition",
                                semester === s
                                    ? "border-indigo-300 bg-indigo-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                            )}
                        >
                            เทอม {s}
                        </button>
                    ))}
                </div>
            </div>

            {!currentMap ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                    <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-500">
                        ยังไม่มีหน่วยการเรียนรู้สำหรับ {GRADE_LABELS[grade]} เทอม {semester}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">กำลังพัฒนา — จะเพิ่มในรอบถัดไป</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {currentMap.units.map((unit) => (
                        <UnitCard key={unit.id} unit={unit} gradeLabel={GRADE_LABELS[grade]} />
                    ))}
                </div>
            )}
        </div>
    )
}
