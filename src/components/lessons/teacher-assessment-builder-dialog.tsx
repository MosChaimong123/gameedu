"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CourseAssessmentSource, QuestionSetSourceMetadata } from "@/lib/courses/assessment-source"

type Difficulty = "EASY" | "MEDIUM" | "HARD"

type GeneratedQuestionDraft = {
    id: string
    question: string
    image?: string | null
    timeLimit: number
    options: string[]
    optionTypes: string[]
    questionType: "MULTIPLE_CHOICE" | "TYPING_ANSWER"
    correctAnswer: number
    explanation?: string
}

export type TeacherAssessmentBuilderSourceOption = {
    id: string
    label: string
    description?: string
    requestBody: {
        lessonId?: string
        topicId?: string
        courseId?: string
        moduleId?: string
    }
    suggestedTitle: string
    suggestedDescription?: string
}

export type TeacherAssessmentBuilderSavedSet = {
    questionSetId: string
    title: string
    sourceMetadata: QuestionSetSourceMetadata
    questionCount: number
    passScore?: number
    allowRetake: boolean
}

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description?: string
    sourceOptions: TeacherAssessmentBuilderSourceOption[]
    onSaved?: (result: TeacherAssessmentBuilderSavedSet) => void
}

type AssessmentDraftResponse = {
    title: string
    description?: string
    sourceMetadata: QuestionSetSourceMetadata
    questions: GeneratedQuestionDraft[]
}

function createQuestionId() {
    return crypto.randomUUID()
}

function ensureFourOptions(options: string[]) {
    const next = [...options]
    while (next.length < 4) next.push("")
    return next.slice(0, 4)
}

