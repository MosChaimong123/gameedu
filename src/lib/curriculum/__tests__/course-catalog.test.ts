import { describe, expect, it } from "vitest"
import { SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG } from "../canonical-indicators"
import {
    CANONICAL_COURSE_CATALOG,
    getCanonicalCourseById,
    getCanonicalCourseOptions,
    getCanonicalCoursesForSubject,
    getCanonicalCoursesForSubjectAndGrade,
    getPrimaryCoreCourseIndicatorCrosswalkRows,
    getSecondaryCoreCourseUnits,
    isCanonicalCourseCatalog,
    validateCanonicalCourseCatalog,
} from "../course-catalog"

describe("canonical course catalog", () => {
    it("accepts the generated canonical course catalog", () => {
        expect(isCanonicalCourseCatalog(CANONICAL_COURSE_CATALOG)).toBe(true)
        expect(validateCanonicalCourseCatalog(CANONICAL_COURSE_CATALOG).success).toBe(true)
    })

    it("uses DOCX course rows instead of deriving course names from unit titles", () => {
        const m5Physics = getCanonicalCourseById("science_technology:physical-science-physics:m5")

        expect(m5Physics).not.toBeNull()
        expect(m5Physics?.titleTh).toBe("วิทยาศาสตร์กายภาพ 2 (ฟิสิกส์)")
        expect(m5Physics?.standardIds).toEqual(["sci-w2_2", "sci-w2_3"])
        expect(m5Physics?.duringIndicatorIds.length).toBeGreaterThan(0)
        expect(m5Physics?.terminalIndicatorIds.length).toBeGreaterThan(0)
        expect(m5Physics?.unitIds).toEqual(["sci-tech-u02-physics"])
        expect(m5Physics?.descriptionText?.charCodeAt(0)).toBe(0x0e28)
        expect(m5Physics?.descriptionText).toContain("แรงนิวเคลียร์")
        expect(m5Physics?.descriptionText?.length).toBeGreaterThan(1000)
    })

    it("includes primary grade course options from the primary DOCX source", () => {
        const p1ThaiCourses = getCanonicalCourseOptions("thai", "p1")
        const p4MathCourses = getCanonicalCourseOptions("mathematics", "p4")

        expect(p1ThaiCourses.map((entry) => entry.id)).toEqual(
            expect.arrayContaining(["thai:thai-language-use:p1", "thai:thai-literature:p1"])
        )
        expect(p4MathCourses.map((entry) => entry.id)).toEqual(["mathematics:mathematics:p4"])
    })

    it("returns primary DOCX units for primary course shells", () => {
        const p1ThaiLanguageUse = getCanonicalCourseById("thai:thai-language-use:p1")

        expect(p1ThaiLanguageUse).not.toBeNull()
        const units = getSecondaryCoreCourseUnits(p1ThaiLanguageUse!)

        expect(units.length).toBeGreaterThan(0)
        expect(units[0]?.duringIndicators).toHaveLength(2)
        expect(units[0]?.terminalIndicators).toHaveLength(2)
        expect(p1ThaiLanguageUse?.standardIds).not.toContain("thai-th5_1")
        expect(units[0]?.title).toBe("ฉันและเธอ")
    })

    it("returns primary DOCX indicator crosswalk rows without deriving them from unit rows", () => {
        const p1ThaiLanguageUse = getCanonicalCourseById("thai:thai-language-use:p1")
        const p1ThaiLiterature = getCanonicalCourseById("thai:thai-literature:p1")

        expect(p1ThaiLanguageUse).not.toBeNull()
        expect(p1ThaiLiterature).not.toBeNull()

        const languageUseRows = getPrimaryCoreCourseIndicatorCrosswalkRows(p1ThaiLanguageUse!)
        const literatureRows = getPrimaryCoreCourseIndicatorCrosswalkRows(p1ThaiLiterature!)
        const languageUseDuringCodes = languageUseRows.flatMap((row) =>
            row.duringIndicators.map((indicator) => indicator.code)
        )
        const languageUseTerminalCodes = languageUseRows.flatMap((row) =>
            row.terminalIndicators.map((indicator) => indicator.code)
        )

        expect(languageUseDuringCodes).toHaveLength(13)
        expect(languageUseTerminalCodes).toHaveLength(7)
        expect(languageUseTerminalCodes).toEqual(
            expect.arrayContaining(["ท 1.1 ป.1/1", "ท 1.1 ป.1/2", "ท 1.1 ป.1/7", "ท 4.1 ป.1/3"])
        )
        expect(literatureRows.flatMap((row) => row.duringIndicators)).toHaveLength(0)
        expect(literatureRows.flatMap((row) => row.terminalIndicators).map((indicator) => indicator.code)).toEqual([
            "ท 1.1 ป.1/1",
            "ท 5.1 ป.1/1",
            "ท 5.1 ป.1/2",
        ])
    })

    it("loads Thai course descriptions from the DOCX-backed source instead of short fallback summaries", () => {
        const m1ThaiLanguageUse = getCanonicalCourseById("thai:thai-language-use:m1")

        expect(m1ThaiLanguageUse).not.toBeNull()
        expect(m1ThaiLanguageUse?.descriptionText).toContain("ฝึกทักษะการอ่าน")
        expect(m1ThaiLanguageUse?.descriptionText).toContain("กาพย์ยานี 11")
        expect(m1ThaiLanguageUse?.descriptionText?.length).toBeGreaterThan(500)
    })

    it("maps English course descriptions by grade-specific source titles", () => {
        const m4English = getCanonicalCourseById("foreign_languages:english-upbeat:m4")

        expect(m4English).not.toBeNull()
        expect(m4English?.descriptionText).toContain("เข้าใจน้ำเสียง")
        expect(m4English?.descriptionText).toContain("การศึกษาและอาชีพ")
        expect(m4English?.descriptionText?.length).toBeGreaterThan(300)
    })

    it("filters courses by subject and grade", () => {
        const thaiCourses = getCanonicalCoursesForSubject("thai")
        const m5ThaiCourses = getCanonicalCoursesForSubjectAndGrade("thai", "m5")

        expect(thaiCourses.length).toBeGreaterThan(0)
        expect(m5ThaiCourses.every((entry) => entry.gradeLevel === "m5")).toBe(true)
        expect(m5ThaiCourses.map((entry) => entry.titleTh)).toEqual(
            expect.arrayContaining(["หลักภาษาและการใช้ภาษาไทย", "วรรณคดีและวรรณกรรม"])
        )
    })

    it("returns only the ม.5 science courses (เคมี + ฟิสิกส์ + เทคโนโลยีออกแบบ + วิทยาการคำนวณ)", () => {
        const options = getCanonicalCourseOptions("science_technology", "m5")

        expect(options.map((entry) => entry.id)).toEqual(
            expect.arrayContaining([
                "science_technology:physical-science-chemistry:m5",
                "science_technology:physical-science-physics:m5",
                "science_technology:technology-design-upper:m5",
                "science_technology:technology-computing-upper:m5",
            ])
        )
        expect(options).toHaveLength(4)
    })

    it("returns physics additional upper-secondary courses by grade and semester", () => {
        const m4Physics = getCanonicalCourseOptions("physics", "m4")

        expect(m4Physics).toHaveLength(2)
        expect(m4Physics.map((entry) => entry.semester)).toEqual([1, 2])
        expect(m4Physics.map((entry) => entry.titleTh)).toEqual([
            "ฟิสิกส์เพิ่มเติม ฟิสิกส์ เล่ม 1 ภาคเรียนที่ 1",
            "ฟิสิกส์เพิ่มเติม ฟิสิกส์ เล่ม 2 ภาคเรียนที่ 2",
        ])
        expect(m4Physics.every((entry) => entry.coreSubjectId === "physics")).toBe(true)
        expect(m4Physics.every((entry) => entry.duringIndicatorIds.length === 0)).toBe(true)
        expect(m4Physics.every((entry) => entry.terminalIndicatorIds.length === 0)).toBe(true)
    })

    it("returns only the ม.4 science courses (ชีวภาพ + เทคโนโลยีออกแบบ + วิทยาการคำนวณ)", () => {
        const options = getCanonicalCourseOptions("science_technology", "m4")

        expect(options.map((entry) => entry.id)).toEqual(
            expect.arrayContaining([
                "science_technology:biology-science:m4",
                "science_technology:technology-design-upper:m4",
                "science_technology:technology-computing-upper:m4",
            ])
        )
        expect(options).toHaveLength(3)
    })

    it("returns only the ม.6 science courses (โลกและอวกาศ + วิทยาการคำนวณ)", () => {
        const options = getCanonicalCourseOptions("science_technology", "m6")

        expect(options.map((entry) => entry.id)).toEqual(
            expect.arrayContaining([
                "science_technology:earth-space-science:m6",
                "science_technology:technology-computing-upper:m6",
            ])
        )
        expect(options).toHaveLength(2)
    })

    it("returns the lower-secondary science course options separately", () => {
        const options = getCanonicalCourseOptions("science_technology", "m1")

        expect(options.map((entry) => entry.id)).toEqual([
            "science_technology:technology-design-lower:m1",
            "science_technology:technology-computing-lower:m1",
            "science_technology:science-technology-integrated:m1",
        ])
    })

    it("rejects indicator ids that do not match the selected grade", () => {
        const wrongGradeIndicator = SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG.indicators.find(
            (indicator) =>
                indicator.subjectId === "science_technology" &&
                indicator.indicatorType === "during" &&
                indicator.gradeLevel !== "m5"
        )

        expect(wrongGradeIndicator).toBeDefined()

        const mutated = CANONICAL_COURSE_CATALOG.map((entry) =>
            entry.id === "science_technology:physical-science-physics:m5"
                ? {
                      ...entry,
                      duringIndicatorIds: [...entry.duringIndicatorIds, wrongGradeIndicator!.id],
                  }
                : entry
        )

        const result = validateCanonicalCourseCatalog(mutated)

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.message.includes("gradeLevel"))).toBe(true)
        }
    })
})
