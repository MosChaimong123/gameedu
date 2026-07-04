import { z } from "zod"
import {
    CANONICAL_COURSE_CATALOG,
    canonicalCourseEntrySchema,
    getCanonicalCourseById,
    getCanonicalCourseOptions,
    type CanonicalCourseEntry,
} from "@/lib/curriculum/course-catalog"
import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import type { CanonicalGradeLevel } from "@/lib/curriculum/grade-model"
import type { CanonicalCoreSubjectId } from "@/lib/curriculum/subject-catalog"

export const canonicalCourseUnitSummarySchema = z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    keyConceptTh: z.string().trim().min(1),
    estimatedHours: z.number().int().min(1),
    standardIds: z.array(z.string().trim().min(1)).min(1),
    gradeLevels: z.array(z.string().trim().min(1)).min(1),
})

export const canonicalCourseDetailEntrySchema = canonicalCourseEntrySchema.extend({
    units: z.array(canonicalCourseUnitSummarySchema).min(1),
})

export const canonicalCourseDetailCatalogSchema = z.array(canonicalCourseDetailEntrySchema).min(1)

export type CanonicalCourseUnitSummary = z.infer<typeof canonicalCourseUnitSummarySchema>
export type CanonicalCourseDetailEntry = z.infer<typeof canonicalCourseDetailEntrySchema>
export type CanonicalCourseDetailCatalog = z.infer<typeof canonicalCourseDetailCatalogSchema>

function buildCanonicalCourseDetailEntry(entry: CanonicalCourseEntry): CanonicalCourseDetailEntry {
    const pack = getSubjectCurriculumMapPack(entry.coreSubjectId)
    if (!pack) {
        throw new Error(`Missing subject curriculum pack for ${entry.coreSubjectId}`)
    }

    const units = entry.unitIds.map((unitId) => {
        const unit = pack.unitOutlines.find((candidate) => candidate.id === unitId)
        if (!unit) {
            throw new Error(`Missing curriculum unit ${entry.coreSubjectId}:${unitId} for course ${entry.id}`)
        }

        return {
            id: unit.id,
            title: unit.title,
            keyConceptTh: unit.keyConceptTh,
            estimatedHours: unit.estimatedHours,
            standardIds: unit.standardIds,
            gradeLevels: unit.gradeLevels,
        }
    })

    return {
        ...entry,
        units,
    }
}

export const CANONICAL_COURSE_DETAIL_CATALOG: CanonicalCourseDetailCatalog = CANONICAL_COURSE_CATALOG.map(
    buildCanonicalCourseDetailEntry
)

export function validateCanonicalCourseDetailCatalog(value: unknown) {
    const parsed = canonicalCourseDetailCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []
    for (const [index, entry] of parsed.data.entries()) {
        if (entry.units.length !== entry.unitIds.length) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "units must mirror unitIds one-to-one.",
                path: [index, "units"],
            })
        }

        for (const [unitIndex, unit] of entry.units.entries()) {
            if (unit.id !== entry.unitIds[unitIndex]) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "units must preserve the same order as unitIds.",
                    path: [index, "units", unitIndex, "id"],
                })
            }
        }
    }

    if (issues.length === 0) {
        return {
            success: true as const,
            data: parsed.data,
        }
    }

    return {
        success: false as const,
        error: new z.ZodError(issues),
    }
}

export function getCanonicalCourseDetailById(courseId: string) {
    return CANONICAL_COURSE_DETAIL_CATALOG.find((entry) => entry.id === courseId) ?? null
}

export function getCanonicalCourseDetailOptions(
    coreSubjectId: CanonicalCoreSubjectId,
    gradeLevel?: CanonicalGradeLevel | null
) {
    return getCanonicalCourseOptions(coreSubjectId, gradeLevel)
        .map((entry) => getCanonicalCourseDetailById(entry.id))
        .filter((entry): entry is CanonicalCourseDetailEntry => Boolean(entry))
}

export function getCanonicalCourseUnitsByCourseId(courseId: string) {
    return getCanonicalCourseDetailById(courseId)?.units ?? []
}

export function getCanonicalCourseUnitSummariesForSubject(
    coreSubjectId: CanonicalCoreSubjectId,
    gradeLevel?: CanonicalGradeLevel | null
) {
    return getCanonicalCourseDetailOptions(coreSubjectId, gradeLevel).flatMap((entry) =>
        entry.units.map((unit) => ({
            courseId: entry.id,
            courseTitle: entry.titleTh,
            ...unit,
        }))
    )
}

export function getCanonicalCourseSummaryForApi(courseId: string) {
    const course = getCanonicalCourseById(courseId)
    const detail = getCanonicalCourseDetailById(courseId)
    if (!course || !detail) {
        return null
    }

    return {
        id: course.id,
        titleTh: course.titleTh,
        gradeLevel: course.gradeLevel,
        descriptionText: course.descriptionText,
        unitCount: detail.units.length,
        units: detail.units.map((unit) => ({
            id: unit.id,
            title: unit.title,
            keyConceptTh: unit.keyConceptTh,
            estimatedHours: unit.estimatedHours,
        })),
    }
}
