import { z } from "zod"
import { canonicalGradeLevelSchema, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"

export const PRIMARY_CORE_UNIT_ROWS_SCHEMA_VERSION = "primary_core_unit_rows_v1" as const

export const primaryCoreUnitIndicatorSchema = z.object({
    standardCode: z.string().trim().min(1),
    code: z.string().trim().min(1),
    description: z.string().trim().min(1).nullable(),
})

export const primaryCoreUnitSchema = z.object({
    unitNumber: z.number().int().min(1),
    title: z.string().trim().min(1),
    hours: z.number().int().min(1).nullable(),
    duringIndicators: z.array(primaryCoreUnitIndicatorSchema),
    terminalIndicators: z.array(primaryCoreUnitIndicatorSchema),
    standardsIndicatorsRaw: z.string().trim().min(1).nullable().default(null),
    indicatorStatus: z.enum(["has_indicators", "explicit_none", "missing"]).default("missing"),
    summary: z.string().trim().min(1).nullable(),
})

export const primaryCoreIndicatorCrosswalkRowSchema = z.object({
    standardCode: z.string().trim().min(1),
    duringIndicators: z.array(primaryCoreUnitIndicatorSchema),
    terminalIndicators: z.array(primaryCoreUnitIndicatorSchema),
})

export const primaryCoreUnitCourseSchema = z.object({
    titleTh: z.string().trim().min(1),
    gradeLevel: canonicalGradeLevelSchema,
    descriptionText: z.string().trim().min(1).nullable().default(null),
    units: z.array(primaryCoreUnitSchema).min(1),
    indicatorCrosswalkRows: z.array(primaryCoreIndicatorCrosswalkRowSchema).default([]),
})

export const primaryCoreUnitRowsPayloadSchema = z.object({
    schemaVersion: z.literal(PRIMARY_CORE_UNIT_ROWS_SCHEMA_VERSION),
    sourceFileName: z.string().trim().min(1),
    courses: z.array(primaryCoreUnitCourseSchema).min(1),
})

export type PrimaryCoreUnit = z.infer<typeof primaryCoreUnitSchema>
export type PrimaryCoreIndicatorCrosswalkRow = z.infer<typeof primaryCoreIndicatorCrosswalkRowSchema>
export type PrimaryCoreUnitCourse = z.infer<typeof primaryCoreUnitCourseSchema>
export type PrimaryCoreUnitRowsPayload = z.infer<typeof primaryCoreUnitRowsPayloadSchema>

export function validatePrimaryCoreUnitRowsPayload(value: unknown) {
    return primaryCoreUnitRowsPayloadSchema.safeParse(value)
}

export function getPrimaryCoreUnitsForCourse(
    payload: PrimaryCoreUnitRowsPayload,
    titleTh: string,
    gradeLevel: CanonicalGradeLevel
): PrimaryCoreUnit[] {
    return getPrimaryCoreCourse(payload, titleTh, gradeLevel)?.units ?? []
}

export function getPrimaryCoreIndicatorCrosswalkRowsForCourse(
    payload: PrimaryCoreUnitRowsPayload,
    titleTh: string,
    gradeLevel: CanonicalGradeLevel
): PrimaryCoreIndicatorCrosswalkRow[] {
    return getPrimaryCoreCourse(payload, titleTh, gradeLevel)?.indicatorCrosswalkRows ?? []
}

export function getPrimaryCoreCourse(
    payload: PrimaryCoreUnitRowsPayload,
    titleTh: string,
    gradeLevel: CanonicalGradeLevel
): PrimaryCoreUnitCourse | null {
    return payload.courses.find((course) => course.titleTh === titleTh && course.gradeLevel === gradeLevel) ?? null
}
