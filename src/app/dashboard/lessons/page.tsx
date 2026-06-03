"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, Plus, BookOpen, Pencil, Trash2, Users, Clock, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ClassroomAssignment = {
    classId: string
    classroom: { id: string; name: string }
}

type Lesson = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    status: "DRAFT" | "PUBLISHED"
    sourceFileName: string | null
    createdAt: string
    updatedAt: string
    classroomAssignments: ClassroomAssignment[]
}

export default function LessonsPage() {
    const router = useRouter()
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetch("/api/lessons")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setLessons(data)
            })
            .finally(() => setLoading(false))
    }, [])

    async function handleDelete() {
        if (!deleteId) return
        setDeleting(true)
        try {
            await fetch(`/api/lessons/${deleteId}`, { method: "DELETE" })
            setLessons((prev) => prev.filter((l) => l.id !== deleteId))
        } finally {
            setDeleting(false)
            setDeleteId(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-xl shadow-emerald-200">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                            <GraduationCap className="h-4 w-4" />
                            AI Lesson Generator
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">บทเรียนของฉัน</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/80">
                            สร้างบทเรียนจากไฟล์หลักสูตร PDF ด้วย AI แล้ว assign ให้นักเรียนเรียนได้เลย
                        </p>
                    </div>
                    <Link href="/dashboard/lessons/create">
                        <Button className="rounded-2xl bg-white font-black text-emerald-700 shadow-lg hover:bg-white/90">
                            <Plus className="mr-2 h-4 w-4" />
                            สร้างบทเรียนใหม่
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "บทเรียนทั้งหมด",
                        value: lessons.length,
                        icon: BookOpen,
                        color: "bg-emerald-50 text-emerald-600",
                    },
                    {
                        label: "เผยแพร่แล้ว",
                        value: lessons.filter((l) => l.status === "PUBLISHED").length,
                        icon: FileText,
                        color: "bg-blue-50 text-blue-600",
                    },
                    {
                        label: "ห้องเรียนที่ assign",
                        value: new Set(lessons.flatMap((l) => l.classroomAssignments.map((a) => a.classId))).size,
                        icon: Users,
                        color: "bg-violet-50 text-violet-600",
                    },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className={`mb-3 inline-flex rounded-xl p-2 ${stat.color}`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                        <p className="text-xs font-bold text-slate-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Lesson list */}
            <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-lg font-black text-slate-900">รายการบทเรียน</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : lessons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                        <div className="rounded-full bg-slate-100 p-4">
                            <GraduationCap className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                            <p className="font-black text-slate-700">ยังไม่มีบทเรียน</p>
                            <p className="mt-1 text-sm text-slate-400">อัพโหลด PDF หลักสูตร แล้วให้ AI สร้างบทเรียนให้</p>
                        </div>
                        <Link href="/dashboard/lessons/create">
                            <Button className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                สร้างบทเรียนแรก
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-black text-slate-900 truncate">{lesson.title}</p>
                                        <Badge
                                            variant={lesson.status === "PUBLISHED" ? "default" : "secondary"}
                                            className={
                                                lesson.status === "PUBLISHED"
                                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                    : "bg-slate-100 text-slate-500"
                                            }
                                        >
                                            {lesson.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                                        </Badge>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                        {lesson.subject && <span>📚 {lesson.subject}</span>}
                                        {lesson.gradeLevel && <span>🎓 {lesson.gradeLevel}</span>}
                                        {lesson.classroomAssignments.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {lesson.classroomAssignments.length} ห้อง
                                            </span>
                                        )}
                                        {lesson.classroomAssignments.length > 0 && (
                                            <span className="max-w-full truncate">
                                                {lesson.classroomAssignments
                                                    .map((assignment) => assignment.classroom.name)
                                                    .slice(0, 3)
                                                    .join(", ")}
                                                {lesson.classroomAssignments.length > 3
                                                    ? ` +${lesson.classroomAssignments.length - 3}`
                                                    : ""}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(lesson.createdAt).toLocaleDateString("th-TH")}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold"
                                        onClick={() => router.push(`/dashboard/lessons/${lesson.id}/edit`)}
                                    >
                                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                        แก้ไข
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => setDeleteId(lesson.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirm dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ลบบทเรียนนี้?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การลบจะไม่สามารถกู้คืนได้ และจะลบออกจากทุกห้องเรียนที่ assign ไว้ด้วย
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ลบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
