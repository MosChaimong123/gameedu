/**
 * Repair the provably-broken Thai sequences in science-additional-upper-secondary.md.
 *
 * The PDF extraction that produced this file emitted some text runs with combining
 * marks placed one base character too far right ("มชี วี ติ" for "มีชีวิต"). Only the
 * subset of that damage which is *impossible* in correct Thai is repaired here:
 *
 *   1. a space directly before a combining mark  — a mark must attach to the
 *      character before it, so the space is always spurious.
 *   2. า / ำ directly followed by a tone mark — tone marks attach to the consonant
 *      that precedes the vowel, never to า/ำ itself, so the pair is always swapped.
 *
 * The wider reordering is deliberately left alone: "ก ล ิ ่" is corrupt in
 * "กลอ้ ง" but correct in "กลิ่น", and the file mixes clean and corrupt runs inside
 * the same line, so a blanket shift would destroy correct words (ได้, ที่, อยู่,
 * กว่า appear ~1,600 times). Those spans need the text re-derived, not patched.
 *
 * Usage:
 *   node scripts/fix_science_additional_thai_text.mjs          # dry run
 *   node scripts/fix_science_additional_thai_text.mjs --write  # apply
 */

import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const TARGET = join(ROOT, "src", "lib", "curriculum", "import", "science-additional-upper-secondary.md")

const COMBINING = "\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E"
const TONE = "\\u0E48-\\u0E4B"

const SPACE_BEFORE_MARK = new RegExp(` +([${COMBINING}])`, "gu")
const VOWEL_THEN_TONE = new RegExp(`([\\u0E32\\u0E33])([${TONE}])`, "gu")

// Words that a careless reordering rule would destroy. Used as a tripwire: their
// counts must not change, proving the repair only touched impossible sequences.
const CONTROL_WORDS = ["ได้", "ที่", "อยู่", "แล้ว", "กว่า", "ต้อง", "เป็น", "และ"]

const before = readFileSync(TARGET, "utf8")

const spaceHits = (before.match(SPACE_BEFORE_MARK) || []).length
const vowelHits = (before.match(VOWEL_THEN_TONE) || []).length

// Repairing one pair can expose another underneath it, so run to a fixed point.
let after = before
let passes = 0
for (; passes < 10; passes += 1) {
    const next = after.replace(SPACE_BEFORE_MARK, "$1").replace(VOWEL_THEN_TONE, "$2$1")
    if (next === after) break
    after = next
}

const countImpossible = (text) =>
    (text.match(SPACE_BEFORE_MARK) || []).length + (text.match(VOWEL_THEN_TONE) || []).length

const controlDrift = CONTROL_WORDS.map((word) => {
    const count = (text) => (text.match(new RegExp(word, "gu")) || []).length
    return { word, before: count(before), after: count(after) }
}).filter((entry) => entry.after < entry.before)

if (controlDrift.length > 0) {
    console.error("ABORT: repair reduced the count of known-good words:", controlDrift)
    process.exit(1)
}

const write = process.argv.includes("--write")
if (write) {
    writeFileSync(TARGET, after, "utf8")
}

console.log(
    JSON.stringify(
        {
            mode: write ? "write" : "dry-run",
            spaceBeforeMarkFixed: spaceHits,
            vowelThenToneFixed: vowelHits,
            impossibleSequencesBefore: countImpossible(before),
            impossibleSequencesAfter: countImpossible(after),
            controlWordsIntact: controlDrift.length === 0,
            passes,
        },
        null,
        2
    )
)
