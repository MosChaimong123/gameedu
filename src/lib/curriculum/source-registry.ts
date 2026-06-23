import { z } from "zod"

export const curriculumSourceProviderSchema = z.enum([
    "core_curriculum",
    "ipst",
    "aksorn",
    "maceducation",
    "teacher",
    "platform",
])

export const curriculumSourceUsageSchema = z.enum([
    "curriculum_reference",
    "structure_reference",
    "subject_reference",
    "teacher_note",
    "teacher_override",
    "platform_sequence",
])

export const curriculumSourceRefSchema = z.object({
    provider: curriculumSourceProviderSchema,
    title: z.string().trim().min(1),
    url: z.string().trim().url().optional(),
    note: z.string().trim().min(1).optional(),
    usage: curriculumSourceUsageSchema,
})

export const curriculumSourceRegistryEntrySchema = z.object({
    id: z.string().trim().min(1),
    provider: curriculumSourceProviderSchema,
    title: z.string().trim().min(1),
    url: z.string().trim().url().optional(),
    officialType: z.enum([
        "official_curriculum",
        "official_subject_page",
        "publisher_catalog",
        "platform_internal",
    ]),
    verificationStatus: z.enum(["verified_live", "verified_catalog", "pending_capture"]),
    subjectIds: z.array(z.string().trim().min(1)).min(1),
    gradeSpans: z.array(z.string().trim().min(1)).min(1),
    priority: z.number().int().min(1).max(9),
    usages: z.array(curriculumSourceUsageSchema).min(1),
    copyrightPolicy: z.array(z.string().trim().min(1)).min(1),
    notes: z.array(z.string().trim().min(1)).optional(),
})

export const curriculumSourceRegistrySchema = z.array(curriculumSourceRegistryEntrySchema).min(1)

export type CurriculumSourceProvider = z.infer<typeof curriculumSourceProviderSchema>
export type CurriculumSourceUsage = z.infer<typeof curriculumSourceUsageSchema>
export type CurriculumSourceRef = z.infer<typeof curriculumSourceRefSchema>
export type CurriculumSourceRegistryEntry = z.infer<typeof curriculumSourceRegistryEntrySchema>
export type CurriculumSourceRegistry = z.infer<typeof curriculumSourceRegistrySchema>

export const BASIC_EDUCATION_CURRICULUM_CODE = "basic_education_2551" as const
export const BASIC_EDUCATION_CURRICULUM_REVISED_CODE = "revised_2560" as const

const COPYRIGHT_BASELINES = {
    official: [
        "Use the source for curriculum alignment, structure mapping, and outcome coverage only.",
        "Do not copy textbook prose, worked examples, illustrations, or publisher-exclusive editorial content into platform lessons.",
    ],
    catalog: [
        "Use the source for level naming, catalog grouping, and teacher-facing terminology reference only.",
        "Do not copy product descriptions, page layouts, cover art, or book content into generated lessons.",
    ],
} as const

