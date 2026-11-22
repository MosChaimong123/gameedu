import "./load-env-for-cli.mjs";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../src/lib/db.ts";

const baseUrl = process.env.CIVILIZATION_SMOKE_BASE_URL ?? "http://127.0.0.1:3001";
const pilotClassIds = (process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const pilotClassId = pilotClassIds[0];

const parsedBaseUrl = new URL(baseUrl);
const isLocal = ["localhost", "127.0.0.1"].includes(parsedBaseUrl.hostname);
if (!isLocal && process.env.CIVILIZATION_SMOKE_ALLOW_REMOTE !== "true") {
  throw new Error(`Refusing remote smoke target ${parsedBaseUrl.origin}`);
}
if (!pilotClassId) {
  throw new Error("CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS must contain at least one classroom ID");
}

const expiresAt = new Date(Date.now() + 15 * 60_000);
const createdSessionIds = [];

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function createSmokeSession(student) {
  const token = randomBytes(32).toString("base64url");
  const session = await db.studentAccessSession.create({
    data: {
      studentId: student.id,
      classId: student.classId,
      codeVersion: student.loginCodeVersion,
      tokenHash: hashToken(token),
      expiresAt,
      clientDigest: "civilization-pilot-smoke",
    },
    select: { id: true },
  });
  createdSessionIds.push(session.id);
  return token;
}

async function readState(token) {
  return fetch(new URL("/api/student/access/civilization/state", parsedBaseUrl), {
    headers: { cookie: `student_access=${token}` },
    redirect: "manual",
  });
}

try {
  const [pilotStudent, controlStudent] = await Promise.all([
    db.student.findFirst({
      where: { classId: pilotClassId },
      select: { id: true, classId: true, loginCodeVersion: true },
    }),
    db.student.findFirst({
      where: { classId: { notIn: pilotClassIds } },
      select: { id: true, classId: true, loginCodeVersion: true },
    }),
  ]);

  if (!pilotStudent) throw new Error(`No enabled student found in pilot classroom ${pilotClassId}`);
  if (!controlStudent) throw new Error("No enabled student found outside the pilot classroom");

  const pilotResponse = await readState(await createSmokeSession(pilotStudent));
  const controlResponse = await readState(await createSmokeSession(controlStudent));

  console.log(JSON.stringify({
    target: parsedBaseUrl.origin,
    pilotClassId,
    pilotStatus: pilotResponse.status,
    controlClassId: controlStudent.classId,
    controlStatus: controlResponse.status,
  }, null, 2));

  if (pilotResponse.status !== 200 || controlResponse.status !== 404) {
    throw new Error(`Unexpected pilot gating result: ${pilotResponse.status}/${controlResponse.status}`);
  }
} finally {
  if (createdSessionIds.length > 0) {
    await db.studentAccessSession.deleteMany({ where: { id: { in: createdSessionIds } } });
  }
  await db.$disconnect();
}
