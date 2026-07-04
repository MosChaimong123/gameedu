import { describe, expect, it } from "vitest"
import { extractSecondaryCoreDocxTablesFromHtml } from "@/lib/curriculum/import/secondary-core-docx-extractor"
import {
    buildCurriculumIndicatorCatalogFromDocxTables,
    countIndicatorsForStandardByType,
    extractIndicatorCodes,
    getCurriculumStandardByCode,
    getIndicatorSummaryForStandard,
    getIndicatorsForStandard,
    gradeLevelFromIndicatorCode,
    isCurriculumIndicatorCatalog,
    parseIndicatorMatrixTable,
    parseUnitPlanIndicatorReferences,
    validateCurriculumIndicatorCatalog,
} from "../indicators"

const SAMPLE_HTML = `
    <table>
        <tr>
            <td>มาตรฐาน</td>
            <td>ตัวชี้วัดระหว่างทาง</td>
            <td>ตัวชี้วัดปลายทาง</td>
        </tr>
        <tr>
            <td>มฐ. ท 1.1</td>
            <td>ม.1/1, ม.1/3</td>
            <td>ม.1/2</td>
        </tr>
        <tr>
            <td>ว 4.2</td>
            <td>ม.2/1</td>
            <td>ม.2/2, ม.2/3</td>
        </tr>
    </table>
`

describe("curriculum indicators", () => {
    it("extracts distinct indicator codes from text", () => {
        expect(extractIndicatorCodes("ม.1/1, ม.1/2 ม.1/1")).toEqual(["ม.1/1", "ม.1/2"])
    })

    it("maps indicator codes to canonical grade levels", () => {
        expect(gradeLevelFromIndicatorCode("ม.4/2")).toBe("m4")
        expect(gradeLevelFromIndicatorCode("ป.6/1")).toBe("p6")
        expect(gradeLevelFromIndicatorCode("ท 1.1")).toBeNull()
    })

    it("parses indicator matrix rows into during and terminal groups", () => {
        const [table] = extractSecondaryCoreDocxTablesFromHtml(SAMPLE_HTML)
        const rows = table ? parseIndicatorMatrixTable(table) : []

        expect(rows).toEqual([
            {
                standardCode: "ท 1.1",
                duringIndicatorCodes: ["ม.1/1", "ม.1/3"],
                terminalIndicatorCodes: ["ม.1/2"],
            },
            {
                standardCode: "ว 4.2",
                duringIndicatorCodes: ["ม.2/1"],
                terminalIndicatorCodes: ["ม.2/2", "ม.2/3"],
            },
        ])
    })

    it("builds a canonical indicator catalog from indicator matrix tables", () => {
        const tables = extractSecondaryCoreDocxTablesFromHtml(SAMPLE_HTML)
        const result = buildCurriculumIndicatorCatalogFromDocxTables(tables)

        expect(result.issues).toEqual([])
        expect(isCurriculumIndicatorCatalog(result.catalog)).toBe(true)
        expect(validateCurriculumIndicatorCatalog(result.catalog).success).toBe(true)
        expect(result.catalog.indicators).toHaveLength(6)

        const thaiIndicators = getIndicatorsForStandard(result.catalog, "thai-th1_1")
        expect(thaiIndicators).toHaveLength(3)
        expect(countIndicatorsForStandardByType(result.catalog, "thai-th1_1")).toEqual({
            during: 2,
            terminal: 1,
        })

        expect(getIndicatorSummaryForStandard(result.catalog, "sci-w4_2")).toEqual({
            standardId: "sci-w4_2",
            standardCode: "ว 4.2",
            duringCount: 1,
            terminalCount: 2,
            totalCount: 3,
        })
    })

    it("parses standard and indicator references from unit plan cell text", () => {
        expect(parseUnitPlanIndicatorReferences("ท 1.1 ม.1/1 อธิบายใจความสำคัญ")).toEqual([
            {
                standardCode: "ท 1.1",
                indicatorCode: "ม.1/1",
                textTh: "อธิบายใจความสำคัญ",
            },
        ])
    })

    it("looks up canonical standards by standard code", () => {
        expect(getCurriculumStandardByCode("มฐ. ท 1.1")?.id).toBe("thai-th1_1")
        expect(getCurriculumStandardByCode("unknown")).toBeNull()
    })

    it("rejects indicators that cross subjects or strands", () => {
        const tables = extractSecondaryCoreDocxTablesFromHtml(SAMPLE_HTML)
        const result = buildCurriculumIndicatorCatalogFromDocxTables(tables)
        const invalidCatalog = {
            ...result.catalog,
            indicators: result.catalog.indicators.map((indicator) =>
                indicator.id.includes("thai-th1_1")
                    ? {
                          ...indicator,
                          subjectId: "mathematics" as const,
                      }
                    : indicator
            ),
        }

        expect(validateCurriculumIndicatorCatalog(invalidCatalog).success).toBe(false)
    })
})
