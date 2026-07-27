/**
 * Apply hand-reviewed line replacements to science-additional-upper-secondary.md.
 *
 * The PDF extraction scrambled combining marks in some runs ("มชี วี ติ" for
 * "มีชีวิต"). That damage cannot be undone by rule — the same character shape is
 * correct inside other words — so the affected lines are rewritten by hand and
 * applied here, one batch at a time.
 *
 * The fixes file maps 1-based line number -> replacement line.
 *
 * Usage:
 *   node scripts/apply_science_md_line_fixes.mjs <fixes.json>           # dry run
 *   node scripts/apply_science_md_line_fixes.mjs <fixes.json> --write   # apply
 */

import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const TARGET = join(ROOT, "src", "lib", "curriculum", "import", "science-additional-upper-secondary.md")

const fixesPath = process.argv[2]
if (!fixesPath) {
    console.error("usage: node scripts/apply_science_md_line_fixes.mjs <fixes.json> [--write]")
    process.exit(1)
}

const fixes = JSON.parse(readFileSync(fixesPath, "utf8"))
const lines = readFileSync(TARGET, "utf8").split("\n")

// Fragment signature: 2-3 base consonants ending in combining marks ("มชี", "ขอ้").
// Correct Thai words are almost never shaped this way, so a replacement that still
// matches means the rewrite missed something.
const FRAGMENT = /^[ก-ฮ]{2,3}[ัิ-ฺ็-๎]{1,2}$/u
const fragmentsIn = (line) => line.split(/\s+/).filter((token) => FRAGMENT.test(token))

const report = []
let unresolved = 0

for (const [key, replacement] of Object.entries(fixes)) {
    const index = Number(key) - 1
    const original = lines[index]
    if (original === undefined) {
        console.error(`line ${key} is out of range`)
        process.exit(1)
    }
    const leftover = fragmentsIn(replacement)
    if (leftover.length > 0) unresolved += 1
    report.push({
        line: Number(key),
        fragmentsBefore: fragmentsIn(original).length,
        fragmentsAfter: leftover.length,
        leftover,
    })
    lines[index] = replacement
}

const write = process.argv.includes("--write")
if (write) {
    writeFileSync(TARGET, lines.join("\n"), "utf8")
}

const stillBroken = report.filter((entry) => entry.fragmentsAfter > 0)
console.log(
    JSON.stringify(
        {
            mode: write ? "write" : "dry-run",
            linesReplaced: report.length,
            fragmentsRemoved: report.reduce((sum, entry) => sum + entry.fragmentsBefore - entry.fragmentsAfter, 0),
            linesStillContainingFragments: unresolved,
        },
        null,
        2
    )
)
if (stillBroken.length > 0) {
    console.log("\nstill broken:")
    for (const entry of stillBroken) console.log(`  L${entry.line}: ${entry.leftover.join(" ")}`)
}
