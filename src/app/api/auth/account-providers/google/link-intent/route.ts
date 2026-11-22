import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyPassword } from "@/lib/auth/password-hash";
import { resolveAuthSecret } from "@/lib/env";
import {
  encodeProviderLinkIntent,
  PROVIDER_LINK_INTENT_COOKIE,
  PROVIDER_LINK_INTENT_MAX_AGE_SECONDS,
} from "@/lib/auth/provider-link-intent";
import { logAuditEvent } from "@/lib/security/audit-log";
import { consumeRateLimitWithStore, createRateLimitResponse, getRequestClientIdentifier } from "@/lib/security/rate-limit";

const bodySchema = z.object({ currentPassword: z.string().min(1).max(128) });

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const limits = await Promise.all([
    consumeRateLimitWithStore({ bucket: "auth:provider-link:user", key: userId, limit: 5, windowMs: 15 * 60_000 }),
    consumeRateLimitWithStore({ bucket: "auth:provider-link:ip", key: getRequestClientIdentifier(req), limit: 15, windowMs: 15 * 60_000 }),
  ]);
  const blocked = limits.find((result) => !result.allowed);
  if (blocked) return createRateLimitResponse(blocked);
  const secret = resolveAuthSecret();
  if (!secret) return createAppErrorResponse("INTERNAL_ERROR", "Auth not configured", 503);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true, accounts: { where: { provider: "google" }, select: { id: true } } },
  });
  if (!user?.password) return createAppErrorResponse("LOGIN_METHOD_REQUIRED", "Password reauthentication is required", 409);
  if (user.accounts.length > 0) return createAppErrorResponse("EMAIL_CHANGE_CONFLICT", "Google is already linked", 409);
  if (!(await verifyPassword(parsed.data.currentPassword, user.password))) {
    return createAppErrorResponse("REAUTHENTICATION_FAILED", "Current password is incorrect", 403);
  }
  const response = NextResponse.json({ ok: true, provider: "google", expiresInSeconds: PROVIDER_LINK_INTENT_MAX_AGE_SECONDS });
  response.cookies.set(PROVIDER_LINK_INTENT_COOKIE, encodeProviderLinkIntent(userId, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PROVIDER_LINK_INTENT_MAX_AGE_SECONDS,
  });
  logAuditEvent({ actorUserId: userId, action: "auth.provider_link.authorized", category: "auth", targetType: "user", targetId: userId, metadata: { provider: "google" } });
  return response;
}
