import { describe, expect, it } from "vitest"
import {
    SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG,
    SECONDARY_CORE_INDICATOR_SOURCE_FILE_NAME,
} from "../canonical-indicators"
import { countIndicatorsForStandardByType, getIndicatorsForStandard, isCurriculumIndicatorCatalog } from "../indicators"

describe("secondary core canonical indicator catalog", () => {
    it("loads a valid imported catalog from the DOCX source", () => {
        expect(SECONDARY_CORE_INDICATOR_SOURCE_FILE_NAME).toContain(".docx")
        expect(isCurriculumIndicatorCatalog(SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG)).toBe(true)
        expect(SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG.indicators.length).toBeGreaterThan(0)
    })

    it("includes imported upper-secondary indicators for ว 2.1 and ว 2.2 from the DOCX source", () => {
        const physicalScienceMatterIndicators = getIndicatorsForStandard(
            SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG,
            "sci-w2_1"
        )
        const physicalScienceForceIndicators = getIndicatorsForStandard(
            SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG,
            "sci-w2_2"
        )
        const physicalScienceMatterCodes = physicalScienceMatterIndicators.map((indicator) => indicator.indicatorCode)
        const physicalScienceForceCodes = physicalScienceForceIndicators.map((indicator) => indicator.indicatorCode)

        expect(physicalScienceMatterCodes).toEqual(
            expect.arrayContaining(["ม.5/1", "ม.5/2", "ม.5/7", "ม.5/11", "ม.5/19", "ม.5/22"])
        )
        expect(countIndicatorsForStandardByType(SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG, "sci-w2_1")).toEqual(
            expect.objectContaining({
                during: expect.any(Number),
                terminal: expect.any(Number),
            })
        )
        expect(
            physicalScienceMatterIndicators
                .filter((indicator) => indicator.indicatorType === "terminal")
                .map((indicator) => indicator.indicatorCode)
        ).toEqual(expect.arrayContaining(["ม.5/7", "ม.5/11", "ม.5/19", "ม.5/22"]))

        expect(physicalScienceForceCodes).toEqual(expect.arrayContaining(["ม.5/1", "ม.5/2", "ม.5/5", "ม.5/8"]))
        expect(countIndicatorsForStandardByType(SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG, "sci-w2_2")).toEqual({
            during: 16,
            terminal: 9,
        })
    })
})
