"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
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
    Target,
    Trash2,
    PlaySquare,
    X,
} from "lucide-react"
import { TeachingMediaPickerPanel } from "@/components/dashboard/teaching-media-picker-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageBackLink } from "@/components/ui/page-back-link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    ALL_CANONICAL_GRADE_LEVELS,
    getCanonicalGradeLevelLabel,
    type CanonicalGradeLevel,
} from "@/lib/curriculum/grade-model"
import { getCurriculumStandardByCode } from "@/lib/curriculum/indicators"
import {
    getCanonicalCourseOptions,
    getPrimaryCoreCourseIndicatorCrosswalkRows,
    getSecondaryCoreCourseUnits,
    type CanonicalCourseEntry,
} from "@/lib/curriculum/course-catalog"
import type { SecondaryCoreUnit } from "@/lib/curriculum/import/secondary-core-unit-rows-source"
import {
    getSubjectCurriculumMapPack,
    type SubjectCurriculumUnitOutline,
} from "@/lib/curriculum/map-packs"
import {
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
} from "@/lib/curriculum/subject-catalog"
import { getCurriculumStandardById, type CurriculumStandard } from "@/lib/curriculum/strands-and-standards"
import { SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG } from "@/lib/curriculum/canonical-indicators"
import { type SubjectLessonTemplate } from "@/lib/curriculum/template-master-pack"
import { getSubjectUnitLearningOutcomePack, type SubjectUnitLearningOutcomePack } from "@/lib/curriculum/unit-learning-outcomes"
import { cn } from "@/lib/utils"
import {
    getLessonTopicContentStatus,
    type LessonContentV2,
    type LessonContentMetadata,
    type LessonMediaBlock,
    type LessonOutlineDraft,
} from "@/lib/lessons/lesson-content"
import {
    buildLessonCurriculumHref,
    CORE_SUBJECT_OPTIONS,
    parseLessonCurriculumContext,
} from "@/lib/lessons/lesson-curriculum-context"
import type { TeachingMediaReference } from "@/lib/teaching-media-reference"

type Step = "source" | "outline" | "topics"
type CourseTrack = "basic" | "additional"
type TopicDraft = LessonContentV2["topics"][number]
type CurriculumIndicatorDisplay = {
    id: string
    standardId: string
    indicatorCode: string
    indicatorType: "during" | "terminal"
}
type CurriculumIndicatorRow = {
    standard: CurriculumStandard
    duringIndicators: CurriculumIndicatorDisplay[]
    terminalIndicators: CurriculumIndicatorDisplay[]
}
type LessonDraftBundle = {
    id: string
    outline: LessonOutlineDraft
    topics: TopicDraft[]
    metadata?: LessonContentMetadata
}

const WIZARD_STEPS: Array<{ value: Step; label: string }> = [
    { value: "source", label: "แหล่งข้อมูล" },
    { value: "outline", label: "บทเรียน" },
    { value: "topics", label: "เนื้อหาในบทเรียน" },
]

const COURSE_TRACK_OPTIONS: Array<{ value: CourseTrack; label: string }> = [
    { value: "basic", label: "พื้นฐาน" },
    { value: "additional", label: "เพิ่มเติม" },
]
const DEFAULT_CURRICULUM_SUBJECT_ID: CanonicalCoreSubjectId = "science_technology"

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

