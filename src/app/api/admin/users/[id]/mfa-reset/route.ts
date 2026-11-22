import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { mutateUserSecurityState } from "@/lib/auth/security-mutations";
import { hasRecentAuthentication } from "@/lib/auth/session-policy";
import { logAuditEvent } from "@/lib/security/audit-log";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  if (session.user.role !== "ADMIN" || session.user.mfaLevel !== 1 || !hasRecentAuthentication(session.user.mfaVerifiedAt)) {
    logAuditEvent({ actorUserId: session.user.id, action: "auth.admin_mfa_reset.denied", category: "auth", status: "rejected", reason: "strong_recent_auth_required", targetType: "user" });
    return createAppErrorResponse("FORBIDDEN", "Recent MFA verification required", 403);
  }
  const { id } = await params;
  await mutateUserSecurityState(id, {
    mfaEnabledAt: null,
    mfaAuthenticators: { deleteMany: {} },
    mfaRecoveryCodes: { deleteMany: {} },
  });
  logAuditEvent({ actorUserId: session.user.id, action: "auth.admin_mfa_reset.succeeded", category: "auth", status: "success", targetType: "user", targetId: id });
  return NextResponse.json({ success: true });
}
