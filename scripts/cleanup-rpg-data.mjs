/**
 * Run ONCE before `npx prisma db push` (or after, to tidy documents) when removing RPG collections.
 * Loads `.env` from the project root (same as Prisma) so DATABASE_URL is available.
 *
 * Usage: `npm run db:cleanup-rpg` or `node scripts/cleanup-rpg-data.mjs`
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL missing. Add it to .env in the project root (same connection string as Prisma)."
  );
  process.exit(1);
}

const client = new MongoClient(url);
const dryRun = process.argv.includes("--dry-run");
const legacyCollections = ["StudentItem", "Material", "StudentBattle", "Item"];
const legacyStudentFields = {
  gameStats: "",
  questProgress: "",
  jobClass: "",
  jobTier: "",
  advanceClass: "",
  jobSkills: "",
  jobSelectedAt: "",
  stamina: "",
  maxStamina: "",
  mana: "",
  lastStaminaRefill: "",
  lastSyncTime: "",
};

try {
  await client.connect();
  const db = client.db();

  console.log(
    dryRun
      ? "Running RPG cleanup in dry-run mode. No data will be modified."
      : "Running RPG cleanup. Legacy RPG data will be removed."
  );

  for (const coll of legacyCollections) {
    const count = await db.collection(coll).countDocuments({});
    if (dryRun) {
      console.log(`${coll}: would delete ${count} document(s)`);
      continue;
    }

    const result = await db.collection(coll).deleteMany({});
    console.log(`${coll}: deleted ${result.deletedCount} document(s)`);
  }

  const studentLegacyFilter = {
    $or: Object.keys(legacyStudentFields).map((field) => ({ [field]: { $exists: true } })),
  };
  const studentLegacyCount = await db
    .collection("Student")
    .countDocuments(studentLegacyFilter);

  if (dryRun) {
    console.log(
      `Student: would unset legacy RPG fields on ${studentLegacyCount} document(s)`
    );
  } else if (studentLegacyCount > 0) {
    await db.collection("Student").updateMany(
      studentLegacyFilter,
      {
        $unset: legacyStudentFields,
      }
    );
    console.log(
      `Student: unset legacy RPG fields on ${studentLegacyCount} document(s)`
    );
  } else {
    console.log("Student: no legacy RPG fields found");
  }
} finally {
  await client.close();
}
