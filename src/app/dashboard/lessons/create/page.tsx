"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    GraduationCap,
    Upload,
    Sparkles,
    Loader2,
    FileText,
    X,
    ChevronRight,
    BookOpen,
    Target,
    AlignLeft,
    Key,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageBackLink } from "@/components/ui/page-back-link"
import { cn } from "@/lib/utils"

type LessonExample = { title: string; body: string }
type LessonSection = { id: string; heading: string; content: string; examples: LessonExample[] }
type LessonContent = {
    objectives: string[]
    sections: LessonSection[]
    keyTerms: Array<{ term: string; definition: string }>
    summary: string
    estimatedMinutes: number
}
type GeneratedLesson = { title: string; content: LessonContent }

type Step = "upload" | "preview"
type SourceMode = "text" | "pdf"

function getLessonErrorMessage(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object") return fallback
    const data = payload as { error?: { code?: string; message?: string }; message?: string }
    if (data.error?.code === "INVALID_AI_RESPONSE") {
        return "AI ส่งโครงสร้างบทเรียนกลับมาไม่ครบ ลองลดความยาวเนื้อหา หรือกดสร้างใหม่อีกครั้ง"
    }
    return data.error?.message ?? data.message ?? fallback
}

export default function CreateLessonPage() {
    const router = useRouter()

    // Step
    const [step, setStep] = useState<Step>("upload")

    // Upload form state
    const [sourceMode, setSourceMode] = useState<SourceMode>("text")
    const [sourceText, setSourceText] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [sectionCount, setSectionCount] = useState("4")
    const [language, setLanguage] = useState("th")
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Generate state
    const [generating, setGenerating] = useState(false)
    const [generateError, setGenerateError] = useState("")

    // Preview / edit state
    const [lessonTitle, setLessonTitle] = useState("")
    const [lessonContent, setLessonContent] = useState<LessonContent | null>(null)

    // Save state
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")

    const handleFileSelect = useCallback((selected: File) => {
        if (selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf")) {
            setFile(selected)
            setSourceMode("pdf")
        }
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setDragOver(false)
            const dropped = e.dataTransfer.files[0]
            if (dropped) handleFileSelect(dropped)
        },
        [handleFileSelect]
    )

    async function handleGenerate() {
        const trimmedSourceText = sourceText.trim()
        if (sourceMode === "text") {
            if (trimmedSourceText.length < 20) {
                setGenerateError("ใส่เนื้อหาอย่างน้อย 20 ตัวอักษร เพื่อให้ AI สร้างบทเรียนได้แม่นขึ้น")
                return
            }
            setGenerating(true)
            setGenerateError("")
            try {
                const genRes = await fetch("/api/ai/generate-lesson", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: trimmedSourceText,
                        pdfData: null,
                        subject,
                        gradeLevel,
                        language,
                        sectionCount: Number(sectionCount),
                    }),
                })
                if (!genRes.ok) {
                    const err = await genRes.json().catch(() => ({}))
                    throw new Error(getLessonErrorMessage(err, "AI สร้างบทเรียนไม่สำเร็จ"))
                }
                const generated = await genRes.json() as GeneratedLesson
                setLessonTitle(generated.title)
                setLessonContent(generated.content)
                setStep("preview")
            } catch (e) {
                setGenerateError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
            } finally {
                setGenerating(false)
            }
            return
        }

        if (!file) return
        setGenerating(true)
        setGenerateError("")

        try {
            // Step 1: parse file
            const formData = new FormData()
            formData.append("file", file)
            const parseRes = await fetch("/api/ai/parse-file", { method: "POST", body: formData })
            if (!parseRes.ok) {
                const err = await parseRes.json().catch(() => ({}))
                throw new Error(err?.message ?? "ไม่สามารถอ่านไฟล์ได้")
            }
            const { text, pdfData } = await parseRes.json() as { text: string; pdfData: string | null }

            // Step 2: generate lesson
            const genRes = await fetch("/api/ai/generate-lesson", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, pdfData, subject, gradeLevel, language, sectionCount: Number(sectionCount) }),
            })
            if (!genRes.ok) {
                const err = await genRes.json().catch(() => ({}))
                if (err?.error?.code === "INVALID_AI_RESPONSE") {
                    throw new Error(getLessonErrorMessage(err, "AI สร้างบทเรียนไม่สำเร็จ"))
                }
                throw new Error(err?.message ?? "AI สร้างบทเรียนไม่สำเร็จ")
            }
            const generated = await genRes.json() as GeneratedLesson
            setLessonTitle(generated.title)
            setLessonContent(generated.content)
            setStep("preview")
        } catch (e) {
            setGenerateError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
        } finally {
            setGenerating(false)
        }
    }

    async function handleSave(status: "DRAFT" | "PUBLISHED") {
        if (!lessonContent) return
        setSaving(true)
        setSaveError("")
        try {
            const res = await fetch("/api/lessons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: lessonTitle,
                    subject: subject || undefined,
                    gradeLevel: gradeLevel || undefined,
                    sourceFileName: sourceMode === "pdf" ? file?.name : undefined,
                    content: lessonContent,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(getLessonErrorMessage(err, "บันทึกบทเรียนไม่สำเร็จ"))
            }
            if (!res.ok) throw new Error("บันทึกไม่สำเร็จ")
            const saved = await res.json() as { id: string }

            if (status === "PUBLISHED") {
                const publishRes = await fetch(`/api/lessons/${saved.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "PUBLISHED" }),
                })
                if (!publishRes.ok) {
                    const err = await publishRes.json().catch(() => ({}))
                    throw new Error(getLessonErrorMessage(err, "เผยแพร่บทเรียนไม่สำเร็จ"))
                }
            }

            router.push(`/dashboard/lessons/${saved.id}/edit`)
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "บันทึกบทเรียนไม่สำเร็จ")
            // keep on page so user can retry
        } finally {
            setSaving(false)
        }
    }

    const canGenerate = sourceMode === "pdf" ? Boolean(file) : sourceText.trim().length >= 20

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageBackLink href="/dashboard/lessons" label="บทเรียนของฉัน" />

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900">สร้างบทเรียนใหม่</h1>
                    <p className="text-sm text-slate-500">อัพโหลด PDF หลักสูตร แล้ว AI จะสร้างเนื้อหาบทเรียนให้</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                {(["upload", "preview"] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-3">
                        {i > 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                                    step === s
                                        ? "bg-emerald-600 text-white"
                                        : step === "preview" && s === "upload"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-400"
                                )}
                            >
                                {i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-sm font-bold",
                                    step === s ? "text-slate-900" : "text-slate-400"
                                )}
                            >
                                {s === "upload" ? "อัพโหลดและตั้งค่า" : "ตรวจสอบและบันทึก"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {step === "upload" && (
                <div className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 font-black text-slate-800">เลือกแหล่งข้อมูล</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button
                                type="button"
                                variant={sourceMode === "text" ? "default" : "outline"}
                                onClick={() => setSourceMode("text")}
                                className={cn(
                                    "h-auto justify-start rounded-2xl p-4 text-left",
                                    sourceMode === "text" && "bg-emerald-600 text-white hover:bg-emerald-700"
                                )}
                            >
                                <AlignLeft className="mr-3 h-5 w-5" />
                                <span>
                                    <span className="block font-black">วางข้อความเอง</span>
                                    <span className="text-xs opacity-80">เหมาะกับชีต สรุป หรือแผนการสอนที่คัดลอกมาแล้ว</span>
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant={sourceMode === "pdf" ? "default" : "outline"}
                                onClick={() => setSourceMode("pdf")}
                                className={cn(
                                    "h-auto justify-start rounded-2xl p-4 text-left",
                                    sourceMode === "pdf" && "bg-emerald-600 text-white hover:bg-emerald-700"
                                )}
                            >
                                <FileText className="mr-3 h-5 w-5" />
                                <span>
                                    <span className="block font-black">อัปโหลด PDF</span>
                                    <span className="text-xs opacity-80">ใช้ route แปลงไฟล์เดิมก่อนให้ AI สร้างบทเรียน</span>
                                </span>
                            </Button>
                        </div>
                    </div>

                    {sourceMode === "text" && (
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 font-black text-slate-800">วางเนื้อหาบทเรียน</h2>
                            <Textarea
                                value={sourceText}
                                onChange={(e) => setSourceText(e.target.value)}
                                rows={10}
                                className="rounded-2xl text-sm"
                                placeholder="วางเนื้อหาจากเอกสาร หนังสือเรียน แผนการสอน หรือสรุปบทเรียนที่นี่..."
                            />
                            <p className="mt-2 text-xs font-bold text-slate-400">
                                {sourceText.trim().length.toLocaleString()} ตัวอักษร
                            </p>
                        </div>
                    )}

                    {/* PDF upload zone */}
                    {sourceMode === "pdf" && (
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 font-black text-slate-800">1. อัพโหลดไฟล์หลักสูตร</h2>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
                                dragOver
                                    ? "border-emerald-400 bg-emerald-50"
                                    : file
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                        <FileText className="h-7 w-7" />
                                    </div>
                                    <p className="font-black text-slate-800">{file.name}</p>
                                    <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-500"
                                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                                    >
                                        <X className="mr-1 h-4 w-4" />
                                        เปลี่ยนไฟล์
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                        <Upload className="h-7 w-7" />
                                    </div>
                                    <p className="font-black text-slate-700">ลากไฟล์ PDF มาวางที่นี่</p>
                                    <p className="text-sm text-slate-400">หรือคลิกเพื่อเลือกไฟล์ (PDF เท่านั้น)</p>
                                </div>
                            )}
                        </div>
                    </div>
                    )}

                    {/* Settings */}
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 font-black text-slate-800">2. ตั้งค่าบทเรียน</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">วิชา</Label>
                                <Input
                                    placeholder="เช่น คณิตศาสตร์, วิทยาศาสตร์"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">ระดับชั้น</Label>
                                <Input
                                    placeholder="เช่น ม.1, ป.4"
                                    value={gradeLevel}
                                    onChange={(e) => setGradeLevel(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">จำนวนหัวข้อ</Label>
                                <Select value={sectionCount} onValueChange={setSectionCount}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2, 3, 4, 5, 6].map((n) => (
                                            <SelectItem key={n} value={String(n)}>{n} หัวข้อ</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">ภาษาของเนื้อหา</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="th">ภาษาไทย</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {generateError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                            {generateError}
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate || generating}
                        className="w-full rounded-2xl bg-emerald-600 py-6 text-base font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                AI กำลังสร้างบทเรียน...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5" />
                                สร้างเนื้อหาด้วย AI
                            </>
                        )}
                    </Button>
                </div>
            )}

            {step === "preview" && lessonContent && (
                <div className="space-y-5">
                    {/* Title */}
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <Label className="mb-2 block font-black text-slate-800">ชื่อบทเรียน</Label>
                        <Input
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            className="rounded-xl text-lg font-black"
                        />
                    </div>

                    {/* Objectives */}
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <Target className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-black text-slate-800">วัตถุประสงค์การเรียนรู้</h3>
                        </div>
                        <ul className="space-y-2">
                            {lessonContent.objectives.map((obj, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                                        {i + 1}
                                    </span>
                                    <Textarea
                                        value={obj}
                                        onChange={(e) => {
                                            const updated = [...lessonContent.objectives]
                                            updated[i] = e.target.value
                                            setLessonContent({ ...lessonContent, objectives: updated })
                                        }}
                                        rows={2}
                                        className="rounded-xl text-sm"
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Sections */}
                    {lessonContent.sections.map((section, si) => (
                        <div key={section.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-500" />
                                <Input
                                    value={section.heading}
                                    onChange={(e) => {
                                        const updated = [...lessonContent.sections]
                                        updated[si] = { ...updated[si], heading: e.target.value }
                                        setLessonContent({ ...lessonContent, sections: updated })
                                    }}
                                    className="rounded-xl font-black text-slate-800"
                                />
                            </div>
                            <Textarea
                                value={section.content}
                                onChange={(e) => {
                                    const updated = [...lessonContent.sections]
                                    updated[si] = { ...updated[si], content: e.target.value }
                                    setLessonContent({ ...lessonContent, sections: updated })
                                }}
                                rows={6}
                                className="rounded-xl text-sm text-slate-700"
                            />
                            {section.examples.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wide">ตัวอย่าง</p>
                                    {section.examples.map((ex, ei) => (
                                        <div key={ei} className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                                            <Input
                                                value={ex.title}
                                                onChange={(e) => {
                                                    const updated = [...lessonContent.sections]
                                                    const examples = [...updated[si].examples]
                                                    examples[ei] = { ...examples[ei], title: e.target.value }
                                                    updated[si] = { ...updated[si], examples }
                                                    setLessonContent({ ...lessonContent, sections: updated })
                                                }}
                                                className="mb-2 rounded-xl text-xs font-black bg-transparent border-amber-200"
                                            />
                                            <Textarea
                                                value={ex.body}
                                                onChange={(e) => {
                                                    const updated = [...lessonContent.sections]
                                                    const examples = [...updated[si].examples]
                                                    examples[ei] = { ...examples[ei], body: e.target.value }
                                                    updated[si] = { ...updated[si], examples }
                                                    setLessonContent({ ...lessonContent, sections: updated })
                                                }}
                                                rows={3}
                                                className="rounded-xl text-sm bg-transparent border-amber-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Key Terms */}
                    {lessonContent.keyTerms.length > 0 && (
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <Key className="h-5 w-5 text-violet-500" />
                                <h3 className="font-black text-slate-800">คำศัพท์สำคัญ</h3>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {lessonContent.keyTerms.map((kt, i) => (
                                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <Input
                                            value={kt.term}
                                            onChange={(e) => {
                                                const updated = [...lessonContent.keyTerms]
                                                updated[i] = { ...updated[i], term: e.target.value }
                                                setLessonContent({ ...lessonContent, keyTerms: updated })
                                            }}
                                            className="mb-1.5 rounded-lg text-sm font-black"
                                        />
                                        <Textarea
                                            value={kt.definition}
                                            onChange={(e) => {
                                                const updated = [...lessonContent.keyTerms]
                                                updated[i] = { ...updated[i], definition: e.target.value }
                                                setLessonContent({ ...lessonContent, keyTerms: updated })
                                            }}
                                            rows={2}
                                            className="rounded-lg text-sm"
                                        />
                                    </div>
                                ))}
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
                            value={lessonContent.summary}
                            onChange={(e) => setLessonContent({ ...lessonContent, summary: e.target.value })}
                            rows={4}
                            className="rounded-xl text-sm text-slate-700"
                        />
                    </div>

                    {/* Action buttons */}
                    {saveError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                            {saveError}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setStep("upload")}
                            className="rounded-xl font-bold"
                        >
                            กลับไปแก้ไขการตั้งค่า
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSave("DRAFT")}
                            disabled={saving}
                            className="rounded-xl font-bold"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            บันทึกเป็นฉบับร่าง
                        </Button>
                        <Button
                            onClick={() => handleSave("PUBLISHED")}
                            disabled={saving}
                            className="flex-1 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            บันทึกและเผยแพร่
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
