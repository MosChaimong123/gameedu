import { z } from "zod"
import {
    ALL_CANONICAL_GRADE_BANDS,
    ALL_CANONICAL_GRADE_LEVELS,
    canonicalGradeBandSchema,
    canonicalGradeLevelSchema,
    canonicalSemesterModeSchema,
    type CanonicalGradeBand,
    type CanonicalGradeLevel,
    type CanonicalSemesterMode,
    UPPER_SECONDARY_GRADE_LEVELS,
} from "@/lib/curriculum/grade-model"
import {
    BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY,
    curriculumSourceRegistryEntrySchema,
} from "@/lib/curriculum/source-registry"

export const canonicalCoreSubjectIdSchema = z.enum([
    "thai",
    "mathematics",
    "science_technology",
    "social_religion_culture",
    "health_physical_education",
    "arts",
    "career",
    "foreign_languages",
])

export const canonicalAdditionalSubjectIdSchema = z.enum([
    "physics",
    "chemistry",
    "biology",
    "earth_space_science",
])

export const canonicalSubjectIdSchema = z.union([canonicalCoreSubjectIdSchema, canonicalAdditionalSubjectIdSchema])

export const canonicalSubjectGroupTypeSchema = z.enum(["core_learning_area", "additional_subject"])

export const canonicalSubjectUiMetaSchema = z.object({
    icon: z.string().trim().min(1),
    colorToken: z.string().trim().min(1),
    accentToken: z.string().trim().min(1),
})

export const canonicalSubjectCatalogEntrySchema = z.object({
    id: canonicalSubjectIdSchema,
    displayNameTh: z.string().trim().min(1),
    displayNameEn: z.string().trim().min(1),
    shortCode: z.string().trim().min(1),
    groupType: canonicalSubjectGroupTypeSchema,
    parentSubjectId: canonicalCoreSubjectIdSchema.optional(),
    gradeBands: z.array(canonicalGradeBandSchema).min(1),
    gradeLevels: z.array(canonicalGradeLevelSchema).min(1),
    semesterMode: canonicalSemesterModeSchema,
    sourceRegistryIds: z.array(z.string().trim().min(1)).min(1),
    keywords: z.array(z.string().trim().min(1)).min(1),
    aliases: z.array(z.string().trim().min(1)).default([]),
    ui: canonicalSubjectUiMetaSchema,
})

export const canonicalSubjectCatalogSchema = z.array(canonicalSubjectCatalogEntrySchema).min(1)

export type CanonicalCoreSubjectId = z.infer<typeof canonicalCoreSubjectIdSchema>
export type CanonicalAdditionalSubjectId = z.infer<typeof canonicalAdditionalSubjectIdSchema>
export type CanonicalSubjectId = z.infer<typeof canonicalSubjectIdSchema>
export type CanonicalSubjectGroupType = z.infer<typeof canonicalSubjectGroupTypeSchema>
export type CanonicalSubjectUiMeta = z.infer<typeof canonicalSubjectUiMetaSchema>
export type CanonicalSubjectCatalogEntry = z.infer<typeof canonicalSubjectCatalogEntrySchema>
export type CanonicalSubjectCatalog = z.infer<typeof canonicalSubjectCatalogSchema>

function normalizeSubjectLabel(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_/&()-]+/g, " ")
        .replace(/\s+/g, " ")
}

function buildCoreSubject(
    id: CanonicalCoreSubjectId,
    displayNameTh: string,
    displayNameEn: string,
    shortCode: string,
    sourceRegistryIds: string[],
    keywords: string[],
    aliases: string[],
    semesterMode: CanonicalSemesterMode,
    ui: CanonicalSubjectUiMeta
): CanonicalSubjectCatalogEntry {
    return {
        id,
        displayNameTh,
        displayNameEn,
        shortCode,
        groupType: "core_learning_area",
        gradeBands: [...ALL_CANONICAL_GRADE_BANDS],
        gradeLevels: [...ALL_CANONICAL_GRADE_LEVELS],
        semesterMode,
        sourceRegistryIds,
        keywords,
        aliases,
        ui,
    }
}

function buildAdditionalSubject(
    id: CanonicalAdditionalSubjectId,
    displayNameTh: string,
    displayNameEn: string,
    shortCode: string,
    sourceRegistryIds: string[],
    keywords: string[],
    aliases: string[],
    semesterMode: CanonicalSemesterMode,
    ui: CanonicalSubjectUiMeta
): CanonicalSubjectCatalogEntry {
    return {
        id,
        displayNameTh,
        displayNameEn,
        shortCode,
        groupType: "additional_subject",
        parentSubjectId: "science_technology",
        gradeBands: ["m4_m6"],
        gradeLevels: [...UPPER_SECONDARY_GRADE_LEVELS],
        semesterMode,
        sourceRegistryIds,
        keywords,
        aliases,
        ui,
    }
}

