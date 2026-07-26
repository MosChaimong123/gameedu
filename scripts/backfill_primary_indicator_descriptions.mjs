/**
 * Backfill indicator descriptions for the primary (ป.1-6) curriculum rows.
 *
 * The primary DOCX extractor captured indicator codes but left every
 * `description` as null, while keeping the full source text in
 * `standardsIndicatorsRaw`. The secondary extractor already splits that text
 * (see scripts/import_secondary_core_unit_rows.py :: parse_indicator_entries),
 * so this script applies the same idea to the committed primary JSON — no DOCX
 * re-import needed.
 *
 * Codes are never re-derived: descriptions are matched onto the existing
 * indicator entries by their stored `code`, so the parsed structure is
 * preserved exactly.
 *
 * Usage:
 *   node scripts/backfill_primary_indicator_descriptions.mjs            # dry run
 *   node scripts/backfill_primary_indicator_descriptions.mjs --write    # apply
 */

import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const TARGET = join(ROOT, "src", "lib", "curriculum", "import", "primary-core-unit-rows.json")

const DURING_MARKER = "ตัวชี้วัดระหว่างทาง"
const TERMINAL_MARKER = "ตัวชี้วัดปลายทาง"

// "มฐ. ท 3.1 ป.1/5" -> standard "ท 3.1", indicator "ป.1/5".
// Both periods are optional because the source is inconsistent:
//   ทัศนศิลป์ ป.5 หน่วย 3 writes "มฐ ศ 1.1 ป.5/7"  (no period after มฐ)
//   ทัศนศิลป์ ป.6 หน่วย 3 writes "มฐ. ศ. 1.2 ป.6/3" (extra period after the subject letter)
// Matching both keeps each description from swallowing the entry that follows it.
const ENTRY_RE = /มฐ\.?\s*([ก-ฮ])\s*\.?\s*(\d+)\s*\.\s*(\d+)\s*([ปม])\s*\.\s*(\d+)\s*\/\s*(\d+)/gu

function norm(value) {
    return value.replace(/ /gu, " ").replace(/\s+/gu, " ").trim()
}

/** Split the raw cell into the during/terminal segments, mirroring the secondary parser. */
function splitSegments(raw) {
    const text = norm(raw)
    const during = text.indexOf(DURING_MARKER)
    const terminal = text.indexOf(TERMINAL_MARKER)

    if (during !== -1 && terminal !== -1) {
        return during < terminal
            ? { during: text.slice(during + DURING_MARKER.length, terminal), terminal: text.slice(terminal + TERMINAL_MARKER.length) }
            : { during: text.slice(during + DURING_MARKER.length), terminal: text.slice(terminal + TERMINAL_MARKER.length, during) }
    }
    if (during !== -1) return { during: text.slice(during + DURING_MARKER.length), terminal: "" }
    if (terminal !== -1) return { during: "", terminal: text.slice(terminal + TERMINAL_MARKER.length) }
    return { during: text, terminal: "" }
}

/** Each entry's description is the text running up to the next entry (or the end). */
function parseEntries(segment) {
    const text = norm(segment)
    const matches = [...text.matchAll(ENTRY_RE)]
    return matches.map((match, index) => {
        const [, subject, strand, standard, level, grade, indicator] = match
        const start = match.index + match[0].length
        const end = index + 1 < matches.length ? matches[index + 1].index : text.length
        const description = norm(text.slice(start, end)).replace(/^[-–\s]+|[-–\s]+$/gu, "")
        return {
            code: `${subject} ${strand}.${standard} ${level}.${grade}/${indicator}`,
            description: description || null,
        }
    })
}

const payload = JSON.parse(readFileSync(TARGET, "utf8"))

const stats = {
    units: 0,
    indicators: 0,
    alreadyFilled: 0,
    filled: 0,
    unmatched: 0,
    stillNull: 0,
}
const unmatchedSamples = []

for (const course of payload.courses) {
    for (const unit of course.units) {
        stats.units += 1
        const raw = unit.standardsIndicatorsRaw
        const byCode = new Map()
        if (raw && raw.trim()) {
            const { during, terminal } = splitSegments(raw)
            for (const entry of [...parseEntries(during), ...parseEntries(terminal)]) {
                if (entry.description && !byCode.has(entry.code)) {
                    byCode.set(entry.code, entry.description)
                }
            }
        }

        for (const key of ["duringIndicators", "terminalIndicators"]) {
            for (const indicator of unit[key] ?? []) {
                stats.indicators += 1
                if (indicator.description && indicator.description.trim()) {
                    stats.alreadyFilled += 1
                    continue
                }
                const description = byCode.get(norm(indicator.code))
                if (description) {
                    indicator.description = description
                    stats.filled += 1
                } else {
                    stats.stillNull += 1
                    if (unmatchedSamples.length < 12) {
                        unmatchedSamples.push(`${course.titleTh} (${course.gradeLevel}) #${unit.unitNumber} — ${indicator.code}`)
                    }
                }
            }
        }
    }
}

stats.unmatched = stats.stillNull

const write = process.argv.includes("--write")
if (write) {
    writeFileSync(TARGET, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

console.log(JSON.stringify({ mode: write ? "write" : "dry-run", ...stats }, null, 2))
if (unmatchedSamples.length > 0) {
    console.log("\nunmatched samples:")
    for (const sample of unmatchedSamples) console.log(`  ${sample}`)
}
