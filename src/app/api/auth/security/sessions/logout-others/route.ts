import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyRecentOrPassword } from "@/lib/auth/reauthentication";
import { logAuditEvent } from "@/lib/security/audit-log";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";
import { consumeRateLimitWithStore, createRateLimitResponse } from "@/lib/security/rate-limit";

const bodySchema = z.object({ currentPassword: z.string().max(128).optional() });

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const currentId = session?.user?.securitySessionId;
  if (!userId || !currentId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const limit = await consumeRateLimitWithStore({
    bucket: "auth:security:logout-others:user",
    key: userId,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return createRateLimitResponse(limit);
  if (!(await verifyRecentOrPassword(session, parsed.data.currentPassword))) {
    return createAppErrorResponse("REAUTHENTICATION_FAILED", "Recent authentication is required", 403);
  }
  const now = new Date();
  const result = await db.userAuthSession.updateMany({
    where: { userId, id: { not: currentId }, ...activeUserAuthSessionFilter() },
    data: { revokedAt: now, revokedReason: "logout_other_devices" },
  });
  await db.session.deleteMany({ where: { userId } });
  logAuditEvent({ actorUserId: userId, action: "auth.session.others_revoked", category: "auth", targetType: "user", targetId: userId, metadata: { count: result.count } });
  return NextResponse.json({ ok: true, revoked: result.count });
}
