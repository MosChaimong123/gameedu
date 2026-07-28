import { describe, expect, it } from "vitest"
import {
    getSubjectCurriculumMapPack,
    getSubjectCurriculumUnitById,
    isSubjectCurriculumMapPackCatalog,
    listSubjectCurriculumUnitsByCurriculumSelection,
    listSubjectCurriculumUnitsForGradeBand,
    listSubjectCurriculumUnitsForGradeLevel,
    SUBJECT_CURRICULUM_MAP_PACKS,
    validateSubjectCurriculumMapPackCatalog,
} from "../map-packs"

describe("subject curriculum map packs", () => {
    it("accepts the canonical starter pack catalog", () => {
        expect(isSubjectCurriculumMapPackCatalog(SUBJECT_CURRICULUM_MAP_PACKS)).toBe(true)
        expect(validateSubjectCurriculumMapPackCatalog(SUBJECT_CURRICULUM_MAP_PACKS).success).toBe(true)
    })

    it("covers all eight core learning areas plus all four active additional packs", () => {
        expect(SUBJECT_CURRICULUM_MAP_PACKS).toHaveLength(12)
        expect(SUBJECT_CURRICULUM_MAP_PACKS.map((pack) => pack.subjectId)).toEqual(
            expect.arrayContaining([
                "physics",
                "chemistry",
                "biology",
                "earth_space_science",
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

    it("resolves the physics additional pack with upper-secondary semester units", () => {
        const pack = getSubjectCurriculumMapPack("physics")

        expect(pack).not.toBeNull()
        expect(pack?.packStatus).toBe("starter_additional_map")
        expect(pack?.semesterMode).toBe("required")
        expect(pack?.unitOutlines.length).toBeGreaterThan(0)
        expect(pack?.unitOutlines.every((unit) => unit.courseType === "additional")).toBe(true)
        expect(pack?.unitOutlines.some((unit) => unit.gradeLevels.includes("m4") && unit.semester === 1)).toBe(true)
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

    it("stores canonical strand, standard, competency, and key concept metadata on units", () => {
        const unit = getSubjectCurriculumUnitById("science_technology", "sci-tech-u02")

        expect(unit).not.toBeNull()
        expect(unit?.courseType).toBe("core")
        expect(unit?.strandId).toBe("sci-physical-science")
        expect(unit?.standardIds).toEqual(["sci-w2_1", "sci-w2_2", "sci-w2_3"])
        expect(unit?.keyConceptTh.length).toBeGreaterThan(0)
        expect(unit?.competencies.length).toBeGreaterThan(0)
        expect(unit?.estimatedHours).toBeGreaterThan(0)
    })

    it("lists grade-level units in stable order", () => {
        const units = listSubjectCurriculumUnitsForGradeLevel("foreign_languages", "m5")

        expect(units.length).toBeGreaterThan(0)
        expect(units[0]?.order).toBe(0)
        expect(units[0]?.gradeLevels).toContain("m5")
    })

    it("filters units by subject, grade, strand, and standard without crossing subjects", () => {
        const matched = listSubjectCurriculumUnitsByCurriculumSelection({
            subjectId: "thai",
            gradeLevel: "m4",
            strandId: "thai-reading",
            standardId: "thai-th1_1",
        })

        expect(matched.map((unit) => unit.id)).toEqual(["thai-u02"])

        const none = listSubjectCurriculumUnitsByCurriculumSelection({
            subjectId: "thai",
            gradeLevel: "m4",
            strandId: "thai-reading",
            standardId: "math-k1_1",
        })

        expect(none).toEqual([])
    })
})
