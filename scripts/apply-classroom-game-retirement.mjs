import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import "./load-env-for-cli.mjs";
import {
  existsFilter,
  preservedCollections,
  readRetirementSnapshot,
  retiredClassroomFields,
  retiredCollections,
  retiredStudentFields,
} from "./classroom-game-retirement-scope.mjs";

const url = process.env.DATABASE_URL;
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const separator = argument.indexOf("=");
    return separator === -1
      ? [argument, true]
      : [argument.slice(0, separator), argument.slice(separator + 1)];
  })
);
const manifestArgument = args.get("--manifest");
const expectedDatabase = args.get("--expected-database");

if (!url || !args.has("--apply") || typeof manifestArgument !== "string" || typeof expectedDatabase !== "string") {
  console.error(
    "Usage: DATABASE_URL=... node scripts/apply-classroom-game-retirement.mjs --apply " +
      "--manifest=<path> --expected-database=<database>"
  );
  process.exit(1);
}

const expectedConfirmation = `REMOVE_CLASSROOM_GAME_DATA_FROM:${expectedDatabase}`;
if (process.env.CLASSROOM_GAME_RETIREMENT_CONFIRM !== expectedConfirmation) {
  console.error(`Refusing cleanup. Set CLASSROOM_GAME_RETIREMENT_CONFIRM=${expectedConfirmation}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(resolve(manifestArgument), "utf8"));
const expected = manifest.candidateCleanup;
if (!expected || !Array.isArray(expected.collections)) {
  throw new Error("Cleanup manifest is missing candidateCleanup counts");
}

function collectionCounts(items) {
  return Object.fromEntries(items.map(({ name, documents }) => [name, documents]));
}

function assertSnapshotMatches(actual) {
  const mismatches = [];
  if (actual.studentsWithAtLeastOneLegacyField !== expected.studentsWithAtLeastOneLegacyField) {
    mismatches.push(
      `Student legacy-field count: expected ${expected.studentsWithAtLeastOneLegacyField}, got ${actual.studentsWithAtLeastOneLegacyField}`
    );
  }
  if (actual.classroomsWithAtLeastOneLegacyField !== expected.classroomsWithAtLeastOneLegacyField) {
    mismatches.push(
      `Classroom legacy-field count: expected ${expected.classroomsWithAtLeastOneLegacyField}, got ${actual.classroomsWithAtLeastOneLegacyField}`
    );
  }

  const actualCollections = collectionCounts(actual.collections);
  for (const { name, documents } of expected.collections) {
    if (actualCollections[name] !== documents) {
      mismatches.push(`${name}: expected ${documents}, got ${actualCollections[name]}`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Cleanup manifest does not match the target:\n- ${mismatches.join("\n- ")}`);
  }
}

const client = new MongoClient(url);

try {
  await client.connect();
  const database = client.db();
  if (database.databaseName !== expectedDatabase) {
    throw new Error(
      `Target database mismatch: expected ${expectedDatabase}, connected to ${database.databaseName}`
    );
  }

  const existingCollections = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name)
  );
  let before;
  let after;

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      before = await readRetirementSnapshot(database, { session });
      assertSnapshotMatches(before);
      const preservedBefore = collectionCounts(before.preservedCollections);

      await database.collection("Student").updateMany(
        existsFilter(retiredStudentFields),
        { $unset: Object.fromEntries(retiredStudentFields.map((field) => [field, ""])) },
        { session }
      );
      await database.collection("Classroom").updateMany(
        existsFilter(retiredClassroomFields),
        { $unset: Object.fromEntries(retiredClassroomFields.map((field) => [field, ""])) },
        { session }
      );
      for (const name of retiredCollections) {
        if (existingCollections.has(name)) {
          await database.collection(name).deleteMany({}, { session });
        }
      }

      after = await readRetirementSnapshot(database, { session });
      const remaining = [
        after.studentsWithAtLeastOneLegacyField,
        after.classroomsWithAtLeastOneLegacyField,
        ...after.collections.map(({ documents }) => documents),
      ];
      if (remaining.some((count) => count !== 0)) {
        throw new Error(`Legacy data remains after cleanup: ${JSON.stringify(after)}`);
      }

      const preservedAfter = collectionCounts(after.preservedCollections);
      for (const name of preservedCollections) {
        if (preservedBefore[name] !== preservedAfter[name]) {
          throw new Error(
            `Preserved collection changed unexpectedly: ${name} ${preservedBefore[name]} -> ${preservedAfter[name]}`
          );
        }
      }
      if (JSON.stringify(before.preservedStudentState) !== JSON.stringify(after.preservedStudentState)) {
        throw new Error(
          `Preserved student state changed unexpectedly: ${JSON.stringify(before.preservedStudentState)} -> ${JSON.stringify(after.preservedStudentState)}`
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const preservedAfter = collectionCounts(after.preservedCollections);

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        database: database.databaseName,
        completedAt: new Date().toISOString(),
        removed: {
          studentsWithLegacyFields: before.studentsWithAtLeastOneLegacyField,
          classroomsWithLegacyFields: before.classroomsWithAtLeastOneLegacyField,
          collections: before.collections,
        },
        preservedCollectionCounts: preservedAfter,
        preservedStudentState: after.preservedStudentState,
      },
      null,
      2
    )
  );
} finally {
  await client.close();
}
