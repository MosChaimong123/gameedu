import type { CurriculumSourceRegistryEntry } from "@/lib/curriculum/source-registry"

export const PRIMARY_CORE_DOCX_SOURCE_ID = "primary-core-course-structure-docx" as const

export const PRIMARY_CORE_DOCX_SOURCE_ENTRY: CurriculumSourceRegistryEntry = {
    id: PRIMARY_CORE_DOCX_SOURCE_ID,
    provider: "teacher",
    title: "โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน",
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
    gradeSpans: ["p1_p3", "p4_p6"],
    priority: 2,
    usages: ["curriculum_reference", "structure_reference", "subject_reference"],
    copyrightPolicy: [
        "Use for curriculum alignment, course structure, unit mapping, and outcome coverage only.",
        "Do not copy textbook prose, publisher-exclusive examples, images, or page layout into generated lessons.",
    ],
    fileCapture: {
        format: "docx",
        originalFileName: "โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx",
        checksumSha256: "8d3f22d7184181aba6090b28dd468108b8a6e01404ce9532555d25e6aa22c0f5",
        capturedAt: "2026-07-04",
    },
}
