import fs from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { DOMParser } from "@xmldom/xmldom"

function normalizeWhitespace(value) {
    return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

function paragraphText(paragraphNode) {
    const textNodes = Array.from(paragraphNode.getElementsByTagName("w:t"))
    return normalizeWhitespace(textNodes.map((node) => node.textContent ?? "").join(""))
}

function extractParagraphs(documentXml) {
    const documentNode = new DOMParser().parseFromString(documentXml, "text/xml")
    return Array.from(documentNode.getElementsByTagName("w:p")).map(paragraphText).filter(Boolean)
}

function parseGradeLevel(value) {
    const match = value.match(/ชั้นมัธยมศึกษาปีที่\s*(\d)/)
    if (!match) {
        return null
    }

    return `m${match[1]}`
}

function parseHoursPerYear(value) {
    const match = value.match(/เวลา\s*(\d+)\s*ชั่วโมง\/ปี/)
    if (!match) {
        return null
    }

    const parsed = Number(match[1])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseSubjectGroup(metaLine) {
    const prefix = "รายวิชาพื้นฐานกลุ่มสาระการเรียนรู้"
    if (!metaLine.startsWith(prefix)) {
        return null
    }

    return normalizeWhitespace(metaLine.slice(prefix.length)) || null
}

function buildDescriptionRows(paragraphs) {
    const rows = []
    const seenKeys = new Set()

    for (let index = 0; index < paragraphs.length; index += 1) {
        if (paragraphs[index] !== "คำอธิบายรายวิชา") {
            continue
        }

        const titleTh = paragraphs[index + 1] ?? ""
        const metaLine = paragraphs[index + 2] ?? ""
        const gradeLine = paragraphs[index + 3] ?? ""

        if (!titleTh || !metaLine.startsWith("รายวิชาพื้นฐาน")) {
            continue
        }

        const gradeLevel = parseGradeLevel(gradeLine)
        if (!gradeLevel) {
            continue
        }

        const descriptionParts = []
        let cursor = index + 4
        while (cursor < paragraphs.length && paragraphs[cursor] !== "ตัวชี้วัด") {
            descriptionParts.push(paragraphs[cursor])
            cursor += 1
        }

        const descriptionText = descriptionParts.join("\n\n").trim()
        if (!descriptionText) {
            continue
        }

        const key = `${titleTh}__${gradeLevel}`
        if (seenKeys.has(key)) {
            continue
        }
        seenKeys.add(key)

        rows.push({
            titleTh,
            gradeLevel,
            subjectGroup: parseSubjectGroup(metaLine),
            hoursPerYear: parseHoursPerYear(gradeLine),
            descriptionText,
            sourceParagraphIndex: index,
        })
    }

    return rows
}

async function readDocxDocumentXml(inputPath) {
    const docxBuffer = await fs.readFile(inputPath)
    const zip = await JSZip.loadAsync(docxBuffer)
    const documentXmlFile = zip.file("word/document.xml")
    if (!documentXmlFile) {
        throw new Error("word/document.xml not found in DOCX file.")
    }

    return documentXmlFile.async("string")
}

async function main() {
    const [, , inputArg, outputArg] = process.argv
    if (!inputArg || !outputArg) {
        throw new Error(
            "Usage: node scripts/extract_secondary_core_course_descriptions.mjs <input.docx> <output.json>"
        )
    }

    const inputPath = path.resolve(process.cwd(), inputArg)
    const outputPath = path.resolve(process.cwd(), outputArg)
    const documentXml = await readDocxDocumentXml(inputPath)
    const paragraphs = extractParagraphs(documentXml)
    const rows = buildDescriptionRows(paragraphs)

    const payload = {
        schemaVersion: "secondary_core_course_descriptions_v1",
        sourceFileName: path.basename(inputPath),
        rows,
    }

    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
    process.stdout.write(`Wrote ${rows.length} course descriptions to ${outputPath}\n`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
