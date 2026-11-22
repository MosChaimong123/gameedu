import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const STUDENT_ACCESS_COOKIE = "student_access";
export const STUDENT_ACCESS_ROUTE_KEY = "access";
export const STUDENT_ACCESS_TTL_SECONDS = 12 * 60 * 60;
export const STUDENT_ACCESS_SCOPES = ["student:read", "student:write"] as const;

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getStudentAccessCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: STUDENT_ACCESS_TTL_SECONDS,
  };
}

export async function createStudentAccessSession(input: {
  studentId: string;
  classId: string;
  codeVersion: number;
  clientDigest?: string;
  userAgentDigest?: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + STUDENT_ACCESS_TTL_SECONDS * 1_000);

  await db.studentAccessSession.create({
    data: {
      studentId: input.studentId,
      classId: input.classId,
      codeVersion: input.codeVersion,
      tokenHash: hashToken(token),
      expiresAt,
      clientDigest: input.clientDigest,
      userAgentDigest: input.userAgentDigest,
    },
  });

  return { token, expiresAt };
}

export async function getStudentAccessSession(requiredScope: string = "student:read") {
  const token = (await cookies()).get(STUDENT_ACCESS_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await db.studentAccessSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      student: {
        select: {
          id: true,
          classId: true,
          loginCode: true,
          loginCodeVersion: true,
          userId: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.student.classId !== session.classId ||
    session.student.loginCodeVersion !== session.codeVersion ||
    !session.scopes.includes(requiredScope)
  ) {
    return null;
  }

  if (now.getTime() - session.lastUsedAt.getTime() >= 5 * 60_000) {
    void db.studentAccessSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { lastUsedAt: now },
    });
  }

  return session;
}

export async function resolveStudentAccessCode(
  routeKey: string,
  requiredScope: string = "student:read"
) {
  if (routeKey.toLowerCase() !== STUDENT_ACCESS_ROUTE_KEY) return null;
  const session = await getStudentAccessSession(requiredScope);
  return session?.student.loginCode ?? null;
}

export async function getStudentAccessCodeForClass(
  routeCredential: string | null | undefined,
  classId: string,
  requiredScope: string = "student:read"
) {
  if (routeCredential?.trim().toLowerCase() !== STUDENT_ACCESS_ROUTE_KEY) return null;
  const session = await getStudentAccessSession(requiredScope);
  if (!session || session.classId !== classId) return null;
  return session.student.loginCode;
}

export async function revokeCurrentStudentAccessSession(reason = "student_logout") {
  const token = (await cookies()).get(STUDENT_ACCESS_COOKIE)?.value;
  if (!token) return;
  await db.studentAccessSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}
