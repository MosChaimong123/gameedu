import { z } from "zod"
import { canonicalGradeLevelSchema, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"

export const SECONDARY_CORE_COURSE_DESCRIPTIONS_SCHEMA_VERSION = "secondary_core_course_descriptions_v1" as const

export const secondaryCoreCourseDescriptionRowSchema = z.object({
    titleTh: z.string().trim().min(1),
    gradeLevel: canonicalGradeLevelSchema,
    subjectGroup: z.string().trim().min(1).nullable(),
    hoursPerYear: z.number().int().min(1).nullable(),
    descriptionText: z.string().trim().min(1),
    sourceParagraphIndex: z.number().int().min(0),
})

export const secondaryCoreCourseDescriptionsPayloadSchema = z.object({
    schemaVersion: z.literal(SECONDARY_CORE_COURSE_DESCRIPTIONS_SCHEMA_VERSION),
    sourceFileName: z.string().trim().min(1),
    rows: z.array(secondaryCoreCourseDescriptionRowSchema).min(1),
})

export type SecondaryCoreCourseDescriptionRow = z.infer<typeof secondaryCoreCourseDescriptionRowSchema>
export type SecondaryCoreCourseDescriptionsPayload = z.infer<typeof secondaryCoreCourseDescriptionsPayloadSchema>

export function validateSecondaryCoreCourseDescriptionsPayload(value: unknown) {
    return secondaryCoreCourseDescriptionsPayloadSchema.safeParse(value)
}

export function isSecondaryCoreCourseDescriptionsPayload(value: unknown): value is SecondaryCoreCourseDescriptionsPayload {
    return validateSecondaryCoreCourseDescriptionsPayload(value).success
}

export function getSecondaryCoreCourseDescription(
    payload: SecondaryCoreCourseDescriptionsPayload,
    titleTh: string,
    gradeLevel: CanonicalGradeLevel
) {
    return payload.rows.find((row) => row.titleTh === titleTh && row.gradeLevel === gradeLevel) ?? null
}
