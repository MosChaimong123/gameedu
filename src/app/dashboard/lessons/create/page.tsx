"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    FileText,
    GraduationCap,
    GripVertical,
    Loader2,
    Plus,
    Sparkles,
    Target,
    Trash2,
    Upload,
    PlaySquare,
    X,
    AlignLeft,
} from "lucide-react"
import { TeachingMediaPickerPanel } from "@/components/dashboard/teaching-media-picker-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageBackLink } from "@/components/ui/page-back-link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getCanonicalGradeLevelLabel, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"
import { getSubjectCurriculumMapPack, type SubjectCurriculumMapPack, type SubjectCurriculumUnitOutline } from "@/lib/curriculum/map-packs"
import {
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
} from "@/lib/curriculum/subject-catalog"
import {
    getSubjectLessonTemplatePack,
    type SubjectLessonTemplate,
} from "@/lib/curriculum/template-master-pack"
import { getSubjectUnitLearningOutcomePack, type SubjectUnitLearningOutcomePack } from "@/lib/curriculum/unit-learning-outcomes"
import { cn } from "@/lib/utils"
import type {
    LessonContentV2,
    LessonContentMetadata,
    LessonMediaBlock,
    LessonOutlineBatchDraft,
    LessonOutlineDraft,
    LessonTopicContentDraft,
} from "@/lib/lessons/lesson-content"
import {
    buildLessonCurriculumHref,
    CORE_SUBJECT_OPTIONS,
    parseLessonCurriculumContext,
} from "@/lib/lessons/lesson-curriculum-context"
import type { TeachingMediaReference } from "@/lib/teaching-media-reference"

type Step = "source" | "outline" | "topics"
type SourceMode = "text" | "pdf"
type TopicDraft = LessonContentV2["topics"][number]
type LessonDraftBundle = {
    id: string
    outline: LessonOutlineDraft
    topics: TopicDraft[]
    metadata?: LessonContentMetadata
}

type SourceSnapshot = {
    text: string
    pdfData: string | null
}

type CurriculumSelectionState = {
    subjectId: CanonicalCoreSubjectId
    unitId: string
    templateId?: string
    topicIds?: string[]
    learningOutcomeIds?: string[]
}

const WIZARD_STEPS: Array<{ value: Step; label: string }> = [
    { value: "source", label: "แหล่งข้อมูล" },
    { value: "outline", label: "บทเรียน" },
    { value: "topics", label: "เนื้อหาในบทเรียน" },
]

function getLessonErrorMessage(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object") return fallback
    const data = payload as { error?: { code?: string; message?: string }; message?: string }
    if (data.error?.code === "INVALID_AI_RESPONSE") {
        return "AI ส่งโครงสร้างกลับมาไม่ครบ ลองลดความยาวเนื้อหา หรือกดสร้างใหม่อีกครั้ง"
    }
    return data.error?.message ?? data.message ?? fallback
}

function createTopicId(title: string, index: number) {
    const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 36)
    return slug ? `topic-${index + 1}-${slug}` : `topic-${index + 1}`
}

function createLessonDraftId(title: string, index: number) {
    const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 36)
    return slug ? `lesson-${index + 1}-${slug}` : `lesson-${index + 1}`
}

function createEmptyTopic(topic: LessonOutlineDraft["topics"][number]): TopicDraft {
    return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        order: topic.order,
        contentStatus: "empty",
        objectives: [],
        sections: [],
        documents: [],
    }
}

function createCurriculumTemplateDraftId(templateId: string) {
    return `curriculum-template-${templateId}`
}

function createCurriculumUnitDraftId(unitId: string) {
    return `curriculum-unit-${unitId}`
}

function getPrimaryGradeLevelLabel(unit: SubjectCurriculumUnitOutline) {
    const gradeLevel = unit.gradeLevels[0] as CanonicalGradeLevel | undefined
    return gradeLevel ? getCanonicalGradeLevelLabel(gradeLevel, "th") : ""
}

function buildCurriculumMetadata(input: {
    subjectId: CanonicalCoreSubjectId
    unit: SubjectCurriculumUnitOutline
    outcomePack: SubjectUnitLearningOutcomePack
    template?: SubjectLessonTemplate | null
}) {
    const subject = getCanonicalSubjectById(input.subjectId)
    const learningOutcomeIds = input.template?.suggestedOutcomeIds?.length
        ? input.template.suggestedOutcomeIds
        : input.outcomePack.learningOutcomes.map((outcome) => outcome.id)

    return {
        curriculum: {
            subject: subject?.displayNameTh ?? input.subjectId,
            curriculumCode: "basic_education_2551",
            gradeLevel: getPrimaryGradeLevelLabel(input.unit),
            semester: input.unit.semester,
            unitId: input.unit.id,
            learningOutcomeIds,
            sourceRefs: input.template ? [...input.unit.sourceRefs, ...input.template.sourceRefs] : input.unit.sourceRefs,
        },
        template: input.template
            ? {
                  templateId: input.template.id,
                  templateLabel: input.template.title,
              }
            : undefined,
    } satisfies LessonContentMetadata
}

function buildCurriculumUnitOutline(
    subjectId: CanonicalCoreSubjectId,
    unit: SubjectCurriculumUnitOutline,
    outcomePack: SubjectUnitLearningOutcomePack
): LessonOutlineDraft {
    const subject = getCanonicalSubjectById(subjectId)

    return {
        title: unit.title,
        description: unit.notes?.[0] ?? `โครงบทเรียนจากหน่วย ${unit.title}`,
        subject: subject?.displayNameTh ?? subjectId,
        gradeLevel: getPrimaryGradeLevelLabel(unit),
        topics: outcomePack.topics.map((topic, index) => ({
            id: topic.id,
            title: topic.title,
            description: topic.notes?.[0] ?? outcomePack.learningOutcomes.find((outcome) => outcome.topicIds.includes(topic.id))?.text,
            order: index,
        })),
    }
}

