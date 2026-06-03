"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
    GraduationCap,
    Loader2,
    BookOpen,
    Target,
    AlignLeft,
    Key,
    Globe,
    EyeOff,
    Users,
    CheckCircle2,
    Plus,
    Trash2,
    BarChart3,
    Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { PageBackLink } from "@/components/ui/page-back-link"

type LessonExample = { title: string; body: string }
type LessonSection = { id: string; heading: string; content: string; examples: LessonExample[] }
type LessonContent = {
    objectives: string[]
    sections: LessonSection[]
    keyTerms: Array<{ term: string; definition: string }>
    summary: string
    estimatedMinutes: number
}
type Lesson = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    status: "DRAFT" | "PUBLISHED"
    content: LessonContent
    classroomAssignments: Array<{
        id: string
        classId: string
        classroom: { id: string; name: string }
        completions: Array<{ studentId: string; quizScore: number | null; completedAt: string }>
    }>
}
type Classroom = { id: string; name: string; grade: string | null; _count: { students: number } }

export default function EditLessonPage() {
    const { id } = useParams<{ id: string }>()

    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [loading, setLoading] = useState(true)

    // Editable fields
    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [content, setContent] = useState<LessonContent | null>(null)

    // Save state
    const [saving, setSaving] = useState(false)
    const [savedOk, setSavedOk] = useState(false)

    // Assign dialog
    const [assignOpen, setAssignOpen] = useState(false)
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [assigning, setAssigning] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api/lessons/${id}`)
            .then((r) => r.json())
            .then((data: Lesson) => {
                setLesson(data)
                setTitle(data.title)
                setSubject(data.subject ?? "")
                setGradeLevel(data.gradeLevel ?? "")
                setContent(data.content)
            })
            .finally(() => setLoading(false))
    }, [id])

    const fetchClassrooms = useCallback(() => {
        fetch("/api/classrooms")
            .then((r) => r.json())
            .then((data) => Array.isArray(data) && setClassrooms(data))
    }, [])

    async function handleSave() {
        if (!content) return
        setSaving(true)
        setSavedOk(false)
        try {
            const res = await fetch(`/api/lessons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, subject: subject || null, gradeLevel: gradeLevel || null, content }),
            })
            if (res.ok) {
                const updated = await res.json() as Lesson
                setLesson((prev) => prev ? { ...prev, ...updated } : prev)
                setSavedOk(true)
                setTimeout(() => setSavedOk(false), 2000)
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleTogglePublish() {
        if (!lesson) return
        setSaving(true)
        try {
            const newStatus = lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
            const res = await fetch(`/api/lessons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setLesson((prev) => prev ? { ...prev, status: newStatus } : prev)
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleAssign(classId: string) {
        setAssigning(classId)
        try {
            await fetch(`/api/classrooms/${classId}/lessons`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId: id }),
            })
            // Refresh lesson to get updated assignments
            const res = await fetch(`/api/lessons/${id}`)
            const updated = await res.json() as Lesson
            setLesson(updated)
        } finally {
            setAssigning(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!lesson || !content) {
        return <div className="py-16 text-center text-slate-500">ไม่พบบทเรียนนี้</div>
    }

    const assignedClassIds = new Set(lesson.classroomAssignments.map((a) => a.classId))

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageBackLink href="/dashboard/lessons" label="บทเรียนของฉัน" />

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">{lesson.title}</h1>
                        <div className="mt-1 flex items-center gap-2">
                            <Badge
                                className={
                                    lesson.status === "PUBLISHED"
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                                }
                            >
                                {lesson.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                            </Badge>
                            {lesson.subject && <span className="text-sm text-slate-400">{lesson.subject}</span>}
                            {lesson.gradeLevel && <span className="text-sm text-slate-400">· {lesson.gradeLevel}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => { fetchClassrooms(); setAssignOpen(true) }}
                        className="rounded-xl font-bold"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Assign ให้ห้องเรียน
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleTogglePublish}
                        disabled={saving}
                        className="rounded-xl font-bold"
                    >
                        {lesson.status === "PUBLISHED" ? (
                            <><EyeOff className="mr-2 h-4 w-4" />ยกเลิกเผยแพร่</>
                        ) : (
                            <><Globe className="mr-2 h-4 w-4" />เผยแพร่</>
                        )}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : savedOk ? (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : null}
                        {savedOk ? "บันทึกแล้ว!" : "บันทึก"}
                    </Button>
                </div>
            </div>

            {/* Assigned classrooms */}
            {lesson.classroomAssignments.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="mb-2 text-xs font-black text-emerald-700 uppercase tracking-wide">ห้องเรียนที่ assign</p>
                    <div className="flex flex-wrap gap-2">
                        {lesson.classroomAssignments.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm">
                                <Users className="h-3.5 w-3.5 text-emerald-600" />
                                {a.classroom.name}
                                <span className="text-xs text-slate-400">{a.completions.length} คน</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Meta fields */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-black text-slate-800">ข้อมูลบทเรียน</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-3">
                        <Label className="font-bold text-slate-700">ชื่อบทเรียน</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl font-black" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">วิชา</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" placeholder="เช่น คณิตศาสตร์" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">ระดับชั้น</Label>
                        <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="rounded-xl" placeholder="เช่น ม.1" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">เวลาโดยประมาณ</Label>
                        <Input
                            type="number"
                            value={content.estimatedMinutes}
                            onChange={(e) => setContent({ ...content, estimatedMinutes: Number(e.target.value) })}
                            className="rounded-xl"
                            placeholder="นาที"
                        />
                    </div>
                </div>
            </div>

            {/* Objectives */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-black text-slate-800">วัตถุประสงค์การเรียนรู้</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs font-bold text-slate-500"
                        onClick={() => setContent({ ...content, objectives: [...content.objectives, ""] })}
                    >
                        <Plus className="mr-1 h-3 w-3" /> เพิ่ม
                    </Button>
                </div>
                <div className="space-y-2">
                    {content.objectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">{i + 1}</span>
                            <Textarea
                                value={obj}
                                onChange={(e) => {
                                    const updated = [...content.objectives]
                                    updated[i] = e.target.value
                                    setContent({ ...content, objectives: updated })
                                }}
                                rows={2}
                                className="flex-1 rounded-xl text-sm"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 shrink-0 rounded-xl text-slate-300 hover:text-red-400"
                                onClick={() => setContent({ ...content, objectives: content.objectives.filter((_, j) => j !== i) })}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sections */}
            {content.sections.map((section, si) => (
                <div key={section.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
                            {si + 1}
                        </div>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <Input
                            value={section.heading}
                            onChange={(e) => {
                                const updated = [...content.sections]
                                updated[si] = { ...updated[si], heading: e.target.value }
                                setContent({ ...content, sections: updated })
                            }}
                            className="rounded-xl font-black text-slate-800"
                        />
                    </div>
                    <Textarea
                        value={section.content}
                        onChange={(e) => {
                            const updated = [...content.sections]
                            updated[si] = { ...updated[si], content: e.target.value }
                            setContent({ ...content, sections: updated })
                        }}
                        rows={6}
                        className="rounded-xl text-sm text-slate-700"
                    />
                </div>
            ))}

            {/* Key Terms */}
            {content.keyTerms.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <Key className="h-5 w-5 text-violet-500" />
                        <h3 className="font-black text-slate-800">คำศัพท์สำคัญ</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {content.keyTerms.map((kt, i) => (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <Input
                                    value={kt.term}
                                    onChange={(e) => {
                                        const updated = [...content.keyTerms]
                                        updated[i] = { ...updated[i], term: e.target.value }
                                        setContent({ ...content, keyTerms: updated })
                                    }}
                                    className="mb-1.5 rounded-lg text-sm font-black"
                                />
                                <Textarea
                                    value={kt.definition}
                                    onChange={(e) => {
                                        const updated = [...content.keyTerms]
                                        updated[i] = { ...updated[i], definition: e.target.value }
                                        setContent({ ...content, keyTerms: updated })
                                    }}
                                    rows={2}
                                    className="rounded-lg text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress Tracker */}
            {lesson.classroomAssignments.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        <h3 className="font-black text-slate-800">ความคืบหน้านักเรียน</h3>
                    </div>
                    <div className="space-y-4">
                        {lesson.classroomAssignments.map((a) => {
                            const total = a.completions.length
                            const withScore = a.completions.filter((c) => c.quizScore !== null)
                            const avgScore =
                                withScore.length > 0
                                    ? Math.round(withScore.reduce((sum, c) => sum + (c.quizScore ?? 0), 0) / withScore.length)
                                    : null
                            return (
                                <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="font-bold text-slate-800">{a.classroom.name}</p>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Users className="h-3.5 w-3.5" />
                                                {total} คนอ่านแล้ว
                                            </span>
                                            {avgScore !== null && (
                                                <span className="flex items-center gap-1 font-bold text-amber-600">
                                                    <Star className="h-3.5 w-3.5 fill-current" />
                                                    Quiz เฉลี่ย {avgScore}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {total > 0 ? (
                                        <div className="space-y-1">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                                    style={{ width: `${Math.min(total * 10, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {a.completions.map((c) => (
                                                    <div
                                                        key={c.studentId}
                                                        className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"
                                                        title={new Date(c.completedAt).toLocaleDateString("th-TH")}
                                                    >
                                                        {c.quizScore !== null ? `${c.quizScore}%` : "✓"}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">ยังไม่มีนักเรียนเรียน</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <AlignLeft className="h-5 w-5 text-teal-500" />
                    <h3 className="font-black text-slate-800">สรุปบทเรียน</h3>
                </div>
                <Textarea
                    value={content.summary}
                    onChange={(e) => setContent({ ...content, summary: e.target.value })}
                    rows={4}
                    className="rounded-xl text-sm text-slate-700"
                />
            </div>

            {/* Floating save bar */}
            <div className="sticky bottom-4 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-2xl bg-emerald-600 px-8 font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : savedOk ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
                    {savedOk ? "บันทึกแล้ว!" : "บันทึกการเปลี่ยนแปลง"}
                </Button>
            </div>

            {/* Assign dialog */}
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black">Assign บทเรียนให้ห้องเรียน</DialogTitle>
                        <DialogDescription>เลือกห้องเรียนที่ต้องการให้นักเรียนเข้าถึงบทเรียนนี้</DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 space-y-2">
                        {classrooms.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีห้องเรียน</p>
                        ) : (
                            classrooms.map((cls) => {
                                const isAssigned = assignedClassIds.has(cls.id)
                                return (
                                    <div
                                        key={cls.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800">{cls.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {cls.grade && `${cls.grade} · `}{cls._count.students} นักเรียน
                                            </p>
                                        </div>
                                        {isAssigned ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Assigned แล้ว
                                            </Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                                                onClick={() => handleAssign(cls.id)}
                                                disabled={assigning === cls.id}
                                            >
                                                {assigning === cls.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <><Plus className="mr-1 h-3.5 w-3.5" />Assign</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
