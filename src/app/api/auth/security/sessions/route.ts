import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const now = new Date();
  const rows = await db.userAuthSession.findMany({
    where: { userId, ...activeUserAuthSessionFilter(), absoluteExpiresAt: { gt: now }, idleExpiresAt: { gt: now } },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
    select: { id: true, deviceLabel: true, authMethod: true, mfaLevel: true, createdAt: true, lastSeenAt: true, absoluteExpiresAt: true, idleExpiresAt: true },
  });
  return NextResponse.json({ sessions: rows.map((row) => ({
    id: row.id,
    deviceLabel: row.deviceLabel,
    authMethod: row.authMethod,
    mfaLevel: row.mfaLevel,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: new Date(Math.min(row.absoluteExpiresAt.getTime(), row.idleExpiresAt.getTime())).toISOString(),
    current: row.id === session.user.securitySessionId,
  })) });
}
