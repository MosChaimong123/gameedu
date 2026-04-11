import { readFileSync, writeFileSync } from 'fs';

function getTHIRDByte(cp) {
    if (cp >= 0x0080 && cp <= 0x009F) return cp;
    if (cp >= 0x00A0 && cp <= 0x00FF) return cp;
    if (cp >= 0x0E01 && cp <= 0x0E5B) return 0xA0 + (cp - 0x0E00);
    const w = {0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,
               0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,
               0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,
               0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,
               0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,
               0x017E:0x9E,0x0178:0x9F};
    return w[cp] ?? (cp & 0xFF);
}

function decodeMojibake(str) {
    const chars = [...str];
    let result = '';
    let i = 0;
    while (i < chars.length) {
        const cp0 = chars[i]?.codePointAt(0);
        const cp1 = chars[i+1]?.codePointAt(0);
        if (cp0 === 0x0E40 && (cp1 === 0x0E18 || cp1 === 0x0E19) && i+2 < chars.length) {
            const byte2 = cp1 === 0x0E18 ? 0xB8 : 0xB9;
            const byte3 = getTHIRDByte(chars[i+2].codePointAt(0));
            try {
                result += Buffer.from([0xE0, byte2, byte3]).toString('utf8');
            } catch {
                result += chars[i] + chars[i+1] + chars[i+2];
            }
            i += 3;
        } else {
            result += chars[i];
            i++;
        }
    }
    return result;
}

const filePath = 'C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts';
const original = readFileSync(filePath, 'utf8');
const fixed = decodeMojibake(original);

// Count changes
let changed = 0;
let diffCount = 0;
const origLines = original.split('\n');
const fixedLines = fixed.split('\n');

console.log('=== DIFF (first 50 changed lines) ===\n');
for (let i = 0; i < origLines.length && diffCount < 50; i++) {
    if (origLines[i] !== fixedLines[i]) {
        changed++;
        diffCount++;
        console.log(`Line ${i+1}:`);
        console.log(`  BEFORE: ${origLines[i].trim()}`);
        console.log(`  AFTER:  ${fixedLines[i].trim()}`);
        console.log();
    }
}

console.log(`\nTotal changed lines: ${changed}`);

if (original === fixed) {
    console.log('No changes needed — file already clean.');
} else {
    writeFileSync(filePath, fixed, 'utf8');
    console.log('\nFile written successfully.');
}

// Show first few species name samples from fixed content
console.log('\n=== SAMPLE species names after fix ===');
const nameMatches = [...fixed.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g)].slice(0, 20);
for (const m of nameMatches) {
    console.log(`  ${m[1]}`);
}