function buildCurriculumUnitShellContentV2(
    subjectId: CanonicalCoreSubjectId,
    unit: SubjectCurriculumUnitOutline,
    outcomePack: SubjectUnitLearningOutcomePack
): LessonContentV2 {
    const outline = buildCurriculumUnitOutline(subjectId, unit, outcomePack)
    return buildContentV2(outline, outline.topics.map(createEmptyTopic), buildCurriculumMetadata({ subjectId, unit, outcomePack }))
}

function buildCurriculumTemplateContentV2(
    subjectId: CanonicalCoreSubjectId,
    unit: SubjectCurriculumUnitOutline,
    outcomePack: SubjectUnitLearningOutcomePack,
    template: SubjectLessonTemplate
): LessonContentV2 {
    const subject = getCanonicalSubjectById(subjectId)
    const topicMap = new Map(outcomePack.topics.map((topic) => [topic.id, topic]))
    const outcomeMap = new Map(outcomePack.learningOutcomes.map((outcome) => [outcome.id, outcome]))

    const outline: LessonOutlineDraft = {
        title: template.title,
        description: template.description,
        subject: subject?.displayNameTh ?? subjectId,
        gradeLevel: getPrimaryGradeLevelLabel(unit),
        topics: template.topicStructure.map((topic, index) => {
            const firstTopic = topic.topicIds[0] ? topicMap.get(topic.topicIds[0]) : null
            const firstOutcome = topic.outcomeIds[0] ? outcomeMap.get(topic.outcomeIds[0]) : null
            return {
                id: topic.topicIds[0] ?? topic.id,
                title: topic.title,
                description: firstTopic?.notes?.[0] ?? firstOutcome?.text,
                order: index,
            }
        }),
    }

    const topics = outline.topics.map((topic) => ({
        ...createEmptyTopic(topic),
        objectives: outcomePack.learningOutcomes
            .filter((outcome) => outcome.topicIds.includes(topic.id) && template.suggestedOutcomeIds.includes(outcome.id))
            .map((outcome) => outcome.text),
    }))

    return buildContentV2(outline, topics, buildCurriculumMetadata({ subjectId, unit, outcomePack, template }))
}

function buildContentV2(outline: LessonOutlineDraft, topics: TopicDraft[], metadata?: LessonContentMetadata): LessonContentV2 {
    return {
        schemaVersion: "lesson_content_v2",
        outline,
        topics,
        estimatedMinutes: Math.max(10, topics.filter((topic) => topic.contentStatus !== "empty").length * 12),
        metadata,
    }
}

function createLessonDraftBundle(
    outline: LessonOutlineDraft,
    index: number,
    options?: { metadata?: LessonContentMetadata; topics?: TopicDraft[] }
): LessonDraftBundle {
    return {
        id: createLessonDraftId(outline.title, index),
        outline,
        topics: options?.topics ?? outline.topics.map(createEmptyTopic),
        metadata: options?.metadata,
    }
}

function createLessonDraftBundleFromContent(content: LessonContentV2, index: number): LessonDraftBundle {
    return createLessonDraftBundle(content.outline, index, {
        topics: content.topics,
        metadata: content.metadata,
    })
}

function statusLabel(status: TopicDraft["contentStatus"]) {
    if (status === "generated") return "generated"
    if (status === "edited") return "edited"
    return "empty"
}

function statusTone(status: TopicDraft["contentStatus"]) {
    if (status === "generated") return "border-emerald-200 bg-emerald-50 text-emerald-700"
    if (status === "edited") return "border-blue-200 bg-blue-50 text-blue-700"
    return "border-slate-200 bg-slate-50 text-slate-500"
}

function isValidMediaUrl(value: string) {
    if (value.startsWith("/")) return true
    try {
        const url = new URL(value)
        return url.protocol === "https:" || url.protocol === "http:"
    } catch {
        return false
    }
}

