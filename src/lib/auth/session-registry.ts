import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { AppRole } from "@/lib/roles";
import { db } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/env";
import { getSessionLifetime, SESSION_TOUCH_INTERVAL_MS } from "@/lib/auth/session-policy";

export function hashSessionIdentifier(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

// MongoDB distinguishes a missing optional field from an explicit null.
// Accept both shapes so sessions created before revokedAt was written remain manageable.
export function activeUserAuthSessionFilter(): Prisma.UserAuthSessionWhereInput {
  return { OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] };
}

function fingerprint(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  const secret = resolveAuthSecret();
  if (!normalized || !secret) return null;
  return createHmac("sha256", secret).update(normalized).digest("hex");
}

export function describeDevice(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown device";
  return `${browser} on ${os}`;
}

export type SessionRequestMetadata = { userAgent?: string | null; clientAddress?: string | null };

export async function registerUserAuthSession(params: {
  userId: string;
  role?: AppRole;
  authMethod: string;
  mfaLevel?: number;
  metadata?: SessionRequestMetadata;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const lifetime = getSessionLifetime(params.role);
  const rawSessionId = randomBytes(32).toString("base64url");
  const userAgentDigest = fingerprint(params.metadata?.userAgent);
  const ipDigest = fingerprint(params.metadata?.clientAddress);
  const previousDevice = userAgentDigest
    ? await db.userAuthSession.findFirst({ where: { userId: params.userId, userAgentDigest }, select: { id: true } })
    : null;
  const record = await db.userAuthSession.create({
    data: {
      userId: params.userId,
      sessionIdHash: hashSessionIdentifier(rawSessionId),
      createdAt: now,
      lastSeenAt: now,
      absoluteExpiresAt: new Date(now.getTime() + lifetime.absoluteMs),
      idleExpiresAt: new Date(now.getTime() + lifetime.idleMs),
      deviceLabel: describeDevice(params.metadata?.userAgent),
      ipDigest,
      userAgentDigest,
      authMethod: params.authMethod,
      mfaLevel: params.mfaLevel === 1 ? 1 : 0,
      revokedAt: null,
      revokedReason: null,
    },
  });
  const user = await db.user.update({ where: { id: params.userId }, data: { lastLoginAt: now }, select: { email: true } });
  return { rawSessionId, record, isNewDevice: !previousDevice, notificationEmail: user.email };
}

export async function validateAndTouchUserAuthSession(params: {
  userId: string;
  rawSessionId: string;
  role?: AppRole;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const record = await db.userAuthSession.findUnique({
    where: { sessionIdHash: hashSessionIdentifier(params.rawSessionId) },
  });
  if (!record || record.userId !== params.userId || record.revokedAt || record.absoluteExpiresAt <= now || record.idleExpiresAt <= now) {
    return null;
  }
  if (now.getTime() - record.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
    const idleMs = getSessionLifetime(params.role).idleMs;
    const idleExpiresAt = new Date(Math.min(record.absoluteExpiresAt.getTime(), now.getTime() + idleMs));
    await db.userAuthSession.updateMany({
      where: { id: record.id, ...activeUserAuthSessionFilter(), absoluteExpiresAt: { gt: now }, idleExpiresAt: { gt: now } },
      data: { lastSeenAt: now, idleExpiresAt },
    });
  }
  return record;
}
