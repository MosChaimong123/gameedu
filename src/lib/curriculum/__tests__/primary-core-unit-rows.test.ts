import { describe, expect, it } from "vitest"
import { PRIMARY_CORE_UNIT_ROWS_PAYLOAD } from "@/lib/curriculum/import/primary-core-unit-rows-payload"

/**
 * The primary DOCX extractor originally captured indicator codes but left every
 * `description` null, which silently disabled the lesson builder's objective
 * auto-fill for all of ป.1-6 (the secondary rows were unaffected). The text was
 * recovered from `standardsIndicatorsRaw` by
 * scripts/backfill_primary_indicator_descriptions.mjs.
 *
 * These tests pin that recovery so a future re-import cannot regress it unnoticed.
 */
describe("primary core unit rows", () => {
    const units = PRIMARY_CORE_UNIT_ROWS_PAYLOAD.courses.flatMap((course) => course.units)
    const indicators = units.flatMap((unit) => [...unit.duringIndicators, ...unit.terminalIndicators])

    it("covers every primary grade", () => {
        const gradeLevels = new Set(PRIMARY_CORE_UNIT_ROWS_PAYLOAD.courses.map((course) => course.gradeLevel))
        expect([...gradeLevels].sort()).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"])
    })

    it("gives every indicator a description", () => {
        const missing = indicators.filter((indicator) => !indicator.description?.trim())
        expect(missing).toEqual([])
        expect(indicators.length).toBeGreaterThan(1900)
    })

    it("keeps indicator descriptions free of the source markers they were split on", () => {
        const leaked = indicators.filter(
            (indicator) => indicator.description && /มฐ|ตัวชี้วัด(ระหว่างทาง|ปลายทาง)/u.test(indicator.description)
        )
        expect(leaked).toEqual([])
    })

    it("lets almost every unit auto-fill lesson objectives", () => {
        // The remainder are units the source itself ships without any indicator.
        const withoutObjectives = units.filter(
            (unit) =>
                [...unit.duringIndicators, ...unit.terminalIndicators].filter((indicator) => indicator.description?.trim())
                    .length === 0
        )
        expect(withoutObjectives.length).toBeLessThanOrEqual(6)
    })

    it("resolves a known ป.1 unit end to end", () => {
        const thai = PRIMARY_CORE_UNIT_ROWS_PAYLOAD.courses.find(
            (course) => course.gradeLevel === "p1" && course.titleTh === "หลักภาษาและการใช้ภาษาไทย"
        )
        const unit = thai?.units.find((entry) => entry.unitNumber === 1)
        expect(unit?.title).toBe("ฉันและเธอ")
        expect(unit?.duringIndicators[0]).toMatchObject({
            code: "ท 3.1 ป.1/5",
            description: "มีมารยาทในการฟัง การดู และการพูด",
        })
    })
})
