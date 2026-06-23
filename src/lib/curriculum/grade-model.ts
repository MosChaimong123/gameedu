import { z } from "zod"

export const canonicalGradeBandSchema = z.enum(["p1_p3", "p4_p6", "m1_m3", "m4_m6"])

export const canonicalGradeLevelSchema = z.enum([
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "p6",
    "m1",
    "m2",
    "m3",
    "m4",
    "m5",
    "m6",
])

export const canonicalUpperSecondaryGradeLevelSchema = z.enum(["m4", "m5", "m6"])

export const canonicalSemesterSchema = z.union([z.literal(1), z.literal(2)])

export const canonicalSemesterModeSchema = z.enum(["required", "optional", "not_applicable"])

export const curriculumPlacementSchema = z
    .object({
        gradeBand: canonicalGradeBandSchema,
        gradeLevel: canonicalGradeLevelSchema,
        semesterMode: canonicalSemesterModeSchema,
        semester: canonicalSemesterSchema.optional(),
    })
    .superRefine((value, ctx) => {
        if (value.semesterMode === "required" && value.semester === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "semester is required when semesterMode is required.",
                path: ["semester"],
            })
        }

        if (value.semesterMode === "not_applicable" && value.semester !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "semester must be omitted when semesterMode is not_applicable.",
                path: ["semester"],
            })
        }
    })

export type CanonicalGradeBand = z.infer<typeof canonicalGradeBandSchema>
export type CanonicalGradeLevel = z.infer<typeof canonicalGradeLevelSchema>
export type CanonicalUpperSecondaryGradeLevel = z.infer<typeof canonicalUpperSecondaryGradeLevelSchema>
export type CanonicalSemester = z.infer<typeof canonicalSemesterSchema>
export type CanonicalSemesterMode = z.infer<typeof canonicalSemesterModeSchema>
export type CurriculumPlacement = z.infer<typeof curriculumPlacementSchema>

export const ALL_CANONICAL_GRADE_BANDS = ["p1_p3", "p4_p6", "m1_m3", "m4_m6"] as const satisfies CanonicalGradeBand[]
export const ALL_CANONICAL_GRADE_LEVELS = [
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "p6",
    "m1",
    "m2",
    "m3",
    "m4",
    "m5",
    "m6",
] as const satisfies CanonicalGradeLevel[]
export const UPPER_SECONDARY_GRADE_LEVELS = ["m4", "m5", "m6"] as const satisfies CanonicalUpperSecondaryGradeLevel[]

const GRADE_LEVEL_TO_BAND: Record<CanonicalGradeLevel, CanonicalGradeBand> = {
    p1: "p1_p3",
    p2: "p1_p3",
    p3: "p1_p3",
    p4: "p4_p6",
    p5: "p4_p6",
    p6: "p4_p6",
    m1: "m1_m3",
    m2: "m1_m3",
    m3: "m1_m3",
    m4: "m4_m6",
    m5: "m4_m6",
    m6: "m4_m6",
}

const GRADE_LEVEL_LABELS_TH: Record<CanonicalGradeLevel, string> = {
    p1: "ป.1",
    p2: "ป.2",
    p3: "ป.3",
    p4: "ป.4",
    p5: "ป.5",
    p6: "ป.6",
    m1: "ม.1",
    m2: "ม.2",
    m3: "ม.3",
    m4: "ม.4",
    m5: "ม.5",
    m6: "ม.6",
}

const GRADE_LEVEL_LABELS_EN: Record<CanonicalGradeLevel, string> = {
    p1: "P1",
    p2: "P2",
    p3: "P3",
    p4: "P4",
    p5: "P5",
    p6: "P6",
    m1: "M1",
    m2: "M2",
    m3: "M3",
    m4: "M4",
    m5: "M5",
    m6: "M6",
}

const GRADE_BAND_LABELS_TH: Record<CanonicalGradeBand, string> = {
    p1_p3: "ประถมต้น",
    p4_p6: "ประถมปลาย",
    m1_m3: "มัธยมต้น",
    m4_m6: "มัธยมปลาย",
}

const GRADE_BAND_LABELS_EN: Record<CanonicalGradeBand, string> = {
    p1_p3: "Primary 1-3",
    p4_p6: "Primary 4-6",
    m1_m3: "Lower Secondary",
    m4_m6: "Upper Secondary",
}

export function isCanonicalGradeLevel(value: unknown): value is CanonicalGradeLevel {
    return canonicalGradeLevelSchema.safeParse(value).success
}

export function isCanonicalGradeBand(value: unknown): value is CanonicalGradeBand {
    return canonicalGradeBandSchema.safeParse(value).success
}

export function isCanonicalSemester(value: unknown): value is CanonicalSemester {
    return canonicalSemesterSchema.safeParse(value).success
}

export function isCurriculumPlacement(value: unknown): value is CurriculumPlacement {
    return curriculumPlacementSchema.safeParse(value).success
}

export function getGradeBandForLevel(gradeLevel: CanonicalGradeLevel) {
    return GRADE_LEVEL_TO_BAND[gradeLevel]
}

export function getCanonicalGradeLevelLabel(gradeLevel: CanonicalGradeLevel, locale: "th" | "en" = "th") {
    return locale === "en" ? GRADE_LEVEL_LABELS_EN[gradeLevel] : GRADE_LEVEL_LABELS_TH[gradeLevel]
}

export function getCanonicalGradeBandLabel(gradeBand: CanonicalGradeBand, locale: "th" | "en" = "th") {
    return locale === "en" ? GRADE_BAND_LABELS_EN[gradeBand] : GRADE_BAND_LABELS_TH[gradeBand]
}

export function getCanonicalSemesterLabel(semester: CanonicalSemester, locale: "th" | "en" = "th") {
    return locale === "en" ? `Semester ${semester}` : `เทอม ${semester}`
}

export function buildCurriculumPlacement(
    gradeLevel: CanonicalGradeLevel,
    semesterMode: CanonicalSemesterMode,
    semester?: CanonicalSemester
): CurriculumPlacement {
    return {
        gradeBand: getGradeBandForLevel(gradeLevel),
        gradeLevel,
        semesterMode,
        semester,
    }
}
