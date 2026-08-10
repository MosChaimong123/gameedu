import { createAppError } from "@/lib/api-error";
import { createHmac } from "node:crypto";
import { resolveRateLimitStore } from "@/lib/env";
import { getRateLimitCollection } from "@/lib/ops/mongo-admin";
import { resolveEmailVerificationPepper } from "@/lib/email-verification";
import { isIP } from "node:net";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  resetAt: number;
  count: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function buildRateLimitKey(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(":");
}

/** Stable non-PII identifier for email/account rate-limit buckets. */
export function digestRateLimitIdentifier(value: string) {
  return createHmac("sha256", resolveEmailVerificationPepper())
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function trustedProxyHops(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number.parseInt(env.TRUSTED_PROXY_HOPS ?? "", 10);
  if (Number.isSafeInteger(configured) && configured >= 0 && configured <= 10) {
    return configured;
  }
  return env.NODE_ENV === "production" ? 1 : 0;
}

export function getTrustedClientAddress(
  request: Pick<Request, "headers">,
  env: NodeJS.ProcessEnv = process.env
) {
  const headers = request.headers;
  if (!headers || typeof headers.get !== "function") {
    return "unknown";
  }

  const forwarded = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isIP(value) !== 0);
  const proxyHops = trustedProxyHops(env);
  if (proxyHops > 0 && forwarded.length > 0) {
    // X-Forwarded-For does not include the direct proxy connected to this app.
    // Walk from the right by the number of trusted hops so attacker-prepended
    // values cannot become the client identity.
    const index = Math.max(0, forwarded.length - proxyHops);
    return forwarded[index] ?? "unknown";
  }

  const realIp = headers.get("x-real-ip")?.trim() ?? "";
  return isIP(realIp) !== 0 ? realIp : "unknown";
}

export function getRequestClientIdentifier(
  request: Pick<Request, "headers">,
  env: NodeJS.ProcessEnv = process.env
) {
  const address = getTrustedClientAddress(request, env);
  if (address === "unknown") return address;
  return `client:${digestRateLimitIdentifier(address)}`;
}

function calculateRetryAfterSeconds(params: {
  count: number;
  limit: number;
  resetAt: number;
  now: number;
  windowMs: number;
}) {
  const windowRemaining = Math.max(1, Math.ceil((params.resetAt - params.now) / 1000));
  if (params.count <= params.limit) return windowRemaining;
  const excess = Math.min(params.count - params.limit - 1, 8);
  const baseSeconds = Math.max(1, Math.ceil(params.windowMs / 1000 / Math.max(params.limit, 1)));
  const backoffSeconds = Math.min(3_600, baseSeconds * 2 ** excess);
  return Math.max(windowRemaining, backoffSeconds);
}

function buildRateLimitResult(params: {
  count: number;
  limit: number;
  resetAt: number;
  now: number;
  windowMs: number;
}): RateLimitResult {
  return {
    allowed: params.count <= params.limit,
    remaining: Math.max(params.limit - params.count, 0),
    retryAfterSeconds: calculateRetryAfterSeconds(params),
    limit: params.limit,
    resetAt: params.resetAt,
    count: params.count,
  };
}

export function consumeRateLimit({
  bucket,
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): RateLimitResult {
  const storeKey = `${bucket}:${key}`;
  const existing = rateLimitStore.get(storeKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(storeKey, {
      count: 1,
      resetAt: now + windowMs,
    });

    return buildRateLimitResult({ count: 1, limit, resetAt: now + windowMs, now, windowMs });
  }

  if (existing.count >= limit) {
    existing.count += 1;
    rateLimitStore.set(storeKey, existing);
    return buildRateLimitResult({ count: existing.count, limit, resetAt: existing.resetAt, now, windowMs });
  }

  existing.count += 1;
  rateLimitStore.set(storeKey, existing);

  return buildRateLimitResult({ count: existing.count, limit, resetAt: existing.resetAt, now, windowMs });
}

export function createRateLimitResponse(input: number | RateLimitResult) {
  const retryAfterSeconds = typeof input === "number" ? input : input.retryAfterSeconds;
  const headers: Record<string, string> = {
    "Retry-After": String(retryAfterSeconds),
    "Cache-Control": "no-store",
  };
  if (typeof input !== "number") {
    headers["RateLimit-Limit"] = String(input.limit);
    headers["RateLimit-Remaining"] = String(input.remaining);
    headers["RateLimit-Reset"] = String(Math.ceil(input.resetAt / 1000));
  }
  return Response.json(
    { ...createAppError("RATE_LIMITED", "Too many requests"), retryAfterSeconds },
    {
      status: 429,
      headers,
    }
  );
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Clears stored rate-limit counters for an email after a fresh code is sent. */
export async function resetEmailVerificationAttemptLimits(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const suffix = `:${normalizedEmail}`;
  const exactIds = [
    `auth:verify-email-code:fail:${normalizedEmail}`,
    `auth:verify-email-code:fail:${buildRateLimitKey(normalizedEmail)}`,
  ];

  if (resolveRateLimitStore() === "mongo") {
    const collection = await getRateLimitCollection();
    await collection.deleteMany({
      $or: [{ _id: { $in: exactIds } }, { _id: { $regex: `${escapeRegex(suffix)}$` } }],
    });
    return;
  }

  for (const storeKey of rateLimitStore.keys()) {
    if (exactIds.includes(storeKey) || storeKey.endsWith(suffix)) {
      rateLimitStore.delete(storeKey);
    }
  }
}

export async function consumeMongoRateLimit({
  bucket,
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): Promise<RateLimitResult> {
  const collection = await getRateLimitCollection();
  const storeKey = `${bucket}:${key}`;
  const nowDate = new Date(now);
  const nextResetAt = new Date(now + windowMs);
  const expiredExpression = {
    $lte: [{ $ifNull: ["$resetAt", new Date(0)] }, nowDate],
  };
  const resetAtExpression = { $cond: [expiredExpression, nextResetAt, "$resetAt"] };
  const document = await collection.findOneAndUpdate(
    { _id: storeKey },
    [
      {
        $set: {
          bucket: { $literal: bucket },
          key: { $literal: key },
          count: {
            $cond: [expiredExpression, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }],
          },
          resetAt: resetAtExpression,
          expireAt: resetAtExpression,
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  );
  if (!document) throw new Error("RATE_LIMIT_ATOMIC_UPDATE_FAILED");

  return buildRateLimitResult({
    count: document.count,
    limit,
    resetAt: document.resetAt.getTime(),
    now,
    windowMs,
  });
}

export async function consumeRateLimitWithStore(options: RateLimitOptions) {
  if (resolveRateLimitStore() === "mongo") {
    return consumeMongoRateLimit(options);
  }

  return consumeRateLimit(options);
}
