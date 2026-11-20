import { MongoClient } from "mongodb";
import "./load-env-for-cli.mjs";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is required. Run npm run db:print-target before this report.");
  process.exit(1);
}

const retiredStudentFields = [
  "gold",
  "lastGoldAt",
  "lastCheckIn",
  "streak",
  "inventory",
  "battleLoadout",
  "equippedFrame",
  "negamonSkills",
  "negamonSkillLoadout",
  "dailyQuestsClaimed",
  "weeklyQuestsClaimed",
  "challengeQuestsClaimed",
];

const retiredClassroomFields = ["levelConfig", "gamifiedSettings"];
const retiredCollections = [
  "BattleSession",
  "EconomyTransaction",
  "StudentAchievement",
  "NegamonLiveBattleRewardClaim",
  "ArQuestRewardClaim",
];

function existsFilter(fields) {
  return { $or: fields.map((field) => ({ [field]: { $exists: true } })) };
}

const client = new MongoClient(url);

try {
  await client.connect();
  const database = client.db();
  const [studentsWithLegacyFields, classroomsWithLegacyFields, collections] = await Promise.all([
    database.collection("Student").countDocuments(existsFilter(retiredStudentFields)),
    database.collection("Classroom").countDocuments(existsFilter(retiredClassroomFields)),
    Promise.all(
      retiredCollections.map(async (name) => ({
        name,
        documents: await database.collection(name).countDocuments({}),
      }))
    ),
  ]);

  const report = {
    mode: "dry-run",
    database: database.databaseName,
    generatedAt: new Date().toISOString(),
    preserved: {
      studentFields: ["points (behaviorPoints)", "attendance", "history", "submissions"],
      collections: ["ActiveGame", "GameHistory", "AssignmentSubmission", "PointHistory"],
    },
    candidateCleanup: {
      studentFields: retiredStudentFields,
      studentsWithAtLeastOneLegacyField: studentsWithLegacyFields,
      classroomFields: retiredClassroomFields,
      classroomsWithAtLeastOneLegacyField: classroomsWithLegacyFields,
      collections,
    },
  };

  console.log(JSON.stringify(report, null, 2));
  console.log("Dry-run only: no documents or fields were changed.");
} finally {
  await client.close();
}
