import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import {
    getCanonicalCoreSubjects,
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
} from "@/lib/curriculum/subject-catalog"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"

export const CORE_SUBJECT_OPTIONS: CanonicalCoreSubjectId[] = getCanonicalCoreSubjects().map((subject) => subject.id)

export type LessonCurriculumContext = {
    subjectId: CanonicalCoreSubjectId | null
    unitId: string | null
}

const LEGACY_LESSON_SUBJECT_TO_CORE_SUBJECT: Partial<Record<string, CanonicalCoreSubjectId>> = {
    physics: "science_technology",
    ฟิสิกส์: "science_technology",
}

const LEGACY_LESSON_UNIT_PREFIX_TO_CORE_UNIT: Array<{
    prefix: string
    subjectId: CanonicalCoreSubjectId
    unitId: string
}> = [{ prefix: "phy-", subjectId: "science_technology", unitId: "sci-tech-u02" }]

export function isCanonicalCoreSubjectId(value: string | null | undefined): value is CanonicalCoreSubjectId {
    return Boolean(value && CORE_SUBJECT_OPTIONS.includes(value as CanonicalCoreSubjectId))
}

export function parseLessonCurriculumContext(searchParams: { get(name: string): string | null }): LessonCurriculumContext {
    const subjectIdValue = searchParams.get("subjectId")?.trim() ?? ""
    const unitIdValue = searchParams.get("unitId")?.trim() ?? ""
    return {
        subjectId: isCanonicalCoreSubjectId(subjectIdValue) ? subjectIdValue : null,
        unitId: unitIdValue || null,
    }
}

export function buildLessonCurriculumHref(
    pathname: string,
    context: LessonCurriculumContext,
    extraParams?: Record<string, string | null | undefined>
) {
    const params = new URLSearchParams()
    if (context.subjectId) params.set("subjectId", context.subjectId)
    if (context.unitId) params.set("unitId", context.unitId)
    for (const [key, value] of Object.entries(extraParams ?? {})) {
        const normalized = value?.trim()
        if (normalized) params.set(key, normalized)
    }
    const query = params.toString()
    return `${pathname}${query ? `?${query}` : ""}`
}

export function resolveCanonicalSubjectId(subjectValue: string | null | undefined) {
    const normalized = subjectValue?.trim()
    if (!normalized) return null

    const canonicalMatch =
        CORE_SUBJECT_OPTIONS.find((subjectId) => {
            const option = getCanonicalSubjectById(subjectId)
            return option?.displayNameTh === normalized || option?.displayNameEn === normalized || subjectId === normalized
        }) ?? null

    if (canonicalMatch) {
        return canonicalMatch
    }

    return LEGACY_LESSON_SUBJECT_TO_CORE_SUBJECT[normalized.toLowerCase()] ?? null
}

export function resolveCurriculumUnitTitle(subjectId: CanonicalCoreSubjectId | null, unitId: string | null | undefined) {
    if (!subjectId || !unitId) return null
    const pack = getSubjectCurriculumMapPack(subjectId)
    return pack?.unitOutlines.find((unit) => unit.id === unitId)?.title ?? null
}

export function resolveLegacyLessonCurriculumContext(input: {
    subject: string | null | undefined
    unitId: string | null | undefined
    fallbackSubject?: string | null | undefined
}): LessonCurriculumContext {
    const rawSubject = input.subject?.trim() || input.fallbackSubject?.trim() || null
    const rawUnitId = input.unitId?.trim() || null
    const subjectId = resolveCanonicalSubjectId(rawSubject)

    if (subjectId && rawUnitId) {
        const canonicalPack = getSubjectCurriculumMapPack(subjectId)
        const canonicalUnit = canonicalPack?.unitOutlines.find((unit) => unit.id === rawUnitId)
        if (canonicalUnit) {
            return {
                subjectId,
                unitId: canonicalUnit.id,
            }
        }
    }

    if (rawUnitId) {
        const legacyUnitMatch = LEGACY_LESSON_UNIT_PREFIX_TO_CORE_UNIT.find((entry) => rawUnitId.startsWith(entry.prefix))
        if (legacyUnitMatch) {
            return {
                subjectId: legacyUnitMatch.subjectId,
                unitId: legacyUnitMatch.unitId,
            }
        }
    }

    return {
        subjectId,
        unitId: null,
    }
}

export function resolveLessonCurriculumContext(content: unknown, fallbackSubject?: string | null): LessonCurriculumContext {
    if (isLessonContentV2(content)) {
        const metadata = content.metadata?.curriculum
        return resolveLegacyLessonCurriculumContext({
            subject: metadata?.subject,
            unitId: metadata?.unitId,
            fallbackSubject,
        })
    }

    return {
        subjectId: resolveCanonicalSubjectId(fallbackSubject ?? null),
        unitId: null,
    }
}
