import type { CurriculumSourceRegistryEntry } from "@/lib/curriculum/source-registry"

export const SECONDARY_CORE_DOCX_SOURCE_ID = "teacher-secondary-core-structure-docx-2026-06-23" as const

export const SECONDARY_CORE_DOCX_SOURCE_ENTRY: CurriculumSourceRegistryEntry = {
    id: SECONDARY_CORE_DOCX_SOURCE_ID,
    provider: "teacher",
    title: "Secondary core curriculum structure DOCX capture",
    officialType: "teacher_uploaded_curriculum_reference",
    verificationStatus: "verified_file_capture",
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
    gradeSpans: ["m1_m3", "m4_m6"],
    priority: 2,
    usages: ["curriculum_reference", "structure_reference", "subject_reference"],
    copyrightPolicy: [
        "Use the source for curriculum alignment, structure mapping, and outcome coverage only.",
        "Do not copy textbook prose, worked examples, illustrations, or publisher-exclusive editorial content into platform lessons.",
    ],
    notes: [
        "Teacher-provided DOCX capture used to seed canonical middle and upper secondary core subject maps.",
        "Use for structure extraction, indicator grouping, and unit planning alignment only.",
    ],
    fileCapture: {
        format: "docx",
        originalFileName: "โครงสร้างระดับมัธยม พื้นฐาน.docx",
        checksumSha256: "BA5598E801CE4A99E15F7C7F5ADD7153FA22DDFD655DCB578504FD20EB6DAA3D",
        capturedAt: "2026-06-23",
    },
}