export const BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY: CurriculumSourceRegistry = [
    {
        id: "core-basic-education-2551-overview",
        provider: "core_curriculum",
        title: "Basic Education Core Curriculum B.E. 2551 overview reference",
        url: "https://www.ipst.ac.th/curriculum",
        officialType: "official_curriculum",
        verificationStatus: "verified_live",
        subjectIds: [
            "thai",
            "mathematics",
            "science_technology",
            "social_religion_culture",
            "health_physical_education",
            "arts",
            "career",
            "foreign_languages",
        ],
        gradeSpans: ["p1_p3", "p4_p6", "m1_m3", "m4_m6"],
        priority: 1,
        usages: ["curriculum_reference", "structure_reference"],
        copyrightPolicy: [...COPYRIGHT_BASELINES.official],
        notes: [
            "Use this as the curriculum backbone anchor until each subject-specific official page is captured and linked.",
        ],
    },
    {
        id: "ipst-curriculum-overview",
        provider: "ipst",
        title: "IPST curriculum overview",
        url: "https://www.ipst.ac.th/curriculum",
        officialType: "official_subject_page",
        verificationStatus: "verified_live",
        subjectIds: ["mathematics", "science_technology", "physics", "chemistry", "biology", "earth_space_science"],
        gradeSpans: ["p1_p3", "p4_p6", "m1_m3", "m4_m6"],
        priority: 1,
        usages: ["curriculum_reference", "subject_reference", "structure_reference"],
        copyrightPolicy: [...COPYRIGHT_BASELINES.official],
        notes: [
            "Verified live source for science, mathematics, and additional science subjects on 2026-06-21.",
        ],
    },
    {
        id: "aksorn-basic-education-catalog",
        provider: "aksorn",
        title: "Aksorn basic education catalog",
        url: "https://www.aksorn.com/store/basic-education-th",
        officialType: "publisher_catalog",
        verificationStatus: "verified_catalog",
        subjectIds: [
            "thai",
            "mathematics",
            "science_technology",
            "social_religion_culture",
            "health_physical_education",
            "arts",
            "career",
            "foreign_languages",
            "physics",
            "chemistry",
            "biology",
            "earth_space_science",
        ],
        gradeSpans: ["p1_p3", "p4_p6", "m1_m3", "m4_m6"],
        priority: 3,
        usages: ["structure_reference", "subject_reference"],
        copyrightPolicy: [...COPYRIGHT_BASELINES.catalog],
        notes: ["Use for teacher-friendly naming and level packaging only."],
    },
    {
        id: "maceducation-product-catalog",
        provider: "maceducation",
        title: "MacEducation product catalog",
        url: "https://www.maceducation.com/product/",
        officialType: "publisher_catalog",
        verificationStatus: "verified_catalog",
        subjectIds: [
            "thai",
            "mathematics",
            "science_technology",
            "social_religion_culture",
            "health_physical_education",
            "arts",
            "career",
            "foreign_languages",
            "physics",
            "chemistry",
            "biology",
            "earth_space_science",
        ],
        gradeSpans: ["p1_p3", "p4_p6", "m1_m3", "m4_m6"],
        priority: 4,
        usages: ["structure_reference", "subject_reference"],
        copyrightPolicy: [...COPYRIGHT_BASELINES.catalog],
        notes: ["Use as a secondary publisher catalog reference."],
    },
    {
        id: "official-subject-pages-pending-capture",
        provider: "core_curriculum",
        title: "Pending official subject-page capture for non-IPST learning areas",
        officialType: "official_curriculum",
        verificationStatus: "pending_capture",
        subjectIds: [
            "thai",
            "social_religion_culture",
            "health_physical_education",
            "arts",
            "career",
            "foreign_languages",
        ],
        gradeSpans: ["p1_p3", "p4_p6", "m1_m3", "m4_m6"],
        priority: 2,
        usages: ["curriculum_reference", "subject_reference"],
        copyrightPolicy: [...COPYRIGHT_BASELINES.official],
        notes: [
            "Capture official subject-specific curriculum pages or PDFs before building canonical unit maps for these learning areas.",
        ],
    },
    {
        id: "teachplayedu-platform-sequencing",
        provider: "platform",
        title: "TeachPlayEdu platform sequencing and template packaging",
        officialType: "platform_internal",
        verificationStatus: "verified_live",
        subjectIds: [
            "thai",
            "mathematics",
            "science_technology",
            "social_religion_culture",
            "health_physical_education",
            "arts",
            "career",
            "foreign_languages",
            "physics",
            "chemistry",
            "biology",
            "earth_space_science",
        ],
        gradeSpans: ["p1_p3", "p4_p6", "m1_m3", "m4_m6"],
        priority: 5,
        usages: ["platform_sequence"],
        copyrightPolicy: ["Internal sequencing source only. Do not treat this as curriculum authority."],
        notes: ["Used after official curriculum sources are mapped into canonical units."],
    },
]

export function isCurriculumSourceRef(value: unknown): value is CurriculumSourceRef {
    return curriculumSourceRefSchema.safeParse(value).success
}

export function validateCurriculumSourceRef(value: unknown) {
    return curriculumSourceRefSchema.safeParse(value)
}

export function isCurriculumSourceRegistry(value: unknown): value is CurriculumSourceRegistry {
    return curriculumSourceRegistrySchema.safeParse(value).success
}

export function validateCurriculumSourceRegistry(value: unknown) {
    return curriculumSourceRegistrySchema.safeParse(value)
}

export function getCurriculumSourceRegistryBySubject(subjectId: string) {
    return BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY
        .filter((entry) => entry.subjectIds.includes(subjectId))
        .sort((left, right) => left.priority - right.priority)
}
