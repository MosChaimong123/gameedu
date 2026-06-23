import { describe, expect, it } from "vitest"
import {
    PHYSICS_CURRICULUM_CATALOG,
    PHYSICS_CURRICULUM_CODE,
    PHYSICS_CURRICULUM_SCHEMA_VERSION,
    findPhysicsCurriculumUnit,
    findPhysicsLearningOutcome,
    getPhysicsCurriculumMap,
    isPhysicsCurriculumCatalog,
    isPhysicsCurriculumMap,
    validatePhysicsCurriculumCatalog,
    validatePhysicsCurriculumLink,
    validatePhysicsCurriculumMap,
    type PhysicsCurriculumMap,
} from "../curriculum"

describe("physics curriculum contracts", () => {
    it("accepts the canonical curriculum catalog", () => {
        expect(isPhysicsCurriculumCatalog(PHYSICS_CURRICULUM_CATALOG)).toBe(true)
        expect(validatePhysicsCurriculumCatalog(PHYSICS_CURRICULUM_CATALOG).success).toBe(true)
    })

    it("accepts a valid single curriculum map", () => {
        const map = PHYSICS_CURRICULUM_CATALOG[0]
        expect(isPhysicsCurriculumMap(map)).toBe(true)
        expect(validatePhysicsCurriculumMap(map).success).toBe(true)
    })

    it("rejects maps with duplicate unit ids", () => {
        const baseMap = PHYSICS_CURRICULUM_CATALOG[0]
        const invalidMap: PhysicsCurriculumMap = {
            ...baseMap,
            units: [
                baseMap.units[0],
                {
                    ...baseMap.units[1],
                    id: baseMap.units[0].id,
                },
            ],
        }

        expect(validatePhysicsCurriculumMap(invalidMap).success).toBe(true)
        expect(isPhysicsCurriculumMap(invalidMap)).toBe(false)
    })

    it("rejects maps with duplicate outcome ids across units", () => {
        const baseMap = PHYSICS_CURRICULUM_CATALOG[0]
        const invalidMap: PhysicsCurriculumMap = {
            ...baseMap,
            units: [
                baseMap.units[0],
                {
                    ...baseMap.units[1],
                    learningOutcomes: [
                        {
                            ...baseMap.units[1].learningOutcomes[0],
                            id: baseMap.units[0].learningOutcomes[0].id,
                        },
                        ...baseMap.units[1].learningOutcomes.slice(1),
                    ],
                },
            ],
        }

        expect(validatePhysicsCurriculumMap(invalidMap).success).toBe(true)
        expect(isPhysicsCurriculumMap(invalidMap)).toBe(false)
    })

    it("resolves curriculum maps, units, and outcomes by helper", () => {
        const map = getPhysicsCurriculumMap("m4", 1)
        expect(map?.curriculumCode).toBe(PHYSICS_CURRICULUM_CODE)
        expect(map?.schemaVersion).toBe(PHYSICS_CURRICULUM_SCHEMA_VERSION)

        const unit = findPhysicsCurriculumUnit("m4", 1, "phy-m4-s1-u02")
        expect(unit?.title).toBe("การเคลื่อนที่แนวตรง")

        const outcome = findPhysicsLearningOutcome("m4", 1, "phy-lo-m4-s1-u02-02")
        expect(outcome?.unit.id).toBe("phy-m4-s1-u02")
        expect(outcome?.outcome.id).toBe("phy-lo-m4-s1-u02-02")
    })

    it("accepts a valid curriculum link selection", () => {
        const result = validatePhysicsCurriculumLink({
            gradeLevel: "m5",
            semester: 2,
            unitId: "phy-m5-s2-u03",
            learningOutcomeIds: ["phy-lo-m5-s2-u03-01", "phy-lo-m5-s2-u03-03"],
        })

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.unit.title).toBe("ไฟฟ้ากระแส")
        }
    })

    it("rejects invalid grade/semester selections", () => {
        const result = validatePhysicsCurriculumLink({
            gradeLevel: "m7",
            semester: 3,
            unitId: "phy-m5-s2-u03",
            learningOutcomeIds: ["phy-lo-m5-s2-u03-01"],
        })

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.issues.some((issue) => issue.code === "INVALID_GRADE_LEVEL")).toBe(true)
            expect(result.issues.some((issue) => issue.code === "INVALID_SEMESTER")).toBe(true)
        }
    })

    it("rejects selections with missing unit ids or empty outcome lists", () => {
        const result = validatePhysicsCurriculumLink({
            gradeLevel: "m4",
            semester: 1,
            unitId: "",
            learningOutcomeIds: [],
        })

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.issues.some((issue) => issue.code === "EMPTY_UNIT_ID")).toBe(true)
            expect(result.issues.some((issue) => issue.code === "EMPTY_OUTCOME_IDS")).toBe(true)
        }
    })

    it("rejects selections with outcomes from another unit", () => {
        const result = validatePhysicsCurriculumLink({
            gradeLevel: "m4",
            semester: 1,
            unitId: "phy-m4-s1-u01",
            learningOutcomeIds: ["phy-lo-m4-s1-u02-01"],
        })

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.issues.some((issue) => issue.code === "OUTCOME_OUTSIDE_UNIT")).toBe(true)
        }
    })

    it("rejects duplicate or unknown outcome ids", () => {
        const result = validatePhysicsCurriculumLink({
            gradeLevel: "m6",
            semester: 2,
            unitId: "phy-m6-s2-u03",
            learningOutcomeIds: ["phy-lo-m6-s2-u03-01", "phy-lo-m6-s2-u03-01", "missing-outcome"],
        })

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.issues.some((issue) => issue.code === "DUPLICATE_OUTCOME_ID")).toBe(true)
            expect(result.issues.some((issue) => issue.code === "OUTCOME_NOT_FOUND")).toBe(true)
        }
    })
})