export const CANONICAL_SUBJECT_CATALOG: CanonicalSubjectCatalog = [
    buildCoreSubject(
        "thai",
        "ภาษาไทย",
        "Thai Language",
        "TH",
        ["core-basic-education-2551-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["thai", "language", "literacy"],
        ["ภาษาไทย", "วิชาภาษาไทย", "thai language", "thai subject"],
        "optional",
        { icon: "languages", colorToken: "emerald", accentToken: "green" }
    ),
    buildCoreSubject(
        "mathematics",
        "คณิตศาสตร์",
        "Mathematics",
        "MATH",
        ["core-basic-education-2551-overview", "ipst-curriculum-overview", "aksorn-basic-education-catalog"],
        ["mathematics", "math", "numeracy"],
        ["คณิตศาสตร์", "เลข", "math", "mathematics"],
        "optional",
        { icon: "calculator", colorToken: "sky", accentToken: "blue" }
    ),
    buildCoreSubject(
        "science_technology",
        "วิทยาศาสตร์และเทคโนโลยี",
        "Science and Technology",
        "SCI-TECH",
        ["core-basic-education-2551-overview", "ipst-curriculum-overview", "aksorn-basic-education-catalog"],
        ["science", "technology", "stem"],
        ["วิทยาศาสตร์และเทคโนโลยี", "วิทย์", "science", "science and technology", "science & technology"],
        "optional",
        { icon: "flask-conical", colorToken: "violet", accentToken: "purple" }
    ),
    buildCoreSubject(
        "social_religion_culture",
        "สังคมศึกษา ศาสนา และวัฒนธรรม",
        "Social Studies, Religion and Culture",
        "SOCIAL",
        ["core-basic-education-2551-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["social", "religion", "culture", "civics", "history"],
        [
            "สังคมศึกษา ศาสนา และวัฒนธรรม",
            "สังคม",
            "social studies",
            "social",
            "religion and culture",
        ],
        "optional",
        { icon: "landmark", colorToken: "amber", accentToken: "yellow" }
    ),
    buildCoreSubject(
        "health_physical_education",
        "สุขศึกษาและพลศึกษา",
        "Health and Physical Education",
        "HEALTH-PE",
        ["core-basic-education-2551-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["health", "physical education", "sports", "wellbeing"],
        ["สุขศึกษาและพลศึกษา", "สุขศึกษา", "พลศึกษา", "health", "physical education", "pe"],
        "optional",
        { icon: "heart-pulse", colorToken: "rose", accentToken: "pink" }
    ),
    buildCoreSubject(
        "arts",
        "ศิลปะ",
        "Arts",
        "ARTS",
        ["core-basic-education-2551-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["arts", "music", "visual art", "performance"],
        ["ศิลปะ", "arts", "art", "music"],
        "optional",
        { icon: "palette", colorToken: "fuchsia", accentToken: "magenta" }
    ),
    buildCoreSubject(
        "career",
        "การงานอาชีพ",
        "Career and Work",
        "CAREER",
        ["core-basic-education-2551-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["career", "work", "occupation", "life skills"],
        ["การงานอาชีพ", "การงาน", "อาชีพ", "career", "work"],
        "optional",
        { icon: "briefcase", colorToken: "orange", accentToken: "amber" }
    ),
    buildCoreSubject(
        "foreign_languages",
        "ภาษาต่างประเทศ",
        "Foreign Languages",
        "LANG",
        ["core-basic-education-2551-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["foreign language", "english", "communication"],
        ["ภาษาต่างประเทศ", "ภาษาอังกฤษ", "english", "foreign languages", "language"],
        "optional",
        { icon: "globe", colorToken: "cyan", accentToken: "teal" }
    ),
    buildAdditionalSubject(
        "physics",
        "ฟิสิกส์",
        "Physics",
        "PHYS",
        ["ipst-curriculum-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["physics", "motion", "force", "energy"],
        ["ฟิสิกส์", "physics"],
        "required",
        { icon: "atom", colorToken: "indigo", accentToken: "blue" }
    ),
    buildAdditionalSubject(
        "chemistry",
        "เคมี",
        "Chemistry",
        "CHEM",
        ["ipst-curriculum-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["chemistry", "matter", "reaction"],
        ["เคมี", "chemistry"],
        "required",
        { icon: "beaker", colorToken: "emerald", accentToken: "green" }
    ),
    buildAdditionalSubject(
        "biology",
        "ชีววิทยา",
        "Biology",
        "BIO",
        ["ipst-curriculum-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["biology", "life science", "organism"],
        ["ชีววิทยา", "biology"],
        "required",
        { icon: "leaf", colorToken: "lime", accentToken: "green" }
    ),
    buildAdditionalSubject(
        "earth_space_science",
        "โลก ดาราศาสตร์ และอวกาศ",
        "Earth, Astronomy and Space Science",
        "EARTH-SPACE",
        ["ipst-curriculum-overview", "aksorn-basic-education-catalog", "maceducation-product-catalog"],
        ["earth", "space", "astronomy", "geoscience"],
        ["โลก ดาราศาสตร์ และอวกาศ", "โลกและอวกาศ", "ดาราศาสตร์", "earth space science", "astronomy"],
        "required",
        { icon: "orbit", colorToken: "slate", accentToken: "sky" }
    ),
]

function sourceRegistryIdExists(sourceRegistryId: string) {
    return BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY.some((entry) => entry.id === sourceRegistryId)
}

function hasUniqueValues(values: string[]) {
    return new Set(values).size === values.length
}

export function isCanonicalSubjectId(value: unknown): value is CanonicalSubjectId {
    return canonicalSubjectIdSchema.safeParse(value).success
}

export function isCanonicalSubjectCatalog(value: unknown): value is CanonicalSubjectCatalog {
    return validateCanonicalSubjectCatalog(value).success
}

export function validateCanonicalSubjectCatalog(value: unknown) {
    const parsed = canonicalSubjectCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []

    if (!hasUniqueValues(parsed.data.map((entry) => entry.id))) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Canonical subject ids must be unique.",
            path: [],
        })
    }

    parsed.data.forEach((entry, index) => {
        if (entry.groupType === "core_learning_area" && entry.parentSubjectId) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Core learning areas cannot define parentSubjectId.",
                path: [index, "parentSubjectId"],
            })
        }

        if (entry.groupType === "additional_subject" && entry.parentSubjectId !== "science_technology") {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Additional subjects must map to science_technology as the parent subject.",
                path: [index, "parentSubjectId"],
            })
        }

        if (!hasUniqueValues(entry.gradeBands)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "gradeBands must not contain duplicates.",
                path: [index, "gradeBands"],
            })
        }

        if (!hasUniqueValues(entry.gradeLevels)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "gradeLevels must not contain duplicates.",
                path: [index, "gradeLevels"],
            })
        }

        entry.sourceRegistryIds.forEach((sourceRegistryId, sourceIndex) => {
            if (!sourceRegistryIdExists(sourceRegistryId)) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "sourceRegistryIds must reference existing source registry entries.",
                    path: [index, "sourceRegistryIds", sourceIndex],
                })
            }
        })
    })

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

