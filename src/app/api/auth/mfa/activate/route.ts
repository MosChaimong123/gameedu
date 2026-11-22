import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { activateTotpEnrollment } from "@/lib/auth/mfa";
import { logAuditEvent } from "@/lib/security/audit-log";
import { consumeRateLimitWithStore, createRateLimitResponse, getRequestClientIdentifier } from "@/lib/security/rate-limit";

const schema = z.object({ authenticatorId: z.string().min(1), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const limit = await consumeRateLimitWithStore({ bucket: "auth:mfa:activate", key: `${getRequestClientIdentifier(req)}:${session.user.id}`, limit: 8, windowMs: 15 * 60_000 });
  if (!limit.allowed) return createRateLimitResponse(limit);
  const result = await activateTotpEnrollment(session.user.id, parsed.data.authenticatorId, parsed.data.code);
  if (!result) return createAppErrorResponse("MFA_CODE_INVALID", "Invalid authentication code", 400);
  logAuditEvent({ actorUserId: session.user.id, action: "auth.mfa.enabled", category: "auth", status: "success", targetType: "user", targetId: session.user.id });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
