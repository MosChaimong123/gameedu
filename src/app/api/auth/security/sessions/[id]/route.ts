import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) return createAppErrorResponse("NOT_FOUND", "Session not found", 404);
  const now = new Date();
  const revoked = await db.userAuthSession.updateMany({
    where: { id, userId, ...activeUserAuthSessionFilter() },
    data: { revokedAt: now, revokedReason: "user_revoked" },
  });
  if (revoked.count !== 1) return createAppErrorResponse("NOT_FOUND", "Session not found", 404);
  const current = id === session.user.securitySessionId;
  logAuditEvent({ actorUserId: userId, action: "auth.session.revoked", category: "auth", targetType: "auth_session", targetId: id, metadata: { current } });
  return NextResponse.json({ ok: true, current });
}