export function getCanonicalSubjectById(subjectId: CanonicalSubjectId) {
    return CANONICAL_SUBJECT_CATALOG.find((entry) => entry.id === subjectId) ?? null
}

export function getCanonicalSubjectDisplayName(subjectId: CanonicalSubjectId, locale: "th" | "en" = "th") {
    const subject = getCanonicalSubjectById(subjectId)
    if (!subject) {
        return null
    }

    return locale === "en" ? subject.displayNameEn : subject.displayNameTh
}

export function getCanonicalSubjectsByGroupType(groupType: CanonicalSubjectGroupType) {
    return CANONICAL_SUBJECT_CATALOG.filter((entry) => entry.groupType === groupType)
}

export function getCanonicalChildSubjects(parentSubjectId: CanonicalCoreSubjectId) {
    return CANONICAL_SUBJECT_CATALOG.filter((entry) => entry.parentSubjectId === parentSubjectId)
}

export function findCanonicalSubjectByLabel(label: string) {
    const normalized = normalizeSubjectLabel(label)
    if (!normalized) {
        return null
    }

    return (
        CANONICAL_SUBJECT_CATALOG.find((entry) => {
            const candidates = [
                entry.id,
                entry.displayNameTh,
                entry.displayNameEn,
                entry.shortCode,
                ...entry.keywords,
                ...entry.aliases,
            ]

            return candidates.some((candidate) => normalizeSubjectLabel(candidate) === normalized)
        }) ?? null
    )
}

export function getCanonicalSubjectSourceEntries(subjectId: CanonicalSubjectId) {
    const subject = getCanonicalSubjectById(subjectId)
    if (!subject) {
        return []
    }

    const sourceIds = new Set(subject.sourceRegistryIds)

    return BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY.filter((entry) => sourceIds.has(entry.id)).sort(
        (left, right) => left.priority - right.priority
    )
}

export function isCurriculumSourceRegistryEntry(value: unknown) {
    return curriculumSourceRegistryEntrySchema.safeParse(value).success
}
