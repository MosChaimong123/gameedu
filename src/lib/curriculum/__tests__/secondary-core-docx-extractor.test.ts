import { describe, expect, it } from "vitest"
import {
    extractSecondaryCoreDocxTablesFromHtml,
    summarizeSecondaryCoreDocxExtraction,
} from "@/lib/curriculum/import/secondary-core-docx-extractor"

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
    </table>
    <table>
        <tr>
            <td>ชื่อหน่วย การเรียนรู้</td>
            <td>มาตรฐาน การเรียนรู้/ตัวชี้วัด</td>
            <td>สมรรถนะสำคัญ ของผู้เรียน</td>
            <td>สาระสำคัญ</td>
            <td>เวลา (ชั่วโมง)</td>
        </tr>
        <tr>
            <td>หน่วยการเรียนรู้ที่ 1</td>
            <td>ท 1.1 ม.1/1</td>
            <td>การสื่อสาร</td>
            <td>สาระสำคัญตัวอย่าง</td>
            <td>8</td>
        </tr>
    </table>
    <table>
        <tr>
            <td>หัวข้ออื่น</td>
            <td>หมายเหตุ</td>
        </tr>
        <tr>
            <td>ไม่เกี่ยว</td>
            <td>ไม่เกี่ยว</td>
        </tr>
    </table>
`

describe("secondary core DOCX extractor", () => {
    it("classifies indicator and unit plan tables from DOCX-style HTML", () => {
        const tables = extractSecondaryCoreDocxTablesFromHtml(SAMPLE_HTML)

        expect(tables).toHaveLength(3)
        expect(tables[0]?.tableType).toBe("indicator_matrix")
        expect(tables[1]?.tableType).toBe("unit_plan")
        expect(tables[2]?.tableType).toBe("unknown")
    })

    it("keeps raw row geometry for downstream import processing", () => {
        const tables = extractSecondaryCoreDocxTablesFromHtml(SAMPLE_HTML)

        expect(tables[0]?.headers).toEqual(["มาตรฐาน", "ตัวชี้วัดระหว่างทาง", "ตัวชี้วัดปลายทาง"])
        expect(tables[1]?.rowCount).toBe(2)
        expect(tables[1]?.columnCount).toBe(5)
    })

    it("summarizes extraction counts for reporting", () => {
        const tables = extractSecondaryCoreDocxTablesFromHtml(SAMPLE_HTML)
        const summary = summarizeSecondaryCoreDocxExtraction({
            rawText: "",
            html: SAMPLE_HTML,
            tables,
            indicatorTables: tables.filter((table) => table.tableType === "indicator_matrix"),
            unitPlanTables: tables.filter((table) => table.tableType === "unit_plan"),
        })

        expect(summary).toEqual({
            tableCount: 3,
            indicatorTableCount: 1,
            unitPlanTableCount: 1,
        })
    })
})

