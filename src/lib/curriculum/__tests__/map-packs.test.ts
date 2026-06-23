import { describe, expect, it } from "vitest"
import {
    getSubjectCurriculumMapPack,
    isSubjectCurriculumMapPackCatalog,
    listSubjectCurriculumUnitsForGradeBand,
    SUBJECT_CURRICULUM_MAP_PACKS,
    validateSubjectCurriculumMapPackCatalog,
} from "../map-packs"

describe("subject curriculum map packs", () => {
    it("accepts the canonical starter pack catalog", () => {
        expect(isSubjectCurriculumMapPackCatalog(SUBJECT_CURRICULUM_MAP_PACKS)).toBe(true)
        expect(validateSubjectCurriculumMapPackCatalog(SUBJECT_CURRICULUM_MAP_PACKS).success).toBe(true)
    })

    it("covers all eight core learning areas", () => {
        expect(SUBJECT_CURRICULUM_MAP_PACKS).toHaveLength(8)
        expect(SUBJECT_CURRICULUM_MAP_PACKS.map((pack) => pack.subjectId)).toEqual(
            expect.arrayContaining([
                "thai",
                "mathematics",
                "science_technology",
                "social_religion_culture",
                "health_physical_education",
                "arts",
                "career",
                "foreign_languages",
            ])
        )
    })

    it("resolves a subject pack by canonical subject id", () => {
        const pack = getSubjectCurriculumMapPack("science_technology")

        expect(pack).not.toBeNull()
        expect(pack?.displayNameTh).toBe("วิทยาศาสตร์และเทคโนโลยี")
        expect(pack?.unitOutlines.length).toBeGreaterThan(0)
    })

    it("lists grade-band units in stable order", () => {
        const units = listSubjectCurriculumUnitsForGradeBand("thai", "m4_m6")

        expect(units.length).toBeGreaterThan(0)
        expect(units[0]?.order).toBe(0)
        expect(units[0]?.title).toBe("การฟัง การดู และการพูด")
    })

    it("keeps flexible semester handling for starter core packs", () => {
        const pack = getSubjectCurriculumMapPack("mathematics")

        expect(pack?.semesterMode).toBe("optional")
        expect(pack?.unitOutlines.every((unit) => unit.semesterMode === "optional")).toBe(true)
    })
})