function createSectionId() {
    return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

function createCurriculumCourseDraftId(courseId: string) {
    return `curriculum-course-${courseId}`
}

function getPrimaryGradeLevelLabel(unit: SubjectCurriculumUnitOutline) {
    const gradeLevel = unit.gradeLevels[0] as CanonicalGradeLevel | undefined
    return gradeLevel ? getCanonicalGradeLevelLabel(gradeLevel, "th") : ""
}

function buildCurriculumMetadata(input: {
    subjectId: CanonicalCoreSubjectId
    course?: CanonicalCourseEntry | null
    unit: SubjectCurriculumUnitOutline
    outcomePack: SubjectUnitLearningOutcomePack
    template?: SubjectLessonTemplate | null
}) {
    const subject = getCanonicalSubjectById(input.subjectId)
    const primaryCrosswalkRows = input.course ? getPrimaryCoreCourseIndicatorCrosswalkRows(input.course) : []
    const primaryStandardIds = Array.from(
        new Set(
            primaryCrosswalkRows
                .map((row) => getCurriculumStandardByCode(row.standardCode)?.id)
                .filter((standardId): standardId is string => Boolean(standardId))
        )
    )
    const primaryDuringIndicatorIds = primaryCrosswalkRows.flatMap((row) =>
        row.duringIndicators.map((indicator) => indicator.code)
    )
    const primaryTerminalIndicatorIds = primaryCrosswalkRows.flatMap((row) =>
        row.terminalIndicators.map((indicator) => indicator.code)
    )
    const learningOutcomeIds = input.template?.suggestedOutcomeIds?.length
        ? input.template.suggestedOutcomeIds
        : input.outcomePack.learningOutcomes.map((outcome) => outcome.id)

    return {
        curriculum: {
            subject: subject?.displayNameTh ?? input.subjectId,
            curriculumCode: "basic_education_2551",
            gradeLevel: input.course ? getCanonicalGradeLevelLabel(input.course.gradeLevel, "th") : getPrimaryGradeLevelLabel(input.unit),
            semester: input.course?.semester ?? input.unit.semester,
            courseId: input.course?.id,
            courseTitle: input.course?.titleTh,
            unitId: input.unit.id,
            standardIds: primaryStandardIds.length > 0 ? primaryStandardIds : input.course?.standardIds ?? input.unit.standardIds,
            duringIndicatorIds: primaryDuringIndicatorIds.length > 0 ? primaryDuringIndicatorIds : input.course?.duringIndicatorIds,
            terminalIndicatorIds: primaryTerminalIndicatorIds.length > 0 ? primaryTerminalIndicatorIds : input.course?.terminalIndicatorIds,
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

function buildCurriculumCourseShellContentV2(
    subjectId: CanonicalCoreSubjectId,
    course: CanonicalCourseEntry,
    unit: SubjectCurriculumUnitOutline,
    outcomePack: SubjectUnitLearningOutcomePack,
    realUnits: SecondaryCoreUnit[]
): LessonContentV2 {
    const subject = getCanonicalSubjectById(subjectId)

    // Prefer the real DOCX learning units (one lesson topic per หน่วยการเรียนรู้);
    // fall back to the synthetic outcome-pack topics when the course has none.
    if (realUnits.length > 0) {
        const realUnitObjectivesByTopicId = new Map<string, string[]>()
        const outline: LessonOutlineDraft = {
            title: course.titleTh,
            description: unit.notes?.[0] ?? `โครงบทเรียนจากรายวิชา ${course.titleTh}`,
            subject: subject?.displayNameTh ?? subjectId,
            gradeLevel: getCanonicalGradeLevelLabel(course.gradeLevel, "th"),
            topics: realUnits.map((realUnit, index) => {
                const indicators = [...realUnit.duringIndicators, ...realUnit.terminalIndicators]
                const indicatorCodes = indicators.map((indicator) => indicator.code)
                const objectives = indicators
                    .map((indicator) => indicator.description?.trim())
                    .filter((text): text is string => Boolean(text))
                const topicId = `${course.id}-unit-${realUnit.unitNumber}-${index}`
                if (objectives.length > 0) {
                    realUnitObjectivesByTopicId.set(topicId, objectives)
                }
                return {
                    id: topicId,
                    title: realUnit.title,
                    description:
                        realUnit.summary ??
                        (indicatorCodes.length > 0 ? `ตัวชี้วัด: ${indicatorCodes.join(", ")}` : undefined),
                    order: index,
                }
            }),
        }

        const topics = outline.topics.map((topic) => ({
            ...createEmptyTopic(topic),
            objectives: realUnitObjectivesByTopicId.get(topic.id) ?? [],
        }))

        return buildContentV2(outline, topics, buildCurriculumMetadata({ subjectId, course, unit, outcomePack }))
    }

    const objectivesByTopicId = new Map<string, string[]>()
    for (const outcome of outcomePack.learningOutcomes) {
        for (const topicId of outcome.topicIds) {
            const current = objectivesByTopicId.get(topicId) ?? []
            current.push(outcome.text)
            objectivesByTopicId.set(topicId, current)
        }
    }

    const outline: LessonOutlineDraft = {
        title: course.titleTh,
        description: unit.notes?.[0] ?? `โครงบทเรียนจากรายวิชา ${course.titleTh}`,
        subject: subject?.displayNameTh ?? subjectId,
        gradeLevel: getCanonicalGradeLevelLabel(course.gradeLevel, "th"),
        topics: outcomePack.topics.map((topic, index) => ({
            id: topic.id,
            title: topic.title,
            description:
                topic.notes?.[0] ??
                objectivesByTopicId.get(topic.id)?.[0] ??
                undefined,
            order: index,
        })),
    }

    const topics = outline.topics.map((topic) => ({
        ...createEmptyTopic(topic),
        objectives: objectivesByTopicId.get(topic.id) ?? [],
    }))

    return buildContentV2(outline, topics, buildCurriculumMetadata({ subjectId, course, unit, outcomePack }))
}

function buildContentV2(outline: LessonOutlineDraft, topics: TopicDraft[], metadata?: LessonContentMetadata): LessonContentV2 {
    const normalizedTopics = topics.map((topic) => {
        return { ...topic, contentStatus: getLessonTopicContentStatus(topic) }
    })
    return {
        schemaVersion: "lesson_content_v2",
        outline,
        topics: normalizedTopics,
        estimatedMinutes: Math.max(10, normalizedTopics.filter((topic) => topic.contentStatus !== "empty").length * 12),
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
    if (status === "generated") return "สร้างแล้ว"
    if (status === "edited") return "แก้ไขแล้ว"
    return "ยังไม่ใส่เนื้อหา"
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

    const manualMode = searchParams.get("mode") === "manual"

    const [step, setStep] = useState<Step>("source")
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [manualTitle, setManualTitle] = useState("")

    const [lessonDrafts, setLessonDrafts] = useState<LessonDraftBundle[]>([])
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
    const [curriculumSubjectId, setCurriculumSubjectId] = useState<CanonicalCoreSubjectId>(DEFAULT_CURRICULUM_SUBJECT_ID)
    const [curriculumCourseTrack, setCurriculumCourseTrack] = useState<CourseTrack>("basic")
    const [curriculumCourseGradeLevel, setCurriculumCourseGradeLevel] = useState<CanonicalGradeLevel>("m4")
    const [curriculumCourseId, setCurriculumCourseId] = useState("")
    const [curriculumUnitId, setCurriculumUnitId] = useState("")
    const [, setCurriculumTemplateId] = useState("")
    const [courseDescriptionExpanded, setCourseDescriptionExpanded] = useState(false)
    const [expandedUnitNumbers, setExpandedUnitNumbers] = useState<Set<number>>(new Set())
    const [expandedStandardIds, setExpandedStandardIds] = useState<Set<string>>(new Set())

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const initialCurriculumContext = useMemo(() => parseLessonCurriculumContext(searchParams), [searchParams])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const subjectParam = params.get("subject")
        const subjectIdParam = params.get("subjectId")
        const effectiveSubjectId =
            subjectIdParam && CORE_SUBJECT_OPTIONS.includes(subjectIdParam as CanonicalCoreSubjectId)
                ? (subjectIdParam as CanonicalCoreSubjectId)
                : DEFAULT_CURRICULUM_SUBJECT_ID
        const gradeLevelParam = params.get("gradeLevel")
        const unitId = params.get("unitId")
        if (subjectParam) setSubject(subjectParam)
        if (subjectIdParam && CORE_SUBJECT_OPTIONS.includes(subjectIdParam as CanonicalCoreSubjectId)) {
            setCurriculumSubjectId(subjectIdParam as CanonicalCoreSubjectId)
        }
        if (gradeLevelParam) setGradeLevel(gradeLevelParam)
        if (unitId) {
            setCurriculumUnitId(unitId)
        }
        const matchedCourse = unitId
            ? getCanonicalCourseOptions(effectiveSubjectId).find(
                  (entry) =>
                      entry.unitIds.includes(unitId) &&
                      (!gradeLevelParam || getCanonicalGradeLevelLabel(entry.gradeLevel, "th") === gradeLevelParam)
              ) ?? getCanonicalCourseOptions(effectiveSubjectId).find((entry) => entry.unitIds.includes(unitId))
            : null
        if (matchedCourse) {
            setCurriculumCourseGradeLevel(matchedCourse.gradeLevel)
            setCurriculumCourseId(matchedCourse.id)
        }
    }, [])

    const selectedLesson = useMemo(
        () => lessonDrafts.find((lesson) => lesson.id === selectedLessonId) ?? lessonDrafts[0] ?? null,
        [selectedLessonId, lessonDrafts]
    )
    const outline = selectedLesson?.outline ?? null
    const topicDrafts = useMemo(() => selectedLesson?.topics ?? [], [selectedLesson])
    const selectedTopic = useMemo(
        () => topicDrafts.find((topic) => topic.id === selectedTopicId) ?? topicDrafts[0] ?? null,
        [selectedTopicId, topicDrafts]
    )
    const selectedCurriculumSubject = useMemo(
        () => getCanonicalSubjectById(curriculumSubjectId),
        [curriculumSubjectId]
    )
    const availableCurriculumCourseGradeLevels = useMemo(
        () =>
            ALL_CANONICAL_GRADE_LEVELS.filter((grade) => getCanonicalCourseOptions(curriculumSubjectId, grade).length > 0),
        [curriculumSubjectId]
    )
    const availableCurriculumCourseEntries = useMemo(
        () =>
            curriculumCourseTrack === "basic"
                ? getCanonicalCourseOptions(curriculumSubjectId, curriculumCourseGradeLevel)
                : [],
        [curriculumCourseGradeLevel, curriculumCourseTrack, curriculumSubjectId]
    )
    const selectedCurriculumCourse = useMemo<CanonicalCourseEntry | null>(
        () =>
            availableCurriculumCourseEntries.find((entry) => entry.id === curriculumCourseId) ??
            availableCurriculumCourseEntries[0] ??
            null,
        [availableCurriculumCourseEntries, curriculumCourseId]
    )
    const availableCurriculumUnitsForCourse = useMemo<SubjectCurriculumUnitOutline[]>(
        () => {
            if (!selectedCurriculumCourse) return []
            const unitMap = new Map(
                (getSubjectCurriculumMapPack(curriculumSubjectId)?.unitOutlines ?? []).map((unit) => [unit.id, unit])
            )
            return selectedCurriculumCourse.unitIds
                .map((unitId) => unitMap.get(unitId) ?? null)
                .filter((unit): unit is SubjectCurriculumUnitOutline => Boolean(unit))
        },
        [curriculumSubjectId, selectedCurriculumCourse]
    )
    const selectedCurriculumRealUnits = useMemo<SecondaryCoreUnit[]>(
        () => (selectedCurriculumCourse ? getSecondaryCoreCourseUnits(selectedCurriculumCourse) : []),
        [selectedCurriculumCourse]
    )
    const selectedCurriculumUnit = useMemo<SubjectCurriculumUnitOutline | null>(
        () => {
            if (availableCurriculumUnitsForCourse.length === 0) return null
            return (
                availableCurriculumUnitsForCourse.find((unit) => unit.id === curriculumUnitId) ??
                availableCurriculumUnitsForCourse[0] ??
                null
            )
        },
        [availableCurriculumUnitsForCourse, curriculumUnitId]
    )
    const selectedCurriculumOutcomePack = useMemo<SubjectUnitLearningOutcomePack | null>(
        () => (selectedCurriculumUnit ? getSubjectUnitLearningOutcomePack(curriculumSubjectId, selectedCurriculumUnit.id) : null),
        [curriculumSubjectId, selectedCurriculumUnit]
    )
    const lessonListHref = useMemo(
        () =>
            buildLessonCurriculumHref("/dashboard/lessons", {
                subjectId: curriculumSubjectId ?? initialCurriculumContext.subjectId,
                unitId: selectedCurriculumUnit?.id ?? (curriculumUnitId || initialCurriculumContext.unitId),
            }),
        [curriculumSubjectId, curriculumUnitId, initialCurriculumContext.subjectId, initialCurriculumContext.unitId, selectedCurriculumUnit?.id]
    )
    const selectedPrimaryIndicatorCrosswalkRows = useMemo(
        () => (selectedCurriculumCourse ? getPrimaryCoreCourseIndicatorCrosswalkRows(selectedCurriculumCourse) : []),
        [selectedCurriculumCourse]
    )
    const selectedCurriculumStandards = useMemo(
        () => {
            if (selectedPrimaryIndicatorCrosswalkRows.length > 0) {
                const seen = new Set<string>()
                return selectedPrimaryIndicatorCrosswalkRows
                    .map((row) => getCurriculumStandardByCode(row.standardCode))
                    .filter((standard): standard is CurriculumStandard => {
                        if (!standard || seen.has(standard.id)) return false
                        seen.add(standard.id)
                        return true
                    })
            }
            return (
                selectedCurriculumCourse?.standardIds
                    .map((standardId) => getCurriculumStandardById(standardId))
                    .filter((standard): standard is CurriculumStandard => Boolean(standard)) ?? []
            )
        },
        [selectedCurriculumCourse, selectedPrimaryIndicatorCrosswalkRows]
    )
    const selectedCurriculumIndicators = useMemo<CurriculumIndicatorDisplay[]>(
        () => {
            if (!selectedCurriculumCourse) return []
            const wanted = new Set([
                ...selectedCurriculumCourse.duringIndicatorIds,
                ...selectedCurriculumCourse.terminalIndicatorIds,
            ])
            const canonicalIndicators = SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG.indicators.filter((indicator) =>
                wanted.has(indicator.id)
            )
            if (canonicalIndicators.length > 0) return canonicalIndicators

            return selectedPrimaryIndicatorCrosswalkRows.flatMap((row, rowIndex) => {
                const duringIndicators = row.duringIndicators.map((indicator, indicatorIndex) => {
                    const standard = getCurriculumStandardByCode(indicator.standardCode)
                    if (!standard) return null
                    return {
                        id: `${selectedCurriculumCourse.id}:during:${rowIndex}:${indicatorIndex}:${indicator.code}`,
                        standardId: standard.id,
                        indicatorCode: indicator.code,
                        indicatorType: "during" as const,
                    }
                })
                const terminalIndicators = row.terminalIndicators.map((indicator, indicatorIndex) => {
                    const standard = getCurriculumStandardByCode(indicator.standardCode)
                    if (!standard) return null
                    return {
                        id: `${selectedCurriculumCourse.id}:terminal:${rowIndex}:${indicatorIndex}:${indicator.code}`,
                        standardId: standard.id,
                        indicatorCode: indicator.code,
                        indicatorType: "terminal" as const,
                    }
                })
                return [...duringIndicators, ...terminalIndicators].filter((indicator): indicator is CurriculumIndicatorDisplay => Boolean(indicator))
            })
        },
        [selectedCurriculumCourse, selectedPrimaryIndicatorCrosswalkRows]
    )
    const selectedCurriculumDuringIndicators = useMemo(
        () => selectedCurriculumIndicators.filter((indicator) => indicator.indicatorType === "during"),
        [selectedCurriculumIndicators]
    )
    const selectedCurriculumTerminalIndicators = useMemo(
        () => selectedCurriculumIndicators.filter((indicator) => indicator.indicatorType === "terminal"),
        [selectedCurriculumIndicators]
    )
    const selectedCurriculumIndicatorRows = useMemo(
        () => {
            if (selectedCurriculumCourse && selectedPrimaryIndicatorCrosswalkRows.length > 0) {
                return selectedPrimaryIndicatorCrosswalkRows
                    .map<CurriculumIndicatorRow | null>((row, rowIndex) => {
                        const standard = getCurriculumStandardByCode(row.standardCode)
                        if (!standard) return null
                        return {
                            standard,
                            duringIndicators: row.duringIndicators.map((indicator, indicatorIndex) => ({
                                id: `${selectedCurriculumCourse.id}:during-row:${rowIndex}:${indicatorIndex}:${indicator.code}`,
                                standardId: standard.id,
                                indicatorCode: indicator.code,
                                indicatorType: "during" as const,
                            })),
                            terminalIndicators: row.terminalIndicators.map((indicator, indicatorIndex) => ({
                                id: `${selectedCurriculumCourse.id}:terminal-row:${rowIndex}:${indicatorIndex}:${indicator.code}`,
                                standardId: standard.id,
                                indicatorCode: indicator.code,
                                indicatorType: "terminal" as const,
                            })),
                        }
                    })
                    .filter((row): row is CurriculumIndicatorRow => Boolean(row))
            }
            return selectedCurriculumStandards.map((standard) => {
                const duringIndicators = selectedCurriculumDuringIndicators.filter(
                    (indicator) => indicator.standardId === standard.id
                )
                const terminalIndicators = selectedCurriculumTerminalIndicators.filter(
                    (indicator) => indicator.standardId === standard.id
                )

                return {
                    standard,
                    duringIndicators,
                    terminalIndicators,
                }
            })
        },
        [
            selectedCurriculumCourse,
            selectedCurriculumDuringIndicators,
            selectedCurriculumStandards,
            selectedCurriculumTerminalIndicators,
            selectedPrimaryIndicatorCrosswalkRows,
        ]
    )
    const selectedCourseDescription =
        selectedCurriculumCourse?.descriptionText?.trim() || "ยังไม่มีคำอธิบายรายวิชาใน canonical catalog"
    const shouldCollapseCourseDescription = selectedCourseDescription.length > 180
    const availableCurriculumGradeLabels = useMemo(
        () =>
            selectedCurriculumCourse
                ? [getCanonicalGradeLevelLabel(selectedCurriculumCourse.gradeLevel, "th")]
                : [],
        [selectedCurriculumCourse]
    )
    const availableCurriculumSemesters = useMemo(
        () =>
            Array.from(
                new Set(
                    (selectedCurriculumCourse?.semester ? [selectedCurriculumCourse.semester] : []).filter(
                        (semester): semester is 1 | 2 => semester === 1 || semester === 2
                    )
                )
            ).sort((left, right) => left - right),
        [selectedCurriculumCourse]
    )

    useEffect(() => {
        const firstGradeLevel = availableCurriculumCourseGradeLevels[0] ?? "m1"
        if (!availableCurriculumCourseGradeLevels.includes(curriculumCourseGradeLevel)) {
            setCurriculumCourseGradeLevel(firstGradeLevel)
            setCurriculumCourseId("")
        }
    }, [availableCurriculumCourseGradeLevels, curriculumCourseGradeLevel])

    useEffect(() => {
        const firstCourseId = availableCurriculumCourseEntries[0]?.id ?? ""
        if (!curriculumCourseId || !availableCurriculumCourseEntries.some((entry) => entry.id === curriculumCourseId)) {
            setCurriculumCourseId(firstCourseId)
            setCurriculumUnitId("")
            setCurriculumTemplateId("")
        }
    }, [availableCurriculumCourseEntries, curriculumCourseId])

    useEffect(() => {
        const firstUnitId = availableCurriculumUnitsForCourse[0]?.id ?? ""
        if (!curriculumUnitId || !availableCurriculumUnitsForCourse.some((unit) => unit.id === curriculumUnitId)) {
            setCurriculumUnitId(firstUnitId)
            setCurriculumTemplateId("")
        }
    }, [availableCurriculumUnitsForCourse, curriculumUnitId])

    useEffect(() => {
        setCourseDescriptionExpanded(false)
    }, [selectedCurriculumCourse?.id])

    useEffect(() => {
        if (!selectedCurriculumCourse || !selectedCurriculumUnit) return
        if (curriculumUnitId !== selectedCurriculumUnit.id) setCurriculumUnitId(selectedCurriculumUnit.id)
        setSubject(selectedCurriculumSubject?.displayNameTh ?? curriculumSubjectId)
        setGradeLevel(getCanonicalGradeLevelLabel(selectedCurriculumCourse.gradeLevel, "th"))
    }, [
        curriculumSubjectId,
        curriculumUnitId,
        selectedCurriculumCourse,
        selectedCurriculumSubject,
        selectedCurriculumUnit,
    ])

    const canSaveDraft = lessonDrafts.length > 0 && lessonDrafts.every((lesson) => lesson.outline.title.trim())

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

    function markTopicEdited(topicId: string, patch: Partial<TopicDraft>) {
        setCurrentTopicDrafts((current) =>
            current.map((topic) =>
                topic.id === topicId
                    ? {
                          ...topic,
                          ...patch,
                          contentStatus: "edited",
                      }
                    : topic
            )
        )
    }

    function handleCurriculumSubjectChange(value: string) {
        setCurriculumSubjectId(value as CanonicalCoreSubjectId)
        setCurriculumCourseId("")
        setCurriculumCourseGradeLevel("m1")
        setCurriculumUnitId("")
        setCurriculumTemplateId("")
    }

    function handleCurriculumCourseTrackChange(value: string) {
        setCurriculumCourseTrack(value as CourseTrack)
        setCurriculumCourseId("")
        setCurriculumUnitId("")
        setCurriculumTemplateId("")
    }

    function openCurriculumStandardShell() {
        if (!selectedCurriculumCourse || !selectedCurriculumUnit || !selectedCurriculumOutcomePack) {
            setError("กรุณาเลือกรายวิชา ชั้นเรียน และหน่วยที่พร้อมใช้งานก่อน")
            return
        }

        const bundle = {
            ...createLessonDraftBundleFromContent(
                buildCurriculumCourseShellContentV2(
                    curriculumSubjectId,
                    selectedCurriculumCourse,
                    selectedCurriculumUnit,
                    selectedCurriculumOutcomePack,
                    selectedCurriculumRealUnits
                ),
                0
            ),
            id: createCurriculumCourseDraftId(selectedCurriculumCourse.id),
        }

        setCurriculumUnitId(selectedCurriculumUnit.id)
        setCurriculumTemplateId("")
        setSubject(selectedCurriculumSubject?.displayNameTh ?? curriculumSubjectId)
        setGradeLevel(getCanonicalGradeLevelLabel(selectedCurriculumCourse.gradeLevel, "th"))
        setLessonDrafts([bundle])
        setSelectedLessonId(bundle.id)
        setSelectedTopicId(bundle.topics[0]?.id ?? null)
        setError("")
        setStep("outline")
    }

    function startManualLesson() {
        const subjectLabel = selectedCurriculumSubject?.displayNameTh ?? curriculumSubjectId
        const gradeLabel = getCanonicalGradeLevelLabel(curriculumCourseGradeLevel, "th")
        const topicId = createTopicId("หัวข้อใหม่", 0)
        const outline: LessonOutlineDraft = {
            title: manualTitle.trim() || "บทเรียนใหม่",
            description: "",
            subject: subjectLabel,
            gradeLevel: gradeLabel,
            topics: [{ id: topicId, title: "หัวข้อที่ 1", description: "", order: 0 }],
        }
        const bundle = createLessonDraftBundle(outline, 0)
        setSubject(subjectLabel)
        setGradeLevel(gradeLabel)
        setLessonDrafts([bundle])
        setSelectedLessonId(bundle.id)
        setSelectedTopicId(bundle.topics[0]?.id ?? null)
        setError("")
        setStep("outline")
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
                        sourceFileName: undefined,
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
                        {manualMode ? "สร้างบทเรียนเอง" : "สร้างบทเรียนจากหลักสูตร"}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">สร้างบทเรียนใหม่</h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            {manualMode
                                ? "เลือกวิชาแกนกลางและชั้นเรียนจากระบบ แล้วตั้งชื่อบทเรียน จากนั้นเพิ่มหัวข้อ เนื้อหา วิดีโอ และแบบทดสอบเองทั้งหมด"
                                : "เลือกรายวิชาและชั้นเรียนจากหลักสูตร ระบบจะสร้างหัวข้อจากหน่วยการเรียนรู้จริง แล้วครูใส่เนื้อหา วิดีโอ และเอกสารเอง"}
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

            {step === "source" && manualMode && (
                <section className="rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                                <GraduationCap className="h-3.5 w-3.5" />
                                สร้างบทเรียนเอง
                            </div>
                            <h2 className="mt-3 text-xl font-black text-slate-950">กรอกข้อมูลบทเรียนเอง</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                เลือกวิชาแกนกลางและชั้นเรียนจากระบบ แล้วตั้งชื่อบทเรียน จากนั้นเพิ่มหัวข้อ เนื้อหา วิดีโอ และแบบทดสอบเองได้ทั้งหมด
                            </p>
                        </div>
                        <div className="mt-3">
                            <Button asChild variant="outline" className="rounded-xl border-emerald-200 bg-white font-bold text-emerald-700 hover:bg-emerald-50">
                                <Link href={lessonListHref}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    ดูบทเรียนของฉัน
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">วิชาแกนกลาง</Label>
                            <Select value={curriculumSubjectId} onValueChange={handleCurriculumSubjectChange}>
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
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

                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">ประเภทวิชา</Label>
                            <Select value={curriculumCourseTrack} onValueChange={handleCurriculumCourseTrackChange}>
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COURSE_TRACK_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">ชั้นเรียน</Label>
                            <Select
                                value={curriculumCourseGradeLevel}
                                onValueChange={(value) => setCurriculumCourseGradeLevel(value as CanonicalGradeLevel)}
                                disabled={availableCurriculumCourseGradeLevels.length === 0}
                            >
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
                                    <SelectValue placeholder="เลือกชั้นเรียน" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCurriculumCourseGradeLevels.map((grade) => (
                                        <SelectItem key={grade} value={grade}>
                                            {getCanonicalGradeLevelLabel(grade, "th")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">ชื่อบทเรียน</Label>
                            <Input
                                value={manualTitle}
                                onChange={(event) => setManualTitle(event.target.value)}
                                placeholder="เช่น แรงและการเคลื่อนที่"
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <Button onClick={startManualLesson} className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700">
                            <BookOpen className="mr-2 h-4 w-4" />
                            เริ่มสร้างบทเรียน
                        </Button>
                    </div>
                </section>
            )}

            {step === "source" && !manualMode && (
                <section className="rounded-[1.75rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-black text-sky-700">
                                <GraduationCap className="h-3.5 w-3.5" />
                                สร้างจากหลักสูตร
                            </div>
                            <h2 className="mt-3 text-xl font-black text-slate-950">เลือกวิชาแกนกลาง รายวิชา และชั้นเรียน</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                ขั้นนี้ให้เลือกข้อมูลหลักสูตรให้ครบก่อน ระบบจะแสดงมาตรฐาน ตัวชี้วัดระหว่างทาง ตัวชี้วัดปลายทาง
                                และคำอธิบายรายวิชาแบบอ่านอย่างเดียว เพื่อให้ครูตรวจสอบก่อนสร้างบทเรียนตั้งต้น
                            </p>
                        </div>
                        <div className="mt-3">
                            <Button asChild variant="outline" className="rounded-xl border-sky-200 bg-white/80 font-bold text-sky-700 hover:bg-white">
                                <Link href={lessonListHref}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    ดูบทเรียนของฉัน
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-right">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">วิชาที่เลือก</p>
                            <p className="mt-1 text-base font-black text-slate-950">{selectedCurriculumSubject?.displayNameTh ?? "-"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-right">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">รายวิชาที่พร้อมใช้</p>
                            <p className="mt-1 text-2xl font-black text-slate-950">{availableCurriculumCourseEntries.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-right">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">มาตรฐานที่พบ</p>
                            <p className="mt-1 text-2xl font-black text-slate-950">{selectedCurriculumStandards.length}</p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">วิชาแกนกลาง</Label>
                            <Select value={curriculumSubjectId} onValueChange={handleCurriculumSubjectChange}>
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
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

                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">ประเภทวิชา</Label>
                            <Select value={curriculumCourseTrack} onValueChange={handleCurriculumCourseTrackChange}>
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COURSE_TRACK_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">ชั้นเรียน</Label>
                            <Select
                                value={curriculumCourseGradeLevel}
                                onValueChange={(value) => {
                                    setCurriculumCourseGradeLevel(value as CanonicalGradeLevel)
                                    setCurriculumCourseId("")
                                    setCurriculumUnitId("")
                                    setCurriculumTemplateId("")
                                }}
                                disabled={availableCurriculumCourseGradeLevels.length === 0}
                            >
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
                                    <SelectValue placeholder="เลือกชั้นเรียน" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCurriculumCourseGradeLevels.map((grade) => (
                                        <SelectItem key={grade} value={grade}>
                                            {getCanonicalGradeLevelLabel(grade, "th")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-2">
                            <Label className="font-bold text-slate-700">รายวิชา</Label>
                            <Select
                                value={selectedCurriculumCourse?.id ?? curriculumCourseId}
                                onValueChange={(value) => {
                                    setCurriculumCourseId(value)
                                    setCurriculumUnitId("")
                                    setCurriculumTemplateId("")
                                }}
                                disabled={availableCurriculumCourseEntries.length === 0}
                            >
                                <SelectTrigger className="w-full min-w-0 rounded-xl bg-white [&>span]:truncate">
                                    <SelectValue
                                        placeholder={
                                            curriculumCourseTrack === "additional"
                                                ? "ยังไม่มีรายวิชาเพิ่มเติม"
                                                : "เลือกรายวิชา"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCurriculumCourseEntries.map((entry) => (
                                        <SelectItem key={entry.id} value={entry.id}>
                                            {entry.titleTh}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {curriculumCourseTrack === "additional" && (
                                <p className="text-xs font-bold text-slate-500">
                                    ยังไม่มีข้อมูลรายวิชาเพิ่มเติม ตอนนี้รายวิชาที่สร้างไว้ทั้งหมดอยู่ในประเภทพื้นฐาน
                                </p>
                            )}
                        </div>
                    </div>

                    {selectedCurriculumCourse && (
                        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
                            <div className="rounded-[1.5rem] border border-sky-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-sky-600">ข้อมูลรายวิชา</p>
                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                            {selectedCurriculumSubject?.displayNameTh ?? "-"}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-600">{selectedCurriculumCourse.titleTh}</p>
                                        <p className="mt-1 text-sm font-bold text-slate-700">
                                            {getCanonicalGradeLevelLabel(selectedCurriculumCourse.gradeLevel, "th")}
                                            {selectedCurriculumCourse.semester ? " (เทอม " + selectedCurriculumCourse.semester + ")" : ""}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-sky-50 px-4 py-3 text-right">
                                        <p className="text-xs font-black text-sky-600">หน่วยที่พร้อมสร้าง</p>
                                        <p className="mt-1 text-2xl font-black text-sky-900">{selectedCurriculumRealUnits.length}</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">ชั้นเรียน</p>
                                        <p className="mt-2 text-sm font-bold text-slate-800">
                                            {availableCurriculumGradeLabels.length > 0 ? availableCurriculumGradeLabels.join(", ") : "ยังไม่มีข้อมูลชั้นเรียน"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">เทอม</p>
                                        <p className="mt-2 text-sm font-bold text-slate-800">
                                            {availableCurriculumSemesters.length > 0
                                                ? availableCurriculumSemesters.map((semester) => "เทอม " + semester).join(", ")
                                                : "ยังไม่มีข้อมูลเทอม"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-sky-600">
                                                คำอธิบายรายวิชา
                                            </p>
                                            <p className="mt-1 text-xs font-bold text-sky-700">
                                                ใช้เป็นบริบทหลักก่อนสร้างหน่วยและบทเรียน
                                            </p>
                                        </div>
                                        {shouldCollapseCourseDescription ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCourseDescriptionExpanded((current) => !current)}
                                                className="shrink-0 rounded-full border-sky-200 bg-white text-xs font-black text-sky-700 hover:bg-sky-50"
                                            >
                                                {courseDescriptionExpanded ? "ย่อ" : "อ่านทั้งหมด"}
                                                <ChevronDown
                                                    className={cn(
                                                        "ml-1 h-3.5 w-3.5 transition-transform",
                                                        courseDescriptionExpanded && "rotate-180"
                                                    )}
                                                />
                                            </Button>
                                        ) : null}
                                    </div>
                                    <div
                                        className={cn(
                                            "relative mt-3 text-sm leading-7 text-slate-700",
                                            !courseDescriptionExpanded && shouldCollapseCourseDescription && "max-h-28 overflow-hidden"
                                        )}
                                    >
                                        <p>{selectedCourseDescription}</p>
                                        {!courseDescriptionExpanded && shouldCollapseCourseDescription ? (
                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-sky-50 to-transparent" />
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-sky-600">
                                                หน่วยการเรียนรู้ในรายวิชานี้
                                            </p>
                                            <p className="mt-1 text-xs font-bold text-sky-700">
                                                หน่วยการเรียนรู้จริงตามโครงสร้างรายวิชา สพฐ.
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-800">
                                            {selectedCurriculumRealUnits.length} หน่วย
                                        </span>
                                    </div>
                                    {selectedCurriculumRealUnits.length > 0 ? (
                                        <div className="mt-4 space-y-3">
                                            {selectedCurriculumRealUnits.map((unit, unitIndex) => (
                                                <div
                                                    key={`${unit.unitNumber}-${unitIndex}`}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-black text-sky-800">
                                                            หน่วย {unit.unitNumber}
                                                        </span>
                                                        <p className="text-sm font-black text-slate-900">{unit.title}</p>
                                                    </div>
                                                    {unit.summary ? (
                                                        (() => {
                                                            const expanded = expandedUnitNumbers.has(unitIndex)
                                                            const shouldCollapse = unit.summary.length > 140
                                                            return (
                                                                <div className="mt-2">
                                                                    <p
                                                                        className={cn(
                                                                            "text-sm leading-6 text-slate-700",
                                                                            !expanded && shouldCollapse && "line-clamp-2"
                                                                        )}
                                                                    >
                                                                        {unit.summary}
                                                                    </p>
                                                                    {shouldCollapse ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setExpandedUnitNumbers((current) => {
                                                                                    const next = new Set(current)
                                                                                    if (next.has(unitIndex)) next.delete(unitIndex)
                                                                                    else next.add(unitIndex)
                                                                                    return next
                                                                                })
                                                                            }
                                                                            className="mt-1 inline-flex items-center text-xs font-black text-sky-700 hover:text-sky-900"
                                                                        >
                                                                            {expanded ? "ย่อ" : "อ่านทั้งหมด"}
                                                                            <ChevronDown
                                                                                className={cn(
                                                                                    "ml-1 h-3.5 w-3.5 transition-transform",
                                                                                    expanded && "rotate-180"
                                                                                )}
                                                                            />
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            )
                                                        })()
                                                    ) : null}
                                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                                                        {unit.hours != null ? (
                                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                                                                {unit.hours} ชั่วโมง
                                                            </span>
                                                        ) : null}
                                                        {unit.duringIndicators.length > 0 ? (
                                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                                                                ระหว่างทาง {unit.duringIndicators.length}
                                                            </span>
                                                        ) : null}
                                                        {unit.terminalIndicators.length > 0 ? (
                                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                                                                ปลายทาง {unit.terminalIndicators.length}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {unit.duringIndicators.length > 0 ? (
                                                        <div className="mt-3">
                                                            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
                                                                ตัวชี้วัดระหว่างทาง
                                                            </p>
                                                            <ul className="mt-1 space-y-1">
                                                                {unit.duringIndicators.map((indicator, indicatorIndex) => (
                                                                    <li key={`${indicator.code}-${indicatorIndex}`} className="text-xs leading-5 text-slate-700">
                                                                        <span className="font-black text-emerald-700">{indicator.code}</span>
                                                                        {indicator.description ? ` ${indicator.description}` : ""}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ) : null}
                                                    {unit.terminalIndicators.length > 0 ? (
                                                        <div className="mt-3">
                                                            <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">
                                                                ตัวชี้วัดปลายทาง
                                                            </p>
                                                            <ul className="mt-1 space-y-1">
                                                                {unit.terminalIndicators.map((indicator, indicatorIndex) => (
                                                                    <li key={`${indicator.code}-${indicatorIndex}`} className="text-xs leading-5 text-slate-700">
                                                                        <span className="font-black text-amber-700">{indicator.code}</span>
                                                                        {indicator.description ? ` ${indicator.description}` : ""}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-sm font-semibold text-slate-500">
                                            ยังไม่มีข้อมูลหน่วยการเรียนรู้สำหรับรายวิชานี้
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
                                    <p className="text-xs font-black uppercase tracking-wide text-violet-600">มาตรฐานและตัวชี้วัด</p>
                                    <div className="mt-4 space-y-4">
                                        <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
                                            <div className="grid grid-cols-[0.7fr_1.35fr_1.35fr] bg-slate-900 text-xs font-black text-white">
                                                <div className="px-4 py-3">มาตรฐาน</div>
                                                <div className="border-l border-white/10 px-4 py-3">ตัวชี้วัดระหว่างทาง</div>
                                                <div className="border-l border-white/10 px-4 py-3">ตัวชี้วัดปลายทาง</div>
                                            </div>
                                            {selectedCurriculumIndicatorRows.length > 0 ? (
                                                <div className="divide-y divide-slate-100">
                                                    {selectedCurriculumIndicatorRows.map((row, rowIndex) => (
                                                        <div
                                                            key={`${row.standard.id}-${rowIndex}`}
                                                            className="grid grid-cols-1 gap-0 bg-white text-sm md:grid-cols-[0.7fr_1.35fr_1.35fr]"
                                                        >
                                                            <div className="bg-emerald-50 px-4 py-4">
                                                                <p className="text-sm font-black text-emerald-950">
                                                                    {row.standard.code}
                                                                </p>
                                                                {expandedStandardIds.has(row.standard.id) && (
                                                                    <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                                                                        {row.standard.labelTh}
                                                                    </p>
                                                                )}
                                                                {row.standard.labelTh.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setExpandedStandardIds((current) => {
                                                                                const next = new Set(current)
                                                                                if (next.has(row.standard.id)) next.delete(row.standard.id)
                                                                                else next.add(row.standard.id)
                                                                                return next
                                                                            })
                                                                        }
                                                                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:text-emerald-900"
                                                                    >
                                                                        {expandedStandardIds.has(row.standard.id) ? (
                                                                            <>
                                                                                ย่อ
                                                                                <ChevronDown className="h-3 w-3 rotate-180" />
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                ขยาย
                                                                                <ChevronDown className="h-3 w-3" />
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="border-t border-slate-100 px-4 py-4 md:border-l md:border-t-0">
                                                                {row.duringIndicators.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {row.duringIndicators.map((indicator) => (
                                                                            <span
                                                                                key={indicator.id}
                                                                                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800"
                                                                            >
                                                                                {indicator.indicatorCode}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm font-semibold text-slate-400">ไม่มี</p>
                                                                )}
                                                            </div>
                                                            <div className="border-t border-slate-100 px-4 py-4 md:border-l md:border-t-0">
                                                                {row.terminalIndicators.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {row.terminalIndicators.map((indicator) => (
                                                                            <span
                                                                                key={indicator.id}
                                                                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800"
                                                                            >
                                                                                {indicator.indicatorCode}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm font-semibold text-slate-400">ไม่มี</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-5 text-sm font-semibold text-slate-500">
                                                    ยังไม่มีข้อมูลมาตรฐานและตัวชี้วัดสำหรับรายวิชานี้
                                                </div>
                                            )}
                                            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black sm:grid-cols-2">
                                                <p className="text-emerald-700">
                                                    รวมตัวชี้วัดระหว่างทาง {selectedCurriculumDuringIndicators.length} ตัวชี้วัด
                                                </p>
                                                <p className="text-amber-700">
                                                    รวมตัวชี้วัดปลายทาง {selectedCurriculumTerminalIndicators.length} ตัวชี้วัด
                                                </p>
                                            </div>
                                        </div>

                                        <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-sm font-black text-slate-900">มาตรฐาน</p>
                                            {selectedCurriculumStandards.length > 0 ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {selectedCurriculumStandards.map((standard) => (
                                                        <span
                                                            key={standard.id}
                                                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-800"
                                                        >
                                                            {standard.code}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="mt-2 text-sm text-slate-600">ยังไม่มีข้อมูลมาตรฐาน</p>
                                            )}
                                        </div>

                                        <div className="hidden grid gap-4 md:grid-cols-2">
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                                <p className="text-sm font-black text-emerald-800">ตัวชี้วัดระหว่างทาง</p>
                                                {selectedCurriculumDuringIndicators.length > 0 ? (
                                                    <>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {selectedCurriculumDuringIndicators.map((indicator) => (
                                                                <span
                                                                    key={indicator.id}
                                                                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-800"
                                                                >
                                                                    {indicator.indicatorCode}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="mt-3 text-xs font-bold text-emerald-700">
                                                            รวม {selectedCurriculumDuringIndicators.length} ตัวชี้วัด
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="mt-2 text-sm text-emerald-900">ยังไม่มีตัวชี้วัดระหว่างทาง</p>
                                                )}
                                            </div>

                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                                <p className="text-sm font-black text-amber-800">ตัวชี้วัดปลายทาง</p>
                                                {selectedCurriculumTerminalIndicators.length > 0 ? (
                                                    <>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {selectedCurriculumTerminalIndicators.map((indicator) => (
                                                                <span
                                                                    key={indicator.id}
                                                                    className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-black text-amber-800"
                                                                >
                                                                    {indicator.indicatorCode}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="mt-3 text-xs font-bold text-amber-700">
                                                            รวม {selectedCurriculumTerminalIndicators.length} ตัวชี้วัด
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="mt-2 text-sm text-amber-900">ยังไม่มีตัวชี้วัดปลายทาง</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                    <p className="text-sm font-black text-slate-900">พร้อมแล้วค่อยสร้างบทเรียนตั้งต้น</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        ปุ่มนี้จะสร้างร่างบทเรียนจากรายวิชาและชั้นเรียนที่เลือกก่อน จากนั้นหน้าถัดไปค่อยจัดการหน่วยการเรียนรู้
                                        โครงบทเรียน และเนื้อหาให้ละเอียด
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <Button
                                            type="button"
                                            onClick={openCurriculumStandardShell}
                                            disabled={!selectedCurriculumUnit || !selectedCurriculumOutcomePack}
                                            className="rounded-xl bg-sky-600 font-black text-white hover:bg-sky-700"
                                        >
                                            <BookOpen className="mr-2 h-4 w-4" />
                                            สร้างร่างบทเรียนจากรายวิชานี้
                                        </Button>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                                            ขั้นถัดไปจะใช้ข้อมูลรายวิชาเป็นฐาน แล้วค่อยเลือกหน่วยและเทมเพลตต่อ
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
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
                            ไปใส่เนื้อหาในบทเรียนนี้
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
                            <div className="flex flex-col gap-3">
                                <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                                    {outline.title}
                                </p>
                                <h2 className="text-2xl font-black text-slate-950">{selectedTopic.title}</h2>
                                {selectedTopic.description && <p className="text-sm text-slate-500">{selectedTopic.description}</p>}
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

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <PlaySquare className="h-5 w-5 text-rose-600" />
                                <h3 className="font-black text-slate-800">วิดีโอประกอบหัวข้อ</h3>
                            </div>
                            <MediaBlockEditor
                                label="วิดีโอของหัวข้อนี้"
                                blocks={selectedTopic.media ?? []}
                                onChange={(media) => markTopicEdited(selectedTopic.id, { media })}
                                videoOnly
                            />
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                const sections = [
                                    ...selectedTopic.sections,
                                    { id: createSectionId(), heading: "หัวข้อย่อยใหม่", content: "", media: [] },
                                ]
                                markTopicEdited(selectedTopic.id, { sections })
                            }}
                            className="rounded-xl font-bold"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มหัวข้อย่อย
                        </Button>

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
                                บันทึกบทเรียนทั้งหมด ({lessonDrafts.length} บทเรียน)
                            </Button>
                        </div>
                    </div>
                </section>
            )}

        </div>
    )
}
