import secondaryCoreIndicatorRowsPayload from "@/lib/curriculum/import/secondary-core-indicator-rows.json"
import {
    buildCurriculumIndicatorCatalogFromRows,
    validateCurriculumIndicatorCatalog,
    type ParsedIndicatorMatrixRow,
} from "@/lib/curriculum/indicators"
import { CURRICULUM_STRAND_STANDARD_CATALOG } from "@/lib/curriculum/strands-and-standards"

type SecondaryCoreIndicatorRowsPayload = {
    sourceFileName: string
    rows: (ParsedIndicatorMatrixRow & {
        tableIndex?: number
        rowIndex?: number
    })[]
}

const parsedPayload = secondaryCoreIndicatorRowsPayload as SecondaryCoreIndicatorRowsPayload

const knownStandardCodes = new Set(CURRICULUM_STRAND_STANDARD_CATALOG.standards.map((s) => s.code))

const buildResult = buildCurriculumIndicatorCatalogFromRows(
    parsedPayload.rows
        .filter((row) => knownStandardCodes.has(row.standardCode))
        .map((row) => ({
            standardCode: row.standardCode,
            duringIndicatorCodes: row.duringIndicatorCodes,
            terminalIndicatorCodes: row.terminalIndicatorCodes,
        }))
)

if (buildResult.issues.length > 0) {
    throw new Error(
        `Secondary core indicator import has ${buildResult.issues.length} unresolved issue(s). First issue: ${buildResult.issues[0]?.message ?? "unknown"}`
    )
}

const validatedCatalog = validateCurriculumIndicatorCatalog(buildResult.catalog)

if (!validatedCatalog.success) {
    throw validatedCatalog.error
}

export const SECONDARY_CORE_INDICATOR_SOURCE_FILE_NAME = parsedPayload.sourceFileName
export const SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG = validatedCatalog.data
