import { MongoClient } from "mongodb";
import "./load-env-for-cli.mjs";
import {
  preservedCollections,
  readRetirementSnapshot,
  retiredClassroomFields,
  retiredCollections,
  retiredStudentFields,
} from "./classroom-game-retirement-scope.mjs";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is required. Run npm run db:print-target before this report.");
  process.exit(1);
}

const client = new MongoClient(url);

try {
  await client.connect();
  const database = client.db();
  const snapshot = await readRetirementSnapshot(database);

  const report = {
    mode: "dry-run",
    database: database.databaseName,
    generatedAt: new Date().toISOString(),
    preserved: {
      studentFields: ["points (behaviorPoints)", "attendance", "history", "submissions"],
      collections: preservedCollections,
      collectionCounts: snapshot.preservedCollections,
      studentState: snapshot.preservedStudentState,
    },
    candidateCleanup: {
      studentFields: retiredStudentFields,
      studentsWithAtLeastOneLegacyField: snapshot.studentsWithAtLeastOneLegacyField,
      classroomFields: retiredClassroomFields,
      classroomsWithAtLeastOneLegacyField: snapshot.classroomsWithAtLeastOneLegacyField,
      collections: snapshot.collections,
    },
  };

  console.log(JSON.stringify(report, null, 2));
  console.log("Dry-run only: no documents or fields were changed.");
} finally {
  await client.close();
}
