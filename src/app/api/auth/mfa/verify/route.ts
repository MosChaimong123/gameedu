import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, unstable_update } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { consumeRecoveryCode, verifyTotpChallenge } from "@/lib/auth/mfa";
import { verifyPasskeyAuthentication } from "@/lib/auth/passkeys";
import { consumeRateLimitWithStore, createRateLimitResponse, getRequestClientIdentifier } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";
import { resolveAuthSecret } from "@/lib/env";
import { encodeMfaSessionProof } from "@/lib/auth/mfa-session-proof";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

const schema = z.union([
  z.object({ method: z.literal("totp"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ method: z.literal("recovery"), code: z.string().min(8).max(32) }),
  z.object({ method: z.literal("passkey"), response: z.record(z.string(), z.unknown()) }),
]);

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const limit = await consumeRateLimitWithStore({ bucket: "auth:mfa:challenge", key: `${getRequestClientIdentifier(req)}:${userId}`, limit: 10, windowMs: 15 * 60_000 });
  if (!limit.allowed) {
    logAuditEvent({ actorUserId: userId, action: "auth.mfa.challenge_rate_limited", category: "auth", status: "rejected", reason: "rate_limited", targetType: "user", targetId: userId });
    return createRateLimitResponse(limit);
  }
  const valid = parsed.data.method === "totp"
    ? await verifyTotpChallenge(userId, parsed.data.code)
    : parsed.data.method === "recovery"
      ? await consumeRecoveryCode(userId, parsed.data.code)
      : Boolean(await verifyPasskeyAuthentication(parsed.data.response as never, userId));
  if (!valid) {
    logAuditEvent({ actorUserId: userId, action: "auth.mfa.challenge_failed", category: "auth", status: "rejected", reason: "invalid_challenge", targetType: "user", targetId: userId, metadata: { method: parsed.data.method } });
    return createAppErrorResponse("MFA_CODE_INVALID", "Invalid authentication code", 401);
  }
  const verifiedAt = Date.now();
  const securitySessionId = session.user.securitySessionId;
  const secret = resolveAuthSecret();
  if (!securitySessionId || !secret) {
    return createAppErrorResponse("AUTH_REQUIRED", "Authentication session is no longer active", 401);
  }
  const updated = await db.userAuthSession.updateMany({
    where: { id: securitySessionId, userId, ...activeUserAuthSessionFilter() },
    data: { mfaLevel: 1 },
  });
  if (updated.count !== 1) {
    return createAppErrorResponse("AUTH_REQUIRED", "Authentication session is no longer active", 401);
  }
  const mfaProof = encodeMfaSessionProof({ userId, securitySessionId, verifiedAt, secret });
  await unstable_update({ user: { mfaProof } } as never);
  logAuditEvent({ actorUserId: userId, action: "auth.mfa.challenge_succeeded", category: "auth", status: "success", targetType: "user", targetId: userId, metadata: { method: parsed.data.method } });
  return NextResponse.json({ verified: true });
}
