export const retiredStudentFields = [
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

export const retiredClassroomFields = ["levelConfig", "gamifiedSettings"];
export const retiredCollections = [
  "BattleSession",
  "EconomyTransaction",
  "StudentAchievement",
  "NegamonLiveBattleRewardClaim",
  "ArQuestRewardClaim",
];
export const preservedCollections = [
  "ActiveGame",
  "GameHistory",
  "AssignmentSubmission",
  "PointHistory",
];

export function existsFilter(fields) {
  return { $or: fields.map((field) => ({ [field]: { $exists: true } })) };
}

export async function readRetirementSnapshot(database, { session } = {}) {
  const queryOptions = session ? { session } : {};
  const studentsWithLegacyFields = await database
    .collection("Student")
    .countDocuments(existsFilter(retiredStudentFields), queryOptions);
  const classroomsWithLegacyFields = await database
    .collection("Classroom")
    .countDocuments(existsFilter(retiredClassroomFields), queryOptions);
  const collections = [];
  for (const name of retiredCollections) {
    collections.push({
      name,
      documents: await database.collection(name).countDocuments({}, queryOptions),
    });
  }
  const preserved = [];
  for (const name of preservedCollections) {
    preserved.push({
      name,
      documents: await database.collection(name).countDocuments({}, queryOptions),
    });
  }
  const studentDocuments = await database.collection("Student").countDocuments({}, queryOptions);
  const behaviorPointsResult = await database
    .collection("Student")
    .aggregate(
      [{ $group: { _id: null, total: { $sum: { $ifNull: ["$points", 0] } } } }],
      queryOptions
    )
    .toArray();

  return {
    studentFields: retiredStudentFields,
    studentsWithAtLeastOneLegacyField: studentsWithLegacyFields,
    classroomFields: retiredClassroomFields,
    classroomsWithAtLeastOneLegacyField: classroomsWithLegacyFields,
    collections,
    preservedCollections: preserved,
    preservedStudentState: {
      documents: studentDocuments,
      behaviorPointsTotal: behaviorPointsResult[0]?.total ?? 0,
    },
  };
}
