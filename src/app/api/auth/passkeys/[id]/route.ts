import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { hasRecentStrongAuthentication } from "@/lib/auth/reauthentication";
import { logAuditEvent } from "@/lib/security/audit-log";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  if (!hasRecentStrongAuthentication(session)) return createAppErrorResponse("REAUTHENTICATION_REQUIRED", "Recent authentication required", 403);
  const { id } = await params;
  const result = await db.passkeyCredential.deleteMany({ where: { id, userId: session.user.id } });
  if (result.count !== 1) return createAppErrorResponse("NOT_FOUND", "Passkey not found", 404);
  logAuditEvent({ actorUserId: session.user.id, action: "auth.passkey.revoked", category: "auth", status: "success", targetType: "passkey", targetId: id });
  return new NextResponse(null, { status: 204 });
}