function createMediaBlockId() {
    return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getReferenceUrl(reference: TeachingMediaReference) {
    if (reference.url) return reference.url
    if (reference.linkUrl) return reference.linkUrl
    if (reference.youtubeId) return `https://www.youtube.com/watch?v=${reference.youtubeId}`
    return ""
}

function mediaBlockFromReference(reference: TeachingMediaReference): LessonMediaBlock | null {
    const url = getReferenceUrl(reference)
    if (!url || !isValidMediaUrl(url)) return null
    const type = reference.type === "image" ? "image" : reference.type === "video" || reference.type === "youtube" ? "video" : null
    if (!type) return null
    return {
        id: createMediaBlockId(),
        mediaId: reference.mediaId,
        type,
        url,
        title: reference.title,
        source: "media_library",
    }
}

function MediaBlockEditor({
    label,
    blocks,
    onChange,
    videoOnly = false,
}: {
    label: string
    blocks: LessonMediaBlock[]
    onChange: (next: LessonMediaBlock[]) => void
    videoOnly?: boolean
}) {
    function removeBlock(id: string) {
        onChange(blocks.filter((block) => block.id !== id))
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-slate-800">{label}</p>
                    <p className="text-xs font-medium text-slate-500">เลือกจากคลังสื่อ</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500">
                    {blocks.length} รายการ
                </span>
            </div>

            {blocks.length > 0 && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    {blocks.map((block) => (
                        <div key={block.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="aspect-video bg-slate-100">
                                {block.type === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={block.url} alt={block.title ?? "lesson image"} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="grid h-full place-items-center bg-slate-900 text-white">
                                        <PlaySquare className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-start gap-2 p-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-black text-slate-800">{block.title || block.url}</p>
                                    {block.caption && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{block.caption}</p>}
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(block.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <TeachingMediaPickerPanel
                selected={[]}
                allowedTypes={videoOnly ? ["video", "youtube"] : ["image", "video", "youtube"]}
                title="เลือกจากคลังสื่อ"
                description="เลือกเฉพาะรูปภาพ วิดีโอ หรือ YouTube เพื่อแนบในบทเรียน"
                onChange={(references) => {
                    const nextBlocks = references
                        .map(mediaBlockFromReference)
                        .filter((block): block is LessonMediaBlock => Boolean(block))
                    if (nextBlocks.length > 0) onChange([...blocks, ...nextBlocks])
                }}
            />
        </div>
    )
}

export default function CreateLessonPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [step, setStep] = useState<Step>("source")
    const [sourceMode, setSourceMode] = useState<SourceMode>("text")
    const [sourceText, setSourceText] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [lessonCount, setLessonCount] = useState("4")
    const [language, setLanguage] = useState("th")
    const [dragOver, setDragOver] = useState(false)
    const [sourceSnapshot, setSourceSnapshot] = useState<SourceSnapshot | null>(null)

    const [lessonDrafts, setLessonDrafts] = useState<LessonDraftBundle[]>([])
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
    const [curriculumSubjectId, setCurriculumSubjectId] = useState<CanonicalCoreSubjectId>("science_technology")
    const [curriculumUnitId, setCurriculumUnitId] = useState("")
    const [curriculumTemplateId, setCurriculumTemplateId] = useState("")

    const [generatingOutline, setGeneratingOutline] = useState(false)
    const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const initialCurriculumContext = useMemo(() => parseLessonCurriculumContext(searchParams), [searchParams])
    const lessonListHref = useMemo(
        () =>
            buildLessonCurriculumHref("/dashboard/lessons", {
                subjectId: curriculumSubjectId ?? initialCurriculumContext.subjectId,
                unitId: curriculumUnitId || initialCurriculumContext.unitId,
            }),
        [curriculumSubjectId, curriculumUnitId, initialCurriculumContext.subjectId, initialCurriculumContext.unitId]
    )

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const source = params.get("source")
        if (source === "pdf" || source === "text") setSourceMode(source)
        const subjectParam = params.get("subject")
        const subjectIdParam = params.get("subjectId")
        const effectiveSubjectId =
            subjectIdParam && CORE_SUBJECT_OPTIONS.includes(subjectIdParam as CanonicalCoreSubjectId)
                ? (subjectIdParam as CanonicalCoreSubjectId)
                : curriculumSubjectId
        const gradeLevelParam = params.get("gradeLevel")
        const unitId = params.get("unitId")
        if (subjectParam) setSubject(subjectParam)
        if (subjectIdParam && CORE_SUBJECT_OPTIONS.includes(subjectIdParam as CanonicalCoreSubjectId)) {
            setCurriculumSubjectId(subjectIdParam as CanonicalCoreSubjectId)
        }
        if (gradeLevelParam) setGradeLevel(gradeLevelParam)
        if (unitId) setCurriculumUnitId(unitId)
        const templateId = params.get("templateId")
        if (templateId) {
            const curriculumTemplate = getSubjectLessonTemplatePack(effectiveSubjectId)?.templates.find(
                (candidate) => candidate.id === templateId
            )
            if (curriculumTemplate) {
                const unit = getSubjectCurriculumMapPack(effectiveSubjectId)?.unitOutlines.find(
                    (candidate) => candidate.id === curriculumTemplate.unitId
                )
                const outcomePack = unit ? getSubjectUnitLearningOutcomePack(effectiveSubjectId, unit.id) : null
                if (unit && outcomePack) {
                    const bundle = createLessonDraftBundleFromContent(
                        buildCurriculumTemplateContentV2(effectiveSubjectId, unit, outcomePack, curriculumTemplate),
                        0
                    )
                    setCurriculumTemplateId(curriculumTemplate.id)
                    setCurriculumUnitId(unit.id)
                    setLessonDrafts([bundle])
                    setSelectedLessonId(bundle.id)
                    setSelectedTopicId(bundle.topics[0]?.id ?? null)
                    setSourceSnapshot({ text: "", pdfData: null })
                    setSubject(bundle.outline.subject ?? "")
                    setGradeLevel(bundle.outline.gradeLevel ?? "")
                    setStep("outline")
                    return
                }
            }
        }
    }, [])

    const selectedLesson = useMemo(
        () => lessonDrafts.find((lesson) => lesson.id === selectedLessonId) ?? lessonDrafts[0] ?? null,
        [selectedLessonId, lessonDrafts]
    )
    const outline = selectedLesson?.outline ?? null
    const topicDrafts = selectedLesson?.topics ?? []
    const selectedTopic = useMemo(
        () => topicDrafts.find((topic) => topic.id === selectedTopicId) ?? topicDrafts[0] ?? null,
        [selectedTopicId, topicDrafts]
    )
    const selectedCurriculumSubject = useMemo(
        () => getCanonicalSubjectById(curriculumSubjectId),
        [curriculumSubjectId]
    )
    const selectedCurriculumPack = useMemo<SubjectCurriculumMapPack | null>(
        () => getSubjectCurriculumMapPack(curriculumSubjectId),
        [curriculumSubjectId]
    )
    const selectedCurriculumUnit = useMemo<SubjectCurriculumUnitOutline | null>(
        () => selectedCurriculumPack?.unitOutlines.find((unit) => unit.id === curriculumUnitId) ?? selectedCurriculumPack?.unitOutlines[0] ?? null,
        [curriculumUnitId, selectedCurriculumPack]
    )
    const selectedCurriculumOutcomePack = useMemo<SubjectUnitLearningOutcomePack | null>(
        () => (selectedCurriculumUnit ? getSubjectUnitLearningOutcomePack(curriculumSubjectId, selectedCurriculumUnit.id) : null),
        [curriculumSubjectId, selectedCurriculumUnit]
    )
    const selectedCurriculumTemplatePack = useMemo(
        () => getSubjectLessonTemplatePack(curriculumSubjectId),
        [curriculumSubjectId]
    )
    const selectedCurriculumTemplates = useMemo(
        () =>
            selectedCurriculumTemplatePack?.templates.filter((template) =>
                selectedCurriculumUnit ? template.unitId === selectedCurriculumUnit.id : true
            ) ?? [],
        [selectedCurriculumTemplatePack, selectedCurriculumUnit]
    )
    const selectedCurriculumTemplate = useMemo(
        () =>
            selectedCurriculumTemplates.find((template) => template.id === curriculumTemplateId) ??
            selectedCurriculumTemplates[0] ??
            null,
        [curriculumTemplateId, selectedCurriculumTemplates]
    )

    useEffect(() => {
        const firstUnitId = selectedCurriculumPack?.unitOutlines[0]?.id ?? ""
        if (!curriculumUnitId || !selectedCurriculumPack?.unitOutlines.some((unit) => unit.id === curriculumUnitId)) {
            setCurriculumUnitId(firstUnitId)
        }
    }, [curriculumUnitId, selectedCurriculumPack])

    useEffect(() => {
        if (!selectedCurriculumSubject || !selectedCurriculumUnit) return
        setSubject(selectedCurriculumSubject.displayNameTh)
        setGradeLevel(getPrimaryGradeLevelLabel(selectedCurriculumUnit))
    }, [selectedCurriculumSubject, selectedCurriculumUnit])

    useEffect(() => {
        if (!selectedCurriculumTemplate) {
            if (curriculumTemplateId) setCurriculumTemplateId("")
            return
        }
        if (!curriculumTemplateId || !selectedCurriculumTemplates.some((template) => template.id === curriculumTemplateId)) {
            setCurriculumTemplateId(selectedCurriculumTemplate.id)
        }
    }, [curriculumTemplateId, selectedCurriculumTemplate, selectedCurriculumTemplates])

    const canGenerateOutline = sourceMode === "pdf" ? Boolean(file) : sourceText.trim().length >= 20
    const canSaveDraft = lessonDrafts.length > 0 && lessonDrafts.every((lesson) => lesson.outline.title.trim())

    const handleFileSelect = useCallback((selected: File) => {
        if (selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf")) {
            setFile(selected)
            setSourceMode("pdf")
        }
    }, [])

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()
            setDragOver(false)
            const dropped = event.dataTransfer.files[0]
            if (dropped) handleFileSelect(dropped)
        },
        [handleFileSelect]
    )

    function syncOutlineAndTopics(nextOutline: LessonOutlineDraft) {
        if (!selectedLesson) return
        setLessonDrafts((current) =>
            current.map((lesson) => {
                if (lesson.id !== selectedLesson.id) return lesson
                const currentById = new Map(lesson.topics.map((topic) => [topic.id, topic]))
                const topics = nextOutline.topics.map((topic) => {
                const existing = currentById.get(topic.id)
                if (!existing) return createEmptyTopic(topic)
                return {
                    ...existing,
                    title: topic.title,
                    description: topic.description,
                    order: topic.order,
                }
            })
                return { ...lesson, outline: nextOutline, topics }
            })
        )
        setSelectedTopicId((current) => current ?? nextOutline.topics[0]?.id ?? null)
    }

    function setCurrentTopicDrafts(updater: (current: TopicDraft[]) => TopicDraft[]) {
        if (!selectedLesson) return
        setLessonDrafts((current) =>
            current.map((lesson) =>
                lesson.id === selectedLesson.id
                    ? { ...lesson, topics: updater(lesson.topics) }
                    : lesson
            )
        )
    }

    function getCurriculumSelectionState(): CurriculumSelectionState | null {
        if (!selectedCurriculumUnit) return null
        const selection: CurriculumSelectionState = {
            subjectId: curriculumSubjectId,
            unitId: selectedCurriculumUnit.id,
        }

        if (selectedCurriculumTemplate) {
            selection.templateId = selectedCurriculumTemplate.id
            selection.topicIds = selectedCurriculumTemplate.topicStructure.flatMap((topic) => topic.topicIds)
            selection.learningOutcomeIds = selectedCurriculumTemplate.suggestedOutcomeIds
        }

        return selection
    }

    function applyCurriculumContext(subjectId: CanonicalCoreSubjectId, unit: SubjectCurriculumUnitOutline, template?: SubjectLessonTemplate | null) {
        const subjectMeta = getCanonicalSubjectById(subjectId)
        setCurriculumSubjectId(subjectId)
        setCurriculumUnitId(unit.id)
        setCurriculumTemplateId(template?.id ?? "")
        setSubject(subjectMeta?.displayNameTh ?? subjectId)
        setGradeLevel(getPrimaryGradeLevelLabel(unit))
        if (template) {
            setLessonCount("1")
        }
        setLanguage("th")
        setError("")
    }

    function handleCurriculumSubjectChange(value: string) {
        setCurriculumSubjectId(value as CanonicalCoreSubjectId)
    }

    function openCurriculumUnitShell() {
        if (!selectedCurriculumUnit || !selectedCurriculumOutcomePack) return
        applyCurriculumContext(curriculumSubjectId, selectedCurriculumUnit, null)
        const content = buildCurriculumUnitShellContentV2(curriculumSubjectId, selectedCurriculumUnit, selectedCurriculumOutcomePack)
        const bundle = {
            ...createLessonDraftBundleFromContent(content, 0),
            id: createCurriculumUnitDraftId(selectedCurriculumUnit.id),
        }
        setLessonDrafts([bundle])
        setSelectedLessonId(bundle.id)
        setSelectedTopicId(bundle.topics[0]?.id ?? null)
        setSourceSnapshot({ text: "", pdfData: null })
        setStep("outline")
    }

    function openCurriculumTemplateDraft(template: SubjectLessonTemplate) {
        if (!selectedCurriculumUnit || !selectedCurriculumOutcomePack) return
        applyCurriculumContext(curriculumSubjectId, selectedCurriculumUnit, template)
        const content = buildCurriculumTemplateContentV2(curriculumSubjectId, selectedCurriculumUnit, selectedCurriculumOutcomePack, template)
        const bundle = {
            ...createLessonDraftBundleFromContent(content, 0),
            id: createCurriculumTemplateDraftId(template.id),
        }
        setLessonDrafts([bundle])
        setSelectedLessonId(bundle.id)
        setSelectedTopicId(bundle.topics[0]?.id ?? null)
        setSourceSnapshot({ text: "", pdfData: null })
        setStep("outline")
    }

    async function parseSourceIfNeeded(): Promise<SourceSnapshot> {
        if (sourceMode === "text") {
            return { text: sourceText.trim(), pdfData: null }
        }
        if (!file) throw new Error("เลือกไฟล์ PDF ก่อน")

        const formData = new FormData()
        formData.append("file", file)
        const parseRes = await fetch("/api/ai/parse-file", { method: "POST", body: formData })
        if (!parseRes.ok) {
            const err = await parseRes.json().catch(() => ({}))
            throw new Error(err?.message ?? "อ่านไฟล์ PDF ไม่สำเร็จ")
        }
        return (await parseRes.json()) as SourceSnapshot
    }

    async function handleGenerateOutline() {
        if (!canGenerateOutline) return
        setGeneratingOutline(true)
        setError("")
        try {
            const source = await parseSourceIfNeeded()
            setSourceSnapshot(source)
            const curriculumSelection = getCurriculumSelectionState()

            const response = await fetch("/api/ai/lessons/generate-outline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: source.text,
                    pdfData: source.pdfData,
                    subject,
                    gradeLevel,
                    language,
                    lessonCount: Number(lessonCount),
                    curriculumSelection: curriculumSelection ?? undefined,
                }),
            })
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(getLessonErrorMessage(err, "สร้างโครงบทเรียนไม่สำเร็จ"))
            }
            const batch = (await response.json()) as LessonOutlineBatchDraft
            const metadata =
                curriculumSelection && selectedCurriculumUnit && selectedCurriculumOutcomePack
                    ? buildCurriculumMetadata({
                          subjectId: curriculumSelection.subjectId,
                          unit: selectedCurriculumUnit,
                          outcomePack: selectedCurriculumOutcomePack,
                          template: selectedCurriculumTemplate,
                      })
                    : undefined
            const bundles = batch.lessons.map((lesson, index) => createLessonDraftBundle(lesson, index, { metadata }))
            setLessonDrafts(bundles)
            setSelectedLessonId(bundles[0]?.id ?? null)
            setSelectedTopicId(bundles[0]?.topics[0]?.id ?? null)
            setStep("outline")
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด")
        } finally {
            setGeneratingOutline(false)
        }
    }

    async function handleGenerateTopic(topicId: string) {
        if (!outline || !sourceSnapshot) return
        setGeneratingTopicId(topicId)
        setError("")
        try {
            const curriculumSelection = getCurriculumSelectionState()
            const response = await fetch("/api/ai/lessons/generate-topic-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    outline,
                    topicId,
                    text: sourceSnapshot.text,
                    pdfData: sourceSnapshot.pdfData,
                    language,
                    curriculumSelection: curriculumSelection ?? undefined,
                }),
            })
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(getLessonErrorMessage(err, "สร้างเนื้อหาหัวข้อไม่สำเร็จ"))
            }
            const generated = (await response.json()) as LessonTopicContentDraft
            setCurrentTopicDrafts((current) =>
                current.map((topic) =>
                    topic.id === topicId
                        ? {
                              ...topic,
                              contentStatus: "generated",
                              objectives: generated.objectives,
                              sections: generated.sections,
                              documents: topic.documents ?? [],
                          }
                        : topic
                )
            )
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด")
        } finally {
            setGeneratingTopicId(null)
        }
    }

    function markTopicEdited(topicId: string, patch: Partial<TopicDraft>) {
        setCurrentTopicDrafts((current) =>
            current.map((topic) =>
                topic.id === topicId
                    ? {
                          ...topic,
                          ...patch,
                          contentStatus: topic.contentStatus === "empty" ? "edited" : "edited",
                      }
                    : topic
            )
        )
    }

    function updateOutlineTopic(topicId: string, patch: Partial<LessonOutlineDraft["topics"][number]>) {
        if (!outline) return
        const nextOutline = {
            ...outline,
            topics: outline.topics.map((topic) => (topic.id === topicId ? { ...topic, ...patch } : topic)),
        }
        syncOutlineAndTopics(nextOutline)
    }

    function addTopic() {
        if (!outline) return
        const order = outline.topics.length
        const topic = {
            id: createTopicId("หัวข้อใหม่", order),
            title: "หัวข้อใหม่",
            description: "",
            order,
        }
        syncOutlineAndTopics({ ...outline, topics: [...outline.topics, topic] })
        setSelectedTopicId(topic.id)
    }

    function removeTopic(topicId: string) {
        if (!outline || outline.topics.length <= 1) return
        const nextTopics = outline.topics
            .filter((topic) => topic.id !== topicId)
            .map((topic, index) => ({ ...topic, order: index }))
        syncOutlineAndTopics({ ...outline, topics: nextTopics })
        setSelectedTopicId(nextTopics[0]?.id ?? null)
    }

    function moveTopic(topicId: string, direction: -1 | 1) {
        if (!outline) return
        const index = outline.topics.findIndex((topic) => topic.id === topicId)
        const target = index + direction
        if (index < 0 || target < 0 || target >= outline.topics.length) return
        const nextTopics = [...outline.topics]
        const [item] = nextTopics.splice(index, 1)
        nextTopics.splice(target, 0, item)
        syncOutlineAndTopics({
            ...outline,
            topics: nextTopics.map((topic, order) => ({ ...topic, order })),
        })
    }

    async function handleSaveDraft() {
        if (lessonDrafts.length === 0) return
        setSaving(true)
        setError("")
        try {
            for (const lesson of lessonDrafts) {
                const content = buildContentV2(lesson.outline, lesson.topics, lesson.metadata)
                const response = await fetch("/api/lessons", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: lesson.outline.title,
                        subject: lesson.outline.subject || subject || undefined,
                        gradeLevel: lesson.outline.gradeLevel || gradeLevel || undefined,
                        description: lesson.outline.description || undefined,
                        sourceFileName: sourceMode === "pdf" ? file?.name : undefined,
                        content,
                    }),
                })
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}))
                    throw new Error(getLessonErrorMessage(err, "บันทึกบทเรียนไม่สำเร็จ"))
                }
            }
            router.push(lessonListHref)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "บันทึกบทเรียนไม่สำเร็จ")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageBackLink href={lessonListHref} label="บทเรียนของฉัน" />

            <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        <GraduationCap className="h-4 w-4" />
                        AI Lesson Wizard
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">สร้างบทเรียนใหม่</h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            ให้ AI แบ่งแหล่งข้อมูลเป็นหลายบทเรียนก่อน แล้วแต่ละบทเรียนจะแบ่งหัวข้อตามเนื้อหาให้อัตโนมัติ
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {WIZARD_STEPS.map((item, index) => {
                        const activeIndex = WIZARD_STEPS.findIndex((entry) => entry.value === step)
                        const done = index < activeIndex
                        const active = item.value === step
                        return (
                            <div key={item.value} className="flex items-center gap-2">
                                {index > 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                                <div
                                    className={cn(
                                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black",
                                        active && "border-emerald-300 bg-emerald-600 text-white",
                                        done && "border-emerald-200 bg-emerald-50 text-emerald-700",
                                        !active && !done && "border-slate-200 bg-white text-slate-400"
                                    )}
                                >
                                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
                                    {item.label}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                </div>
            )}

            {step === "source" && (
                <>
                <section className="rounded-[1.75rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-black text-sky-700">
                                <GraduationCap className="h-3.5 w-3.5" />
                                Curriculum Builder
                            </div>
                            <h2 className="mt-3 text-xl font-black text-slate-950">เลือกวิชา หน่วย และเทมเพลตจากหลักสูตรกลาง</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                หน้า builder ใหม่จะผูกกับโครงหลักสูตรกลางโดยตรง เพื่อให้ครูเปิด draft มาตรฐานของหน่วย
                                หรือใช้เทมเพลตสอนตั้งต้นก่อนส่ง AI ช่วยแตกบทเรียนและสร้างเนื้อหาในขั้นถัดไป
                            </p>
                        </div>
                        <div className="mt-3">
                            <Button asChild variant="outline" className="rounded-xl border-sky-200 bg-white/80 font-bold text-sky-700 hover:bg-white">
                                <Link href={lessonListHref}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    ดูบทเรียนวิชา/หน่วยนี้
                                </Link>
                            </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-right">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">วิชาที่เลือก</p>
                                <p className="mt-1 text-base font-black text-slate-950">
                                    {selectedCurriculumSubject?.displayNameTh ?? "-"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-right">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">หน่วยที่พร้อมใช้</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">
                                    {selectedCurriculumPack?.unitOutlines.length ?? 0}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-right">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">เทมเพลตที่พร้อมใช้</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">{selectedCurriculumTemplates.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">วิชาแกนกลาง</Label>
                            <Select
                                value={curriculumSubjectId}
                                onValueChange={handleCurriculumSubjectChange}
                            >
                                <SelectTrigger className="rounded-xl bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CORE_SUBJECT_OPTIONS.map((subjectId) => {
                                        const option = getCanonicalSubjectById(subjectId)
                                        return (
                                            <SelectItem key={subjectId} value={subjectId}>
                                                {option?.displayNameTh ?? subjectId}
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">หน่วยหลักสูตร</Label>
                            <Select
                                value={selectedCurriculumUnit?.id ?? ""}
                                onValueChange={setCurriculumUnitId}
                                disabled={!selectedCurriculumPack}
                            >
                                <SelectTrigger className="rounded-xl bg-white">
                                    <SelectValue placeholder="เลือกหน่วย" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(selectedCurriculumPack?.unitOutlines ?? []).map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                            {unit.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">เทมเพลตตั้งต้น</Label>
                            <Select
                                value={curriculumTemplateId || "__unit_shell__"}
                                onValueChange={(value) => setCurriculumTemplateId(value === "__unit_shell__" ? "" : value)}
                            >
                                <SelectTrigger className="rounded-xl bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__unit_shell__">ใช้โครงหน่วยมาตรฐาน</SelectItem>
                                    {selectedCurriculumTemplates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedCurriculumUnit && selectedCurriculumOutcomePack && (
                        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                            <div className="rounded-[1.5rem] border border-sky-200 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-sky-600">
                                            {selectedCurriculumSubject?.displayNameTh ?? curriculumSubjectId}
                                        </p>
                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                            {selectedCurriculumUnit.title}
                                        </h3>
                                    </div>
                                    <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">
                                        {getPrimaryGradeLevelLabel(selectedCurriculumUnit)}
                                        {selectedCurriculumUnit.semester ? ` · เทอม ${selectedCurriculumUnit.semester}` : ""}
                                    </span>
                                </div>
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        หัวข้อในหน่วย {selectedCurriculumOutcomePack.topics.length} หัวข้อ
                                    </p>
                                    <ul className="mt-3 space-y-2">
                                        {selectedCurriculumOutcomePack.topics.slice(0, 5).map((topic, index) => (
                                            <li key={topic.id} className="flex gap-2 text-sm text-slate-700">
                                                <span className="shrink-0 font-black text-sky-600">{index + 1}.</span>
                                                <span>{topic.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {selectedCurriculumOutcomePack.topics.length > 5 && (
                                        <p className="mt-3 text-xs font-bold text-slate-400">
                                            และอีก {selectedCurriculumOutcomePack.topics.length - 5} หัวข้อ
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        type="button"
                                        onClick={openCurriculumUnitShell}
                                        className="rounded-xl bg-sky-600 font-black text-white hover:bg-sky-700"
                                    >
                                        <BookOpen className="mr-2 h-4 w-4" />
                                        เปิด draft ตามหน่วย
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!selectedCurriculumTemplate}
                                        onClick={() => selectedCurriculumTemplate && openCurriculumTemplateDraft(selectedCurriculumTemplate)}
                                        className="rounded-xl font-bold"
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        ใช้เทมเพลตที่เลือก
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {selectedCurriculumTemplate ? (
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wide text-violet-600">
                                                    Selected template
                                                </p>
                                                <h4 className="mt-1 text-base font-black text-slate-900">
                                                    {selectedCurriculumTemplate.title}
                                                </h4>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {selectedCurriculumTemplate.description}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => openCurriculumTemplateDraft(selectedCurriculumTemplate)}
                                                className="rounded-xl font-bold"
                                            >
                                                ใช้ draft นี้
                                            </Button>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
                                                {selectedCurriculumTemplate.topicStructure.length} หัวข้อ
                                            </span>
                                            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700">
                                                {selectedCurriculumTemplate.suggestedOutcomeIds.length} ผลการเรียนรู้
                                            </span>
                                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                                                {selectedCurriculumTemplate.estimatedMinutes} นาที
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 p-6 text-center">
                                        <p className="text-sm font-black text-slate-700">
                                            หน่วยนี้ยังไม่ได้เลือกเทมเพลตเฉพาะ
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            เริ่มจาก draft มาตรฐานของหน่วยได้ทันที แล้วค่อยใช้ AI แตกบทเรียนหรือเติมเนื้อหาในขั้นถัดไป
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="space-y-5">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-black text-slate-900">Step Source: PDF/text</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                                        <span className="block font-black">วางข้อความ</span>
                                        <span className="text-xs opacity-80">ใช้เนื้อหาที่คัดลอกมาแล้ว</span>
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
                                        <span className="text-xs opacity-80">อ่านไฟล์ก่อนสร้างโครงบทเรียน</span>
                                    </span>
                                </Button>
                            </div>
                        </div>

                        {sourceMode === "text" ? (
                            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                <Label className="font-black text-slate-800">ข้อความต้นทาง</Label>
                                <Textarea
                                    value={sourceText}
                                    onChange={(event) => setSourceText(event.target.value)}
                                    rows={14}
                                    className="mt-3 rounded-2xl text-sm"
                                    placeholder="วางเนื้อหาจากหนังสือเรียน แผนการสอน หรือสรุปบทเรียน..."
                                />
                                <p className="mt-2 text-xs font-bold text-slate-400">
                                    {sourceText.trim().length.toLocaleString()} ตัวอักษร
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                <Label className="font-black text-slate-800">ไฟล์ PDF</Label>
                                <div
                                    onDragOver={(event) => {
                                        event.preventDefault()
                                        setDragOver(true)
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "mt-3 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
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
                                        onChange={(event) => event.target.files?.[0] && handleFileSelect(event.target.files[0])}
                                    />
                                    {file ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="h-10 w-10 text-emerald-600" />
                                            <p className="font-black text-slate-800">{file.name}</p>
                                            <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-500 hover:text-red-600"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    setFile(null)
                                                }}
                                            >
                                                <X className="mr-1 h-4 w-4" />
                                                เปลี่ยนไฟล์
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <Upload className="h-10 w-10 text-slate-400" />
                                            <p className="font-black text-slate-700">ลากไฟล์ PDF มาวางที่นี่</p>
                                            <p className="text-sm text-slate-400">หรือคลิกเพื่อเลือกไฟล์</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="space-y-5">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-black text-slate-900">ตั้งค่าโครงบทเรียน</h2>
                            <div className="mt-4 space-y-4">
                                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-sky-700">หลักสูตรที่เลือกด้านบน</p>
                                    <p className="mt-1 font-black text-slate-900">
                                        {selectedCurriculumSubject?.displayNameTh ?? "ยังไม่ได้เลือกวิชา"}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-600">
                                        {selectedCurriculumUnit?.title ?? "ยังไม่ได้เลือกหน่วย"}
                                        {gradeLevel ? ` · ${gradeLevel}` : ""}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">จำนวนบทเรียน</Label>
                                        <Select value={lessonCount} onValueChange={setLessonCount}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                                                    <SelectItem key={count} value={String(count)}>
                                                        {count}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">ภาษา</Label>
                                        <Select value={language} onValueChange={setLanguage}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="th">ไทย</SelectItem>
                                                <SelectItem value="en">English</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {selectedCurriculumTemplate && (
                                    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                                        <p className="text-xs font-black uppercase tracking-wide text-violet-600">Template active</p>
                                        <p className="mt-1 text-sm font-black text-violet-950">{selectedCurriculumTemplate.title}</p>
                                        <p className="mt-1 text-xs text-violet-700">
                                            ผูกกับ {selectedCurriculumTemplate.topicStructure.length} หัวข้อ และ{" "}
                                            {selectedCurriculumTemplate.suggestedOutcomeIds.length} ผลการเรียนรู้
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={handleGenerateOutline}
                            disabled={!canGenerateOutline || generatingOutline}
                            className="w-full rounded-2xl bg-emerald-600 py-6 text-base font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {generatingOutline ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    กำลังแบ่งบทเรียน...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    แบ่งเป็นบทเรียน
                                </>
                            )}
                        </Button>
                    </aside>
                </section>
                </>
            )}

            {step === "outline" && outline && (
                <section className="space-y-5">
                    {lessonDrafts.length > 1 && (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {lessonDrafts.map((lesson, index) => (
                                <button
                                    key={lesson.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedLessonId(lesson.id)
                                        setSelectedTopicId(lesson.topics[0]?.id ?? null)
                                    }}
                                    className={cn(
                                        "rounded-2xl border bg-white p-4 text-left shadow-sm transition",
                                        lesson.id === selectedLesson?.id
                                            ? "border-emerald-300 ring-2 ring-emerald-100"
                                            : "border-slate-200 hover:border-emerald-200"
                                    )}
                                >
                                    <p className="text-xs font-black text-emerald-600">บทเรียน {index + 1}</p>
                                    <p className="mt-1 line-clamp-2 font-black text-slate-900">{lesson.outline.title}</p>
                                    <p className="mt-2 text-xs font-bold text-slate-400">{lesson.outline.topics.length} หัวข้อ</p>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <Label className="font-black text-slate-800">ชื่อบทเรียนที่เลือก</Label>
                                <Input
                                    value={outline.title}
                                    onChange={(event) => syncOutlineAndTopics({ ...outline, title: event.target.value })}
                                    className="rounded-xl text-xl font-black"
                                />
                                <Textarea
                                    value={outline.description ?? ""}
                                    onChange={(event) => syncOutlineAndTopics({ ...outline, description: event.target.value })}
                                    rows={2}
                                    className="rounded-xl text-sm"
                                    placeholder="คำอธิบายสั้นของบทเรียน"
                                />
                            </div>
                            <Button type="button" variant="outline" onClick={addTopic} className="rounded-xl font-bold">
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่มหัวข้อในบทเรียนนี้
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {outline.topics.map((topic, index) => (
                            <div key={topic.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <GripVertical className="h-5 w-5" />
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                                        <Input
                                            value={topic.title}
                                            onChange={(event) => updateOutlineTopic(topic.id, { title: event.target.value })}
                                            className="rounded-xl font-black"
                                        />
                                        <Input
                                            value={topic.description ?? ""}
                                            onChange={(event) => updateOutlineTopic(topic.id, { description: event.target.value })}
                                            className="rounded-xl"
                                            placeholder="คำอธิบายหัวข้อ"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => moveTopic(topic.id, -1)} disabled={index === 0}>
                                            <ChevronDown className="h-4 w-4 rotate-180" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveTopic(topic.id, 1)}
                                            disabled={index === outline.topics.length - 1}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeTopic(topic.id)}
                                            disabled={outline.topics.length <= 1}
                                            className="text-slate-400 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between gap-3">
                        <Button variant="outline" onClick={() => setStep("source")} className="rounded-xl font-bold">
                            กลับไปแหล่งข้อมูล
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedTopicId(outline.topics[0]?.id ?? null)
                                setStep("topics")
                            }}
                            className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                        >
                            ไปสร้างเนื้อหาในบทเรียนนี้
                        </Button>
                    </div>
                </section>
            )}

            {step === "topics" && outline && selectedTopic && (
                <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="space-y-3">
                        {lessonDrafts.length > 1 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                <Label className="mb-2 block text-xs font-black text-slate-500">บทเรียนที่กำลังแก้</Label>
                                <Select
                                    value={selectedLesson?.id ?? ""}
                                    onValueChange={(lessonId) => {
                                        const lesson = lessonDrafts.find((candidate) => candidate.id === lessonId)
                                        setSelectedLessonId(lessonId)
                                        setSelectedTopicId(lesson?.topics[0]?.id ?? null)
                                    }}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lessonDrafts.map((lesson, index) => (
                                            <SelectItem key={lesson.id} value={lesson.id}>
                                                บทเรียน {index + 1}: {lesson.outline.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {topicDrafts.map((topic) => (
                            <button
                                key={topic.id}
                                type="button"
                                onClick={() => setSelectedTopicId(topic.id)}
                                className={cn(
                                    "w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition",
                                    selectedTopic.id === topic.id ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-200"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">หัวข้อ {topic.order + 1}</p>
                                        <h3 className="mt-1 font-black text-slate-900">{topic.title}</h3>
                                    </div>
                                    <span className={cn("rounded-full border px-2 py-1 text-[10px] font-black", statusTone(topic.contentStatus))}>
                                        {statusLabel(topic.contentStatus)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </aside>

                    <div className="space-y-5">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                                        {outline.title}
                                    </p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedTopic.title}</h2>
                                    {selectedTopic.description && <p className="mt-1 text-sm text-slate-500">{selectedTopic.description}</p>}
                                </div>
                                <Button
                                    onClick={() => handleGenerateTopic(selectedTopic.id)}
                                    disabled={generatingTopicId === selectedTopic.id}
                                    className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                                >
                                    {generatingTopicId === selectedTopic.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="mr-2 h-4 w-4" />
                                    )}
                                    สร้างเนื้อหาหัวข้อนี้
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <Target className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-black text-slate-800">วัตถุประสงค์</h3>
                            </div>
                            <div className="space-y-2">
                                {selectedTopic.objectives.map((objective, index) => (
                                    <Textarea
                                        key={index}
                                        value={objective}
                                        onChange={(event) => {
                                            const objectives = [...selectedTopic.objectives]
                                            objectives[index] = event.target.value
                                            markTopicEdited(selectedTopic.id, { objectives })
                                        }}
                                        rows={2}
                                        className="rounded-xl text-sm"
                                    />
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => markTopicEdited(selectedTopic.id, { objectives: [...selectedTopic.objectives, ""] })}
                                    className="rounded-xl font-bold"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    เพิ่มวัตถุประสงค์
                                </Button>
                            </div>
                        </div>

                        {selectedTopic.sections.map((section, sectionIndex) => (
                            <div key={section.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-blue-600" />
                                    <Input
                                        value={section.heading}
                                        onChange={(event) => {
                                            const sections = [...selectedTopic.sections]
                                            sections[sectionIndex] = { ...section, heading: event.target.value }
                                            markTopicEdited(selectedTopic.id, { sections })
                                        }}
                                        className="rounded-xl font-black"
                                    />
                                </div>
                                <Textarea
                                    value={section.content}
                                    onChange={(event) => {
                                        const sections = [...selectedTopic.sections]
                                        sections[sectionIndex] = { ...section, content: event.target.value }
                                        markTopicEdited(selectedTopic.id, { sections })
                                    }}
                                    rows={7}
                                    className="rounded-xl text-sm"
                                />
                                <div className="mt-4">
                                    <MediaBlockEditor
                                        label="คลิปประกอบหัวข้อย่อย"
                                        blocks={section.media ?? []}
                                        onChange={(media) => {
                                            const sections = [...selectedTopic.sections]
                                            sections[sectionIndex] = { ...section, media }
                                            markTopicEdited(selectedTopic.id, { sections })
                                        }}
                                        videoOnly
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-black text-slate-800">เอกสารการเรียนรู้</h3>
                            </div>
                            <TeachingMediaPickerPanel
                                selected={selectedTopic.documents ?? []}
                                allowedTypes={["file", "link"]}
                                title="แนบเอกสารการเรียนรู้"
                                description="อัปไฟล์ใบงาน PDF เอกสารประกอบ หรือแนบลิงก์แหล่งเรียนรู้สำหรับบทเรียนนี้"
                                onChange={(documents) => markTopicEdited(selectedTopic.id, { documents })}
                            />
                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                            <Button variant="outline" onClick={() => setStep("outline")} className="rounded-xl font-bold">
                                กลับไปแก้บทเรียน
                            </Button>
                            <Button
                                onClick={handleSaveDraft}
                                disabled={!canSaveDraft || saving}
                                className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                บันทึก Draft ทั้งหมด ({lessonDrafts.length} บทเรียน)
                            </Button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
