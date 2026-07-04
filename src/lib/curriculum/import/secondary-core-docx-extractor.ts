import mammoth from "mammoth"

export const secondaryCoreDocxTableTypeSchemaValues = ["unknown", "indicator_matrix", "unit_plan"] as const

export type SecondaryCoreDocxTableType = (typeof secondaryCoreDocxTableTypeSchemaValues)[number]

export type SecondaryCoreDocxTable = {
    tableIndex: number
    rowCount: number
    columnCount: number
    headers: string[]
    rows: string[][]
    tableType: SecondaryCoreDocxTableType
}

export type SecondaryCoreDocxExtractionResult = {
    rawText: string
    html: string
    tables: SecondaryCoreDocxTable[]
    indicatorTables: SecondaryCoreDocxTable[]
    unitPlanTables: SecondaryCoreDocxTable[]
}

function normalizeDocxCurriculumCellText(value: string) {
    return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

function stripHtmlTags(value: string) {
    return normalizeDocxCurriculumCellText(value.replace(/<[^>]+>/g, " "))
}

function normalizeHeaderKey(value: string) {
    return stripHtmlTags(value).toLowerCase()
}

function tableRowsFromHtmlRegex(html: string) {
    const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? []

    return tableMatches.map((tableHtml) => {
        const rowHtmlList = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? []
        const rows = rowHtmlList.map((rowHtml) =>
            (rowHtml.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map(stripHtmlTags)
        )

        return rows.filter((row) => row.some((cell) => cell.length > 0))
    })
}

function classifySecondaryCoreDocxTable(headers: string[]): SecondaryCoreDocxTableType {
    const normalizedHeaders = headers.map(normalizeHeaderKey)
    const headerSet = new Set(normalizedHeaders)

    const isIndicatorMatrix =
        headerSet.has("มาตรฐาน") &&
        headerSet.has("ตัวชี้วัดระหว่างทาง") &&
        headerSet.has("ตัวชี้วัดปลายทาง")

    if (isIndicatorMatrix) {
        return "indicator_matrix"
    }

    const isUnitPlan =
        headerSet.has("ชื่อหน่วย การเรียนรู้") &&
        headerSet.has("มาตรฐาน การเรียนรู้/ตัวชี้วัด") &&
        headerSet.has("สมรรถนะสำคัญ ของผู้เรียน") &&
        headerSet.has("สาระสำคัญ") &&
        normalizedHeaders.some((header) => header.includes("เวลา"))

    if (isUnitPlan) {
        return "unit_plan"
    }

    return "unknown"
}

export function extractSecondaryCoreDocxTablesFromHtml(html: string): SecondaryCoreDocxTable[] {
    return tableRowsFromHtmlRegex(html)
        .filter((rows) => rows.length > 0)
        .map((rows, tableIndex) => {
            const headers = rows[0] ?? []
            const widestRowLength = rows.reduce((max, row) => Math.max(max, row.length), 0)

            return {
                tableIndex: tableIndex + 1,
                rowCount: rows.length,
                columnCount: widestRowLength,
                headers,
                rows,
                tableType: classifySecondaryCoreDocxTable(headers),
            }
        })
}

function bufferToArrayBuffer(buffer: Buffer) {
    const copy = new Uint8Array(buffer.byteLength)
    copy.set(buffer)
    return copy.buffer
}

export async function extractSecondaryCoreDocx(buffer: Buffer): Promise<SecondaryCoreDocxExtractionResult> {
    const arrayBuffer = bufferToArrayBuffer(buffer)
    const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }),
        mammoth.extractRawText({ arrayBuffer }),
    ])

    const tables = extractSecondaryCoreDocxTablesFromHtml(htmlResult.value)

    return {
        rawText: textResult.value,
        html: htmlResult.value,
        tables,
        indicatorTables: tables.filter((table) => table.tableType === "indicator_matrix"),
        unitPlanTables: tables.filter((table) => table.tableType === "unit_plan"),
    }
}

export function summarizeSecondaryCoreDocxExtraction(result: SecondaryCoreDocxExtractionResult) {
    return {
        tableCount: result.tables.length,
        indicatorTableCount: result.indicatorTables.length,
        unitPlanTableCount: result.unitPlanTables.length,
    }
}
