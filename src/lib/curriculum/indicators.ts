import { z } from "zod"
import { curriculumSourceRefSchema, type CurriculumSourceRef } from "@/lib/curriculum/source-registry"
import { canonicalGradeLevelSchema, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"
import { canonicalCoreSubjectIdSchema } from "@/lib/curriculum/subject-catalog"
import {
    curriculumStandardCodeSchema,
    CURRICULUM_STRAND_STANDARD_CATALOG,
    getCurriculumStandardById,
    type CurriculumStandard,
} from "@/lib/curriculum/strands-and-standards"
import type { SecondaryCoreDocxTable } from "@/lib/curriculum/import/secondary-core-docx-extractor"

export const CURRICULUM_INDICATOR_SCHEMA_VERSION = "curriculum_indicator_v1" as const

export const curriculumIndicatorTypeSchema = z.enum(["during", "terminal"])
export const curriculumIndicatorCodeSchema = z.string().trim().regex(/^[ปม]\.\d+\/\d+$/u)

export const curriculumIndicatorSchema = z.object({
    id: z.string().trim().min(1),
    subjectId: z.enum([
        "thai",
        "mathematics",
        "science_technology",
        "social_religion_culture",
        "health_physical_education",
        "arts",
        "career",
        "foreign_languages",
    ]),
    strandId: z.string().trim().min(1),
    standardId: z.string().trim().min(1),
    standardCode: curriculumStandardCodeSchema,
    indicatorCode: curriculumIndicatorCodeSchema,
    indicatorType: curriculumIndicatorTypeSchema,
    gradeLevel: canonicalGradeLevelSchema,
    textTh: z.string().trim().min(1).optional(),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const curriculumIndicatorCatalogSchema = z.object({
    schemaVersion: z.literal(CURRICULUM_INDICATOR_SCHEMA_VERSION),
    indicators: z.array(curriculumIndicatorSchema),
})

export type CurriculumIndicatorType = z.infer<typeof curriculumIndicatorTypeSchema>
export type CurriculumIndicator = z.infer<typeof curriculumIndicatorSchema>
export type CurriculumIndicatorCatalog = z.infer<typeof curriculumIndicatorCatalogSchema>

export type ParsedIndicatorMatrixRow = {
    standardCode: string
    duringIndicatorCodes: string[]
    terminalIndicatorCodes: string[]
}

export type ParsedUnitPlanIndicatorReference = {
    standardCode: string
    indicatorCode: string
    textTh?: string
}

export type CurriculumIndicatorImportIssue = {
    tableIndex: number
    rowIndex: number
    message: string
    rawStandardCode?: string
}

export type CurriculumIndicatorImportResult = {
    catalog: CurriculumIndicatorCatalog
    issues: CurriculumIndicatorImportIssue[]
}

const STANDARD_CODE_REGEX = /([ก-ฮA-Z]+ ?\d+\.\d+)/u
const INDICATOR_CODE_REGEX = /([ปม]\.\d+\/\d+)/gu

const DOCX_SOURCE_REF: CurriculumSourceRef = {
    provider: "teacher",
    title: "Secondary core curriculum DOCX indicator split",
    usage: "structure_reference",
    note: "Parsed from verified teacher-uploaded DOCX indicator matrix and unit plan cells.",
}

function normalizeWhitespace(value: string) {
    return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeStandardCode(value: string) {
    const normalized = normalizeWhitespace(value)
    const match = normalized.match(STANDARD_CODE_REGEX)
    return match?.[1] ?? null
}

export function extractIndicatorCodes(value: string) {
    const normalized = normalizeWhitespace(value)
    const matches = normalized.match(INDICATOR_CODE_REGEX) ?? []
    return Array.from(new Set(matches.map((match) => match.trim())))
}

export function gradeLevelFromIndicatorCode(indicatorCode: string): CanonicalGradeLevel | null {
    const match = indicatorCode.match(/^([ปม])\.(\d+)\/\d+$/u)
    if (!match) {
        return null
    }

    const levelPrefix = match[1]
    const levelNumber = match[2]
    const gradeId = `${levelPrefix === "ป" ? "p" : "m"}${levelNumber}` as CanonicalGradeLevel
    const parsed = canonicalGradeLevelSchema.safeParse(gradeId)
    return parsed.success ? parsed.data : null
}

function buildCurriculumIndicatorId(standardId: string, indicatorType: CurriculumIndicatorType, indicatorCode: string) {
    return `${standardId}-${indicatorType}-${indicatorCode.replace(/[^\p{L}\p{N}]+/gu, "_").toLowerCase()}`
}

function buildIndicatorRecord(
    standard: CurriculumStandard,
    indicatorCode: string,
    indicatorType: CurriculumIndicatorType,
    textTh?: string
): CurriculumIndicator | null {
    const subjectId = canonicalCoreSubjectIdSchema.safeParse(standard.subjectId)
    if (!subjectId.success) {
        return null
    }
    const gradeLevel = gradeLevelFromIndicatorCode(indicatorCode)
    if (!gradeLevel) {
        return null
    }

    return {
        id: buildCurriculumIndicatorId(standard.id, indicatorType, indicatorCode),
        subjectId: subjectId.data,
        strandId: standard.strandId,
        standardId: standard.id,
        standardCode: standard.code,
        indicatorCode,
        indicatorType,
        gradeLevel,
        textTh: textTh ? normalizeWhitespace(textTh) : undefined,
        sourceRefs: [...standard.sourceRefs, DOCX_SOURCE_REF],
    }
}

function getIndicatorMatrixColumnIndex(headers: string[], expectedHeader: string) {
    return headers.findIndex((header) => normalizeWhitespace(header) === expectedHeader)
}

export function parseIndicatorMatrixTable(table: SecondaryCoreDocxTable): ParsedIndicatorMatrixRow[] {
    if (table.tableType !== "indicator_matrix") {
        return []
    }

    const standardColumnIndex = getIndicatorMatrixColumnIndex(table.headers, "มาตรฐาน")
    const duringColumnIndex = getIndicatorMatrixColumnIndex(table.headers, "ตัวชี้วัดระหว่างทาง")
    const terminalColumnIndex = getIndicatorMatrixColumnIndex(table.headers, "ตัวชี้วัดปลายทาง")

    if (standardColumnIndex < 0 || duringColumnIndex < 0 || terminalColumnIndex < 0) {
        return []
    }

    return table.rows.slice(1).flatMap((row) => {
        const standardCode = normalizeStandardCode(row[standardColumnIndex] ?? "")
        if (!standardCode) {
            return []
        }

        return [
            {
                standardCode,
                duringIndicatorCodes: extractIndicatorCodes(row[duringColumnIndex] ?? ""),
                terminalIndicatorCodes: extractIndicatorCodes(row[terminalColumnIndex] ?? ""),
            },
        ]
    })
}

export function parseUnitPlanIndicatorReferences(value: string): ParsedUnitPlanIndicatorReference[] {
    const lines = value
        .split(/\r?\n+/)
        .map((line) => normalizeWhitespace(line))
        .filter((line) => line.length > 0)

    return lines.flatMap((line) => {
        const standardCode = normalizeStandardCode(line)
        if (!standardCode) {
            return []
        }

        const indicatorCodes = extractIndicatorCodes(line)
        if (indicatorCodes.length === 0) {
            return []
        }

        const trailingText = normalizeWhitespace(
            line
                .replace(STANDARD_CODE_REGEX, " ")
                .replace(INDICATOR_CODE_REGEX, " ")
        )

        return indicatorCodes.map((indicatorCode) => ({
            standardCode,
            indicatorCode,
            textTh: trailingText.length > 0 ? trailingText : undefined,
        }))
    })
}

export function buildCurriculumIndicatorCatalogFromRows(rows: ParsedIndicatorMatrixRow[]): CurriculumIndicatorImportResult {
    const standardsByCode = new Map(CURRICULUM_STRAND_STANDARD_CATALOG.standards.map((standard) => [standard.code, standard]))
    const issues: CurriculumIndicatorImportIssue[] = []
    const indicators = new Map<string, CurriculumIndicator>()

    rows.forEach((row, rowIndex) => {
        const standard = standardsByCode.get(row.standardCode)
        if (!standard) {
            issues.push({
                tableIndex: 0,
                rowIndex: rowIndex + 1,
                message: "Indicator matrix standard code does not map to the canonical standard catalog.",
                rawStandardCode: row.standardCode,
            })
            return
        }

        ;([
            ["during", row.duringIndicatorCodes],
            ["terminal", row.terminalIndicatorCodes],
        ] as const).forEach(([indicatorType, codes]) => {
            codes.forEach((indicatorCode) => {
                const record = buildIndicatorRecord(standard, indicatorCode, indicatorType)
                if (!record) {
                    issues.push({
                        tableIndex: 0,
                        rowIndex: rowIndex + 1,
                        message: "Indicator code could not be mapped to a canonical grade level.",
                        rawStandardCode: row.standardCode,
                    })
                    return
                }

                indicators.set(record.id, record)
            })
        })
    })

    return {
        catalog: {
            schemaVersion: CURRICULUM_INDICATOR_SCHEMA_VERSION,
            indicators: [...indicators.values()],
        },
        issues,
    }
}

export function buildCurriculumIndicatorCatalogFromDocxTables(tables: SecondaryCoreDocxTable[]): CurriculumIndicatorImportResult {
    const rows = tables
        .filter((table) => table.tableType === "indicator_matrix")
        .flatMap((table) => parseIndicatorMatrixTable(table))

    return buildCurriculumIndicatorCatalogFromRows(rows)
}

export function countIndicatorsForStandardByType(
    catalog: CurriculumIndicatorCatalog,
    standardId: string
): Record<CurriculumIndicatorType, number> {
    return {
        during: catalog.indicators.filter(
            (indicator) => indicator.standardId === standardId && indicator.indicatorType === "during"
        ).length,
        terminal: catalog.indicators.filter(
            (indicator) => indicator.standardId === standardId && indicator.indicatorType === "terminal"
        ).length,
    }
}

export function getIndicatorsForStandard(
    catalog: CurriculumIndicatorCatalog,
    standardId: string,
    indicatorType?: CurriculumIndicatorType
) {
    return catalog.indicators.filter(
        (indicator) =>
            indicator.standardId === standardId &&
            (indicatorType === undefined || indicator.indicatorType === indicatorType)
    )
}

export function validateCurriculumIndicatorCatalog(value: unknown) {
    const parsed = curriculumIndicatorCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []

    const standardMap = new Map(CURRICULUM_STRAND_STANDARD_CATALOG.standards.map((standard) => [standard.id, standard]))
    const ids = parsed.data.indicators.map((indicator) => indicator.id)

    if (new Set(ids).size !== ids.length) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Curriculum indicator ids must be unique.",
            path: ["indicators"],
        })
    }

    parsed.data.indicators.forEach((indicator, index) => {
        const standard = standardMap.get(indicator.standardId)
        if (!standard) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Indicator standardId must reference an existing canonical standard.",
                path: ["indicators", index, "standardId"],
            })
            return
        }

        if (indicator.subjectId !== standard.subjectId) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Indicator subjectId must match the owning standard subject.",
                path: ["indicators", index, "subjectId"],
            })
        }

        if (indicator.strandId !== standard.strandId) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Indicator strandId must match the owning standard strand.",
                path: ["indicators", index, "strandId"],
            })
        }

        if (indicator.standardCode !== standard.code) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Indicator standardCode must match the owning standard code.",
                path: ["indicators", index, "standardCode"],
            })
        }
    })

    if (issues.length === 0) {
        return {
            success: true as const,
            data: parsed.data,
        }
    }

    return {
        success: false as const,
        error: new z.ZodError(issues),
    }
}

export function isCurriculumIndicatorCatalog(value: unknown): value is CurriculumIndicatorCatalog {
    return validateCurriculumIndicatorCatalog(value).success
}

export function getCurriculumStandardByCode(standardCode: string) {
    const normalized = normalizeStandardCode(standardCode)
    if (!normalized) {
        return null
    }

    return CURRICULUM_STRAND_STANDARD_CATALOG.standards.find((standard) => standard.code === normalized) ?? null
}

export function getIndicatorSummaryForStandard(
    catalog: CurriculumIndicatorCatalog,
    standardId: string
) {
    const standard = getCurriculumStandardById(standardId)
    const counts = countIndicatorsForStandardByType(catalog, standardId)

    return {
        standardId,
        standardCode: standard?.code ?? null,
        duringCount: counts.during,
        terminalCount: counts.terminal,
        totalCount: counts.during + counts.terminal,
    }
}
