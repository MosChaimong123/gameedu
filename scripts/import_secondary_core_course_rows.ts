import fs from "node:fs/promises"
import path from "node:path"
import mammoth from "mammoth"
import { extractSecondaryCoreDocxTablesFromHtml } from "../src/lib/curriculum/import/secondary-core-docx-extractor"
import {
    buildSecondaryCoreCourseSourceRowsFromTables,
    SECONDARY_CORE_COURSE_SOURCE_SCHEMA_VERSION,
} from "../src/lib/curriculum/import/secondary-core-course-source"

async function main() {
    const docxPath = process.argv[2]
    const outputPath =
        process.argv[3] ?? path.resolve("src/lib/curriculum/import/secondary-core-course-rows.json")

    if (!docxPath) {
        throw new Error("Usage: node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/import_secondary_core_course_rows.ts <docxPath> [outputPath]")
    }

    const resolvedDocxPath = path.resolve(docxPath)
    const htmlResult = await mammoth.convertToHtml({ path: resolvedDocxPath })
    const tables = extractSecondaryCoreDocxTablesFromHtml(htmlResult.value)
    const rows = buildSecondaryCoreCourseSourceRowsFromTables(tables)

    const payload = {
        schemaVersion: SECONDARY_CORE_COURSE_SOURCE_SCHEMA_VERSION,
        sourceFileName: path.basename(resolvedDocxPath),
        rows,
    }

    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
    console.log(
        JSON.stringify(
            {
                outputPath,
                rowCount: rows.length,
                resolvedRowCount: rows.filter((row) => row.subjectId !== null).length,
                missingDescriptionCount: rows.filter((row) => row.issueCodes.includes("missing_course_description")).length,
            },
            null,
            2
        )
    )
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
