import { describe, expect, it } from "vitest"
import { SECONDARY_CORE_DOCX_SOURCE_ENTRY, SECONDARY_CORE_DOCX_SOURCE_ID } from "@/lib/curriculum/import/secondary-core-docx-source"
import {
    BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY,
    validateCurriculumSourceRegistry,
} from "@/lib/curriculum/source-registry"

describe("secondary core DOCX source entry", () => {
    it("registers the uploaded DOCX capture in the canonical source registry", () => {
        expect(
            BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY.some((entry) => entry.id === SECONDARY_CORE_DOCX_SOURCE_ID)
        ).toBe(true)
    })

    it("stores file capture metadata for reproducible imports", () => {
        expect(SECONDARY_CORE_DOCX_SOURCE_ENTRY.provider).toBe("teacher")
        expect(SECONDARY_CORE_DOCX_SOURCE_ENTRY.officialType).toBe("teacher_uploaded_curriculum_reference")
        expect(SECONDARY_CORE_DOCX_SOURCE_ENTRY.verificationStatus).toBe("verified_file_capture")
        expect(SECONDARY_CORE_DOCX_SOURCE_ENTRY.fileCapture?.format).toBe("docx")
        expect(SECONDARY_CORE_DOCX_SOURCE_ENTRY.fileCapture?.checksumSha256).toHaveLength(64)
    })

    it("keeps the full source registry valid after adding the DOCX capture", () => {
        expect(validateCurriculumSourceRegistry(BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY).success).toBe(true)
    })
})

