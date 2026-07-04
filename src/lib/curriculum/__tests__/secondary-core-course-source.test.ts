import { describe, expect, it } from "vitest"
import {
    buildSecondaryCoreCourseSourceRowsFromTables,
    isSecondaryCoreCourseSourcePayload,
} from "@/lib/curriculum/import/secondary-core-course-source"
import { SECONDARY_CORE_COURSE_SOURCE_PAYLOAD } from "@/lib/curriculum/import/secondary-core-course-rows-payload"

describe("secondary core course source extraction", () => {
    it("loads a valid extracted payload from the DOCX-derived JSON artifact", () => {
        expect(isSecondaryCoreCourseSourcePayload(SECONDARY_CORE_COURSE_SOURCE_PAYLOAD)).toBe(true)
        expect(SECONDARY_CORE_COURSE_SOURCE_PAYLOAD.rows.length).toBeGreaterThan(0)
    })

    it("keeps resolved rows and unresolved rows visible in the artifact", () => {
        const resolvedRows = SECONDARY_CORE_COURSE_SOURCE_PAYLOAD.rows.filter((row) => row.subjectId !== null)
        const unresolvedRows = SECONDARY_CORE_COURSE_SOURCE_PAYLOAD.rows.filter((row) =>
            row.issueCodes.includes("missing_standard_mapping")
        )

        expect(resolvedRows.length).toBeGreaterThan(0)
        expect(unresolvedRows.length).toBeGreaterThan(0)
    })

    it("extracts unit-plan rows into canonical source rows with subject, grade, and summary text", () => {
        const rows = buildSecondaryCoreCourseSourceRowsFromTables([
            {
                tableIndex: 1,
                rowCount: 2,
                columnCount: 5,
                headers: [
                    "ชื่อหน่วย การเรียนรู้",
                    "มาตรฐาน การเรียนรู้/ตัวชี้วัด",
                    "สมรรถนะสำคัญ ของผู้เรียน",
                    "สาระสำคัญ",
                    "เวลา (ชั่วโมง)",
                ],
                rows: [
                    [
                        "ชื่อหน่วย การเรียนรู้",
                        "มาตรฐาน การเรียนรู้/ตัวชี้วัด",
                        "สมรรถนะสำคัญ ของผู้เรียน",
                        "สาระสำคัญ",
                        "เวลา (ชั่วโมง)",
                    ],
                    [
                        "หน่วย การเรียนรู้ที่ 1 การอ่านออกเสียง",
                        "ตัวชี้วัดระหว่างทาง ท 1.1 ม.1/1 อ่านออกเสียง",
                        "การสื่อสาร",
                        "ฝึกอ่านออกเสียงให้เหมาะสมกับเรื่องที่อ่าน",
                        "4",
                    ],
                ],
                tableType: "unit_plan",
            },
        ])

        expect(rows).toHaveLength(1)
        expect(rows[0]?.subjectId).toBe("thai")
        expect(rows[0]?.gradeLevels).toEqual(["m1"])
        expect(rows[0]?.standardCodes).toEqual(["ท 1.1"])
        expect(rows[0]?.summaryText).toContain("อ่านออกเสียง")
        expect(rows[0]?.estimatedHours).toBe(4)
    })
})
