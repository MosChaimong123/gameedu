import { describe, expect, it } from "vitest"
import {
    BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY,
    getCurriculumSourceRegistryBySubject,
    isCurriculumSourceRef,
    isCurriculumSourceRegistry,
    validateCurriculumSourceRegistry,
} from "../source-registry"

describe("curriculum source registry", () => {
    it("accepts the canonical source registry", () => {
        expect(isCurriculumSourceRegistry(BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY)).toBe(true)
        expect(validateCurriculumSourceRegistry(BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY).success).toBe(true)
    })

    it("resolves subject sources sorted by priority", () => {
        const physicsSources = getCurriculumSourceRegistryBySubject("physics")

        expect(physicsSources.length).toBeGreaterThan(0)
        expect(physicsSources[0]?.priority).toBe(1)
        expect(physicsSources[0]?.provider).toBe("ipst")
    })

    it("keeps a general official curriculum source for all core learning areas", () => {
        const thaiSources = getCurriculumSourceRegistryBySubject("thai")

        expect(
            thaiSources.some(
                (entry) => entry.provider === "core_curriculum" && entry.officialType === "official_curriculum"
            )
        ).toBe(true)
    })

    it("accepts source refs with the expanded provider set", () => {
        expect(
            isCurriculumSourceRef({
                provider: "core_curriculum",
                title: "Basic Education Core Curriculum overview",
                usage: "curriculum_reference",
            })
        ).toBe(true)
    })
})
