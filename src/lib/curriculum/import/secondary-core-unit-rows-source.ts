import { z } from "zod"
import { canonicalGradeLevelSchema, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"

export const SECONDARY_CORE_UNIT_ROWS_SCHEMA_VERSION = "secondary_core_unit_rows_v1" as const

export const secondaryCoreUnitIndicatorSchema = z.object({
    standardCode: z.string().trim().min(1),
    code: z.string().trim().min(1),
    description: z.string().trim().min(1).nullable(),
})

export const secondaryCoreUnitSchema = z.object({
    unitNumber: z.number().int().min(1),
    title: z.string().trim().min(1),
    hours: z.number().int().min(1).nullable(),
    duringIndicators: z.array(secondaryCoreUnitIndicatorSchema),
    terminalIndicators: z.array(secondaryCoreUnitIndicatorSchema),
    summary: z.string().trim().min(1).nullable(),
})

export type SecondaryCoreUnitIndicator = z.infer<typeof secondaryCoreUnitIndicatorSchema>

export const secondaryCoreUnitCourseSchema = z.object({
    titleTh: z.string().trim().min(1),
    gradeLevel: canonicalGradeLevelSchema,
    units: z.array(secondaryCoreUnitSchema).min(1),
})

export const secondaryCoreUnitRowsPayloadSchema = z.object({
    schemaVersion: z.literal(SECONDARY_CORE_UNIT_ROWS_SCHEMA_VERSION),
    sourceFileName: z.string().trim().min(1),
    courses: z.array(secondaryCoreUnitCourseSchema).min(1),
})

export type SecondaryCoreUnit = z.infer<typeof secondaryCoreUnitSchema>
export type SecondaryCoreUnitCourse = z.infer<typeof secondaryCoreUnitCourseSchema>
export type SecondaryCoreUnitRowsPayload = z.infer<typeof secondaryCoreUnitRowsPayloadSchema>

export function validateSecondaryCoreUnitRowsPayload(value: unknown) {
    return secondaryCoreUnitRowsPayloadSchema.safeParse(value)
}

export function isSecondaryCoreUnitRowsPayload(value: unknown): value is SecondaryCoreUnitRowsPayload {
    return validateSecondaryCoreUnitRowsPayload(value).success
}

export function getSecondaryCoreUnitsForCourse(
    payload: SecondaryCoreUnitRowsPayload,
    titleTh: string,
    gradeLevel: CanonicalGradeLevel
): SecondaryCoreUnit[] {
    return (
        payload.courses.find((course) => course.titleTh === titleTh && course.gradeLevel === gradeLevel)?.units ?? []
    )
}
