import { z } from "zod"
import { curriculumIndicatorCodeSchema, getCurriculumStandardByCode, parseUnitPlanIndicatorReferences } from "@/lib/curriculum/indicators"
import { canonicalCoreSubjectIdSchema } from "@/lib/curriculum/subject-catalog"
import { canonicalGradeLevelSchema, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"
import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import type { SecondaryCoreDocxTable } from "@/lib/curriculum/import/secondary-core-docx-extractor"

export const SECONDARY_CORE_COURSE_SOURCE_SCHEMA_VERSION = "secondary_core_course_source_v1" as const

export const secondaryCoreCourseSourceIssueCodeSchema = z.enum([
    "missing_standard_mapping",
    "mixed_subjects",
    "missing_grade_level",
    "missing_summary_text",
    "missing_estimated_hours",
    "missing_course_description",
    "missing_unit_mapping",
])

export const secondaryCoreCourseSourceRowSchema = z.object({
    tableIndex: z.number().int().min(1),
    rowIndex: z.number().int().min(1),
    rawUnitTitle: z.string().trim().min(1),
    normalizedUnitTitle: z.string().trim().min(1),
    subjectId: canonicalCoreSubjectIdSchema.nullable(),
    matchedUnitId: z.string().trim().min(1).nullable(),
    gradeLevels: z.array(canonicalGradeLevelSchema),
    standardIds: z.array(z.string().trim().min(1)),
    standardCodes: z.array(z.string().trim().min(1)),
    indicatorCodes: z.array(curriculumIndicatorCodeSchema),
    summaryText: z.string().trim().min(1).nullable(),
    descriptionText: z.string().trim().min(1).nullable(),
    estimatedHours: z.number().int().min(1).nullable(),
    issueCodes: z.array(secondaryCoreCourseSourceIssueCodeSchema),
})

export const secondaryCoreCourseSourcePayloadSchema = z.object({
    schemaVersion: z.literal(SECONDARY_CORE_COURSE_SOURCE_SCHEMA_VERSION),
    sourceFileName: z.string().trim().min(1),
    rows: z.array(secondaryCoreCourseSourceRowSchema),
})

export type SecondaryCoreCourseSourceIssueCode = z.infer<typeof secondaryCoreCourseSourceIssueCodeSchema>
export type SecondaryCoreCourseSourceRow = z.infer<typeof secondaryCoreCourseSourceRowSchema>
export type SecondaryCoreCourseSourcePayload = z.infer<typeof secondaryCoreCourseSourcePayloadSchema>

function normalizeWhitespace(value: string) {
    return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

function unique<T>(values: T[]) {
    return [...new Set(values)]
}

function normalizeUnitTitle(value: string) {
    return normalizeWhitespace(
        value
            .replace(/^หน่วย\s*การเรียนรู้ที่\s*\d+\s*/u, "")
            .replace(/^หน่วยที่\s*\d+\s*/u, "")
            .replace(/^หน่วย\s*/u, "")
    )
}

function parseEstimatedHours(value: string) {
    const match = normalizeWhitespace(value).match(/(\d+)/)
    if (!match) {
        return null
    }

    const parsed = Number(match[1])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function findMatchedUnitId(subjectId: z.infer<typeof canonicalCoreSubjectIdSchema> | null, normalizedUnitTitle: string) {
    if (!subjectId) {
        return null
    }

    const pack = getSubjectCurriculumMapPack(subjectId)
    if (!pack) {
        return null
    }

    const match = pack.unitOutlines.find((unit) => normalizeWhitespace(unit.title) === normalizedUnitTitle)
    return match?.id ?? null
}

function gradeLevelFromIndicatorCode(indicatorCode: string): CanonicalGradeLevel | null {
    const match = indicatorCode.match(/^([ปม])\.(\d+)\/\d+$/u)
    if (!match) {
        return null
    }

    const gradeId = `${match[1] === "ป" ? "p" : "m"}${match[2]}`
    const parsed = canonicalGradeLevelSchema.safeParse(gradeId)
    return parsed.success ? parsed.data : null
}

export function buildSecondaryCoreCourseSourceRowsFromTables(tables: SecondaryCoreDocxTable[]) {
    return tables
        .filter((table) => table.tableType === "unit_plan")
        .flatMap((table) =>
            table.rows.slice(1).map((row, index) => {
                const references = parseUnitPlanIndicatorReferences(row[1] ?? "")
                const matchedStandards = unique(
                    references.map((reference) => getCurriculumStandardByCode(reference.standardCode)).filter(Boolean)
                )
                const subjectIds = unique(
                    matchedStandards
                        .map((standard) => standard!.subjectId)
                        .filter((subjectId): subjectId is z.infer<typeof canonicalCoreSubjectIdSchema> =>
                            canonicalCoreSubjectIdSchema.safeParse(subjectId).success
                        )
                )
                const gradeLevels = unique(
                    references
                        .map((reference) => gradeLevelFromIndicatorCode(reference.indicatorCode))
                        .filter((gradeLevel): gradeLevel is CanonicalGradeLevel => gradeLevel !== null)
                )
                const resolvedSubjectId = subjectIds.length === 1 ? subjectIds[0]! : null
                const normalizedUnitTitle = normalizeUnitTitle(row[0] ?? "") || `unit-${table.tableIndex}-${index + 1}`
                const matchedUnitId = findMatchedUnitId(resolvedSubjectId, normalizedUnitTitle)
                const summaryText = normalizeWhitespace(row[3] ?? "") || null
                const estimatedHours = parseEstimatedHours(row[4] ?? "")
                const issueCodes: SecondaryCoreCourseSourceIssueCode[] = []

                if (matchedStandards.length === 0) {
                    issueCodes.push("missing_standard_mapping")
                }

                if (subjectIds.length > 1) {
                    issueCodes.push("mixed_subjects")
                }

                if (gradeLevels.length === 0) {
                    issueCodes.push("missing_grade_level")
                }

                if (!summaryText) {
                    issueCodes.push("missing_summary_text")
                }

                if (!estimatedHours) {
                    issueCodes.push("missing_estimated_hours")
                }

                if (!matchedUnitId) {
                    issueCodes.push("missing_unit_mapping")
                }

                issueCodes.push("missing_course_description")

                return {
                    tableIndex: table.tableIndex,
                    rowIndex: index + 2,
                    rawUnitTitle: normalizeWhitespace(row[0] ?? "") || `unit-${table.tableIndex}-${index + 1}`,
                    normalizedUnitTitle,
                    subjectId: resolvedSubjectId,
                    matchedUnitId,
                    gradeLevels,
                    standardIds: matchedStandards.map((standard) => standard!.id),
                    standardCodes: unique(references.map((reference) => reference.standardCode)),
                    indicatorCodes: unique(references.map((reference) => reference.indicatorCode)),
                    summaryText,
                    descriptionText: null,
                    estimatedHours,
                    issueCodes: unique(issueCodes),
                } satisfies SecondaryCoreCourseSourceRow
            })
        )
}

export function validateSecondaryCoreCourseSourcePayload(value: unknown) {
    return secondaryCoreCourseSourcePayloadSchema.safeParse(value)
}

export function isSecondaryCoreCourseSourcePayload(value: unknown): value is SecondaryCoreCourseSourcePayload {
    return validateSecondaryCoreCourseSourcePayload(value).success
}

export function getResolvedSecondaryCoreCourseSourceRows(payload: SecondaryCoreCourseSourcePayload) {
    return payload.rows.filter((row) => row.subjectId !== null && row.gradeLevels.length > 0 && row.standardIds.length > 0)
}
