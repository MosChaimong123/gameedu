/**
 * Backfill User.emailVerified for legacy password accounts created before email verification.
 * Sets emailVerified = now() where password is set, email exists, and emailVerified is null.
 *
 * Usage:
 *   node scripts/backfill-email-verified.mjs
 *   node scripts/backfill-email-verified.mjs --dry-run
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath, { overwrite } = { overwrite: false }) {
    if (!existsSync(filePath)) return;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (overwrite || process.env[key] === undefined) process.env[key] = val;
    }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"), { overwrite: true });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            password: { not: null },
            email: { not: null },
            emailVerified: null,
        },
        select: { id: true, email: true },
    });

    console.log(`Found ${users.length} user(s) with password and unverified email.`);

    if (dryRun) {
        for (const u of users) {
            console.log(`  [dry-run] would update ${u.email}`);
        }
        return;
    }

    const now = new Date();
    const result = await prisma.user.updateMany({
        where: {
            password: { not: null },
            email: { not: null },
            emailVerified: null,
        },
        data: { emailVerified: now },
    });

    console.log(`Updated ${result.count} user(s).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
