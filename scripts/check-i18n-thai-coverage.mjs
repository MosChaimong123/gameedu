import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TRANSLATIONS_FILE = path.join(ROOT, "src", "lib", "translations.ts");
const LEGACY_FILE = path.join(ROOT, "src", "lib", "translations-th-legacy.json");
const REPORT_ONLY = process.argv.includes("--report");

/**
 * Keys that already fall back to English when this guard was introduced.
 * The guard fails when the count grows, so new UI cannot ship untranslated
 * while the existing backlog is worked through. Lower this number as keys
 * get translated — never raise it.
 */
const BACKLOG_BASELINE = 177;

/**
 * translations.ts builds the Thai dictionary as
 *   th: { ...englishPack, ...legacyThaiTranslations, ...thaiPack }
 * so any key missing from both Thai sources silently falls back to English.
 * This guard makes that fallback visible instead of shipping English text
 * into a Thai page.
 */

function extractPackKeys(source, packName) {
    const declaration = new RegExp(`(?:export\\s+)?const\\s+${packName}\\s*=\\s*\\{`, "u");
    const match = declaration.exec(source);
    if (!match) {
        throw new Error(`Could not locate "${packName}" in ${TRANSLATIONS_FILE}`);
    }

    const keys = new Set();
    let depth = 0;
    let index = match.index + match[0].length - 1;
    let lineStart = true;
    let pendingKey = "";

    for (; index < source.length; index += 1) {
        const char = source[index];

        if (char === "{") {
            depth += 1;
            lineStart = false;
            continue;
        }

        if (char === "}") {
            depth -= 1;
            if (depth === 0) break;
            lineStart = false;
            continue;
        }

        // Skip over string literals so braces/colons inside copy are ignored.
        if (char === '"' || char === "'" || char === "`") {
            const quote = char;
            index += 1;
            while (index < source.length) {
                if (source[index] === "\\") {
                    index += 1;
                } else if (source[index] === quote) {
                    break;
                }
                index += 1;
            }
            pendingKey = "";
            lineStart = false;
            continue;
        }

        if (char === "\n") {
            lineStart = true;
            pendingKey = "";
            continue;
        }

        if (depth !== 1) continue;

        if (lineStart && /\s/.test(char)) continue;

        if (/[A-Za-z0-9_$]/.test(char)) {
            pendingKey += char;
            lineStart = false;
            continue;
        }

        if (char === ":" && pendingKey) {
            keys.add(pendingKey);
        }

        pendingKey = "";
        lineStart = false;
    }

    if (keys.size === 0) {
        throw new Error(`Extracted zero keys from "${packName}" — parser needs updating`);
    }

    return keys;
}

async function main() {
    const source = await fs.readFile(TRANSLATIONS_FILE, "utf8");
    const legacyRaw = await fs.readFile(LEGACY_FILE, "utf8");

    const englishKeys = extractPackKeys(source, "englishPack");
    const thaiKeys = extractPackKeys(source, "thaiPack");
    const legacyKeys = new Set(Object.keys(JSON.parse(legacyRaw)));

    const missing = [...englishKeys]
        .filter((key) => !thaiKeys.has(key) && !legacyKeys.has(key))
        .sort();

    const orphaned = [...thaiKeys].filter((key) => !englishKeys.has(key)).sort();

    console.log(
        `i18n coverage: ${englishKeys.size} English keys, ` +
            `${thaiKeys.size} in thaiPack, ${legacyKeys.size} in legacy JSON`
    );

    if (orphaned.length > 0) {
        console.log(`\n${orphaned.length} Thai key(s) with no English counterpart:`);
        for (const key of orphaned) console.log(`  ${key}`);
    }

    if (missing.length === 0) {
        console.log("\nEvery English key has a Thai translation.");
        return;
    }

    if (REPORT_ONLY) {
        console.log(`\n${missing.length} key(s) fall back to English on a Thai page:`);
        for (const key of missing) console.log(`  ${key}`);
        return;
    }

    if (missing.length > BACKLOG_BASELINE) {
        const added = missing.length - BACKLOG_BASELINE;
        console.error(
            `\n${missing.length} key(s) fall back to English on a Thai page — ` +
                `${added} more than the ${BACKLOG_BASELINE} allowed by the backlog baseline.`
        );
        console.error("Add Thai copy to thaiPack in src/lib/translations.ts for the new keys.");
        console.error("Run `npm run check:i18n:thai -- --report` to list every untranslated key.");
        process.exitCode = 1;
        return;
    }

    if (missing.length < BACKLOG_BASELINE) {
        console.log(
            `\n${missing.length} key(s) still fall back to English — ` +
                `below the ${BACKLOG_BASELINE} baseline. Lower BACKLOG_BASELINE in this script to ${missing.length}.`
        );
        return;
    }

    console.log(`\n${missing.length} key(s) fall back to English, matching the backlog baseline.`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