export function TeacherAssessmentBuilderDialog({
    open,
    onOpenChange,
    title = "สร้างแบบทดสอบด้วย AI",
    description = "เลือกแหล่งเนื้อหา สร้างคำถาม ตรวจพรีวิว แล้วบันทึกเป็น question set",
    sourceOptions,
    onSaved,
}: Props) {
    const canonicalSourceOptions = useMemo(
        () =>
            sourceOptions.filter(
                (option) =>
                    Boolean(option.requestBody.topicId) ||
                    Boolean(option.requestBody.moduleId) ||
                    Boolean(option.requestBody.courseId)
            ),
        [sourceOptions]
    )

    const [selectedSourceId, setSelectedSourceId] = useState(canonicalSourceOptions[0]?.id ?? "")
    const [questionCount, setQuestionCount] = useState(10)
    const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM")
    const [assessmentTitle, setAssessmentTitle] = useState("")
    const [assessmentDescription, setAssessmentDescription] = useState("")
    const [passScore, setPassScore] = useState("")
    const [allowRetake, setAllowRetake] = useState(true)
    const [isPublic, setIsPublic] = useState(false)
    const [draft, setDraft] = useState<AssessmentDraftResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const selectedSource = useMemo(
        () => canonicalSourceOptions.find((option) => option.id === selectedSourceId) ?? canonicalSourceOptions[0] ?? null,
        [canonicalSourceOptions, selectedSourceId]
    )

    useEffect(() => {
        if (!selectedSource) return
        setSelectedSourceId(selectedSource.id)
        if (!draft) {
            setAssessmentTitle(selectedSource.suggestedTitle)
            setAssessmentDescription(selectedSource.suggestedDescription ?? "")
        }
    }, [selectedSource, draft])

    useEffect(() => {
        if (!open) {
            setDraft(null)
            setError("")
            setQuestionCount(10)
            setDifficulty("MEDIUM")
            setPassScore("")
            setAllowRetake(true)
            setIsPublic(false)
            const first = canonicalSourceOptions[0]
            setSelectedSourceId(first?.id ?? "")
            setAssessmentTitle(first?.suggestedTitle ?? "")
            setAssessmentDescription(first?.suggestedDescription ?? "")
        }
    }, [canonicalSourceOptions, open])

    function updateDraftQuestion(questionId: string, patch: Partial<GeneratedQuestionDraft>) {
        setDraft((current) =>
            current
                ? {
                      ...current,
                      questions: current.questions.map((question) =>
                          question.id === questionId ? { ...question, ...patch } : question
                      ),
                  }
                : current
        )
    }

    function removeDraftQuestion(questionId: string) {
        setDraft((current) =>
            current
                ? {
                      ...current,
                      questions: current.questions.filter((question) => question.id !== questionId),
                  }
                : current
        )
    }

    async function handleGenerate() {
        if (!selectedSource) return
        setLoading(true)
        setError("")
        try {
            const response = await fetch("/api/ai/lessons/generate-assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...selectedSource.requestBody,
                    count: questionCount,
                    difficulty,
                    language: "th",
                }),
            })
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(payload?.error?.message ?? "สร้างแบบทดสอบไม่สำเร็จ")
            }

            const normalizedDraft: AssessmentDraftResponse = {
                title: typeof payload.title === "string" ? payload.title : selectedSource.suggestedTitle,
                description: typeof payload.description === "string" ? payload.description : selectedSource.suggestedDescription,
                sourceMetadata: payload.sourceMetadata,
                questions: Array.isArray(payload.questions)
                    ? payload.questions.map((question: GeneratedQuestionDraft) => ({
                          ...question,
                          id: question.id || createQuestionId(),
                          options: ensureFourOptions(question.options ?? []),
                          optionTypes: Array.isArray(question.optionTypes) && question.optionTypes.length === 4
                              ? question.optionTypes
                              : ["TEXT", "TEXT", "TEXT", "TEXT"],
                          timeLimit: Number(question.timeLimit) > 0 ? Number(question.timeLimit) : 20,
                          questionType: "MULTIPLE_CHOICE",
                      }))
                    : [],
            }

            setDraft(normalizedDraft)
            setAssessmentTitle(normalizedDraft.title)
            setAssessmentDescription(normalizedDraft.description ?? "")
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "สร้างแบบทดสอบไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        if (!draft || draft.questions.length === 0) {
            setError("ยังไม่มีคำถามให้บันทึก")
            return
        }

        setSaving(true)
        setError("")
        try {
            const createResponse = await fetch("/api/sets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: assessmentTitle.trim() || draft.title,
                    description: assessmentDescription.trim() || null,
                    isPublic,
                    sourceMetadata: draft.sourceMetadata,
                }),
            })
            const createdSet = await createResponse.json().catch(() => ({}))
            if (!createResponse.ok || !createdSet?.id) {
                throw new Error(createdSet?.error?.message ?? "สร้าง question set ไม่สำเร็จ")
            }

            const updateResponse = await fetch(`/api/sets/${createdSet.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: assessmentTitle.trim() || draft.title,
                    description: assessmentDescription.trim() || null,
                    isPublic,
                    questions: draft.questions.map((question) => ({
                        id: question.id || createQuestionId(),
                        question: question.question,
                        image: question.image ?? null,
                        timeLimit: question.timeLimit,
                        options: ensureFourOptions(question.options),
                        optionTypes: Array.isArray(question.optionTypes) && question.optionTypes.length === 4
                            ? question.optionTypes
                            : ["TEXT", "TEXT", "TEXT", "TEXT"],
                        questionType: "MULTIPLE_CHOICE",
                        correctAnswer: Math.min(Math.max(question.correctAnswer ?? 0, 0), 3),
                        explanation: question.explanation ?? "",
                    })),
                    sourceMetadata: draft.sourceMetadata,
                }),
            })
            const updatedSet = await updateResponse.json().catch(() => ({}))
            if (!updateResponse.ok) {
                throw new Error(updatedSet?.error?.message ?? "บันทึกคำถามไม่สำเร็จ")
            }

            onSaved?.({
                questionSetId: createdSet.id,
                title: assessmentTitle.trim() || draft.title,
                sourceMetadata: draft.sourceMetadata,
                questionCount: draft.questions.length,
                passScore: passScore === "" ? undefined : Number(passScore),
                allowRetake,
            })
            onOpenChange(false)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "บันทึกแบบทดสอบไม่สำเร็จ")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex !h-[96dvh] !w-[98vw] !max-w-[98vw] flex-col overflow-hidden rounded-[1.5rem] border-slate-200 p-0 sm:!h-[94dvh] sm:rounded-[2rem]">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-5 sm:px-6">
                    <DialogTitle className="text-[1.65rem] font-black leading-tight text-slate-900 sm:text-3xl">{title}</DialogTitle>
                    <DialogDescription className="text-sm leading-6 sm:text-base">{description}</DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(440px,520px)_minmax(0,1fr)]">
                    <div className="min-h-0 space-y-5 overflow-y-auto border-b border-slate-200 p-5 xl:border-b-0 xl:border-r xl:p-6">
                        {canonicalSourceOptions.length > 1 && (
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">แหล่งเนื้อหา</Label>
                                <select
                                    value={selectedSourceId}
                                    onChange={(event) => setSelectedSourceId(event.target.value)}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-700"
                                >
                                    {canonicalSourceOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {selectedSource?.description ? (
                                    <p className="text-xs font-medium text-slate-500">{selectedSource.description}</p>
                                ) : null}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">ชื่อแบบทดสอบ</Label>
                            <Input
                                value={assessmentTitle}
                                onChange={(event) => setAssessmentTitle(event.target.value)}
                                className="h-12 rounded-xl text-base"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">คำอธิบาย</Label>
                            <Textarea
                                value={assessmentDescription}
                                onChange={(event) => setAssessmentDescription(event.target.value)}
                                rows={4}
                                className="rounded-xl text-base"
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">จำนวนข้อ</Label>
                                <Input
                                    type="number"
                                    min={3}
                                    max={20}
                                    value={questionCount}
                                    onChange={(event) => setQuestionCount(Math.min(Math.max(Number(event.target.value) || 10, 3), 20))}
                                    className="h-12 rounded-xl text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">ระดับความยาก</Label>
                                <select
                                    value={difficulty}
                                    onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-700"
                                >
                                    <option value="EASY">ง่าย</option>
                                    <option value="MEDIUM">กลาง</option>
                                    <option value="HARD">ยาก</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">คะแนนผ่าน</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={passScore}
                                    onChange={(event) => setPassScore(event.target.value)}
                                    placeholder="ไม่บังคับ"
                                    className="h-12 rounded-xl text-base"
                                />
                            </div>

                            <label className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-base font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={allowRetake}
                                    onChange={(event) => setAllowRetake(event.target.checked)}
                                />
                                อนุญาตให้ทำซ้ำ
                            </label>
                        </div>

                        <label className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-base font-bold text-slate-700">
                            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
                            เปิดเป็น question set สาธารณะ
                        </label>

                        <Button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading || !selectedSource}
                            className="h-12 w-full rounded-xl bg-indigo-600 text-base font-black text-white hover:bg-indigo-700"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            สร้างคำถามด้วย AI
                        </Button>

                        {draft ? (
                            <Button type="button" variant="outline" onClick={handleGenerate} disabled={loading} className="h-12 w-full rounded-xl text-base font-bold">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                สร้างใหม่
                            </Button>
                        ) : null}

                        {error ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>
                        ) : null}
                    </div>

                    <div className="flex min-h-0 flex-col">
                        <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
                            <p className="text-sm font-bold text-slate-500">พรีวิวและแก้ไขก่อนบันทึก</p>
                            <h3 className="text-xl font-black text-slate-900 sm:text-2xl">
                                {draft ? `${draft.questions.length} ข้อ` : "ยังไม่มี draft"}
                            </h3>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                            {!draft ? (
                                <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-400">
                                    กดสร้างคำถามด้วย AI เพื่อดูพรีวิวก่อนบันทึก
                                </div>
                            ) : draft.questions.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-400">
                                    AI ยังไม่ได้คืนคำถามที่พร้อมใช้งาน
                                </div>
                            ) : (
                                draft.questions.map((question, index) => (
                                    <div key={question.id} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 space-y-2">
                                                <Label className="font-bold text-slate-700">คำถาม {index + 1}</Label>
                                                <Textarea
                                                    value={question.question}
                                                    onChange={(event) => updateDraftQuestion(question.id, { question: event.target.value })}
                                                    rows={2}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => removeDraftQuestion(question.id)}
                                                className="text-slate-400 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            {ensureFourOptions(question.options).map((option, optionIndex) => (
                                                <div key={`${question.id}-option-${optionIndex}`} className="space-y-2">
                                                    <Label className="font-bold text-slate-700">ตัวเลือก {optionIndex + 1}</Label>
                                                    <Input
                                                        value={option}
                                                        onChange={(event) => {
                                                            const nextOptions = ensureFourOptions(question.options)
                                                            nextOptions[optionIndex] = event.target.value
                                                            updateDraftQuestion(question.id, { options: nextOptions })
                                                        }}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                                            <div className="space-y-2">
                                                <Label className="font-bold text-slate-700">คำตอบที่ถูก</Label>
                                                <select
                                                    value={question.correctAnswer}
                                                    onChange={(event) =>
                                                        updateDraftQuestion(question.id, { correctAnswer: Number(event.target.value) })
                                                    }
                                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                                >
                                                    <option value={0}>ข้อ 1</option>
                                                    <option value={1}>ข้อ 2</option>
                                                    <option value={2}>ข้อ 3</option>
                                                    <option value={3}>ข้อ 4</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-bold text-slate-700">คำอธิบาย</Label>
                                                <Textarea
                                                    value={question.explanation ?? ""}
                                                    onChange={(event) => updateDraftQuestion(question.id, { explanation: event.target.value })}
                                                    rows={2}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-slate-200 px-5 py-4 sm:px-6">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
                        ปิด
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !draft || draft.questions.length === 0}
                        className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        บันทึกเป็น Question Set
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
