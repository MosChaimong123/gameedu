import { createAppError } from "@/lib/api-error";
import { resolveRateLimitStore } from "@/lib/env";
import { getRateLimitCollection } from "@/lib/ops/mongo-admin";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function buildRateLimitKey(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(":");
}

export function getRequestClientIdentifier(request: Pick<Request, "headers">) {
  const headers = request.headers;
  if (!headers || typeof headers.get !== "function") {
    return "unknown";
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
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

    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      ),
    };
  }

  existing.count += 1;
  rateLimitStore.set(storeKey, existing);

  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function createRateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    createAppError("RATE_LIMITED", "Too many requests"),
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}

async function consumeMongoRateLimit({
  bucket,
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): Promise<RateLimitResult> {
  const collection = await getRateLimitCollection();
  const storeKey = `${bucket}:${key}`;
  const existing = await collection.findOne({ _id: storeKey });

  if (!existing || existing.resetAt.getTime() <= now) {
    const resetAt = new Date(now + windowMs);
    await collection.updateOne(
      { _id: storeKey },
      {
        $set: {
          bucket,
          key,
          count: 1,
          resetAt,
          expireAt: resetAt,
        },
      },
      { upsert: true }
    );

    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt.getTime() - now) / 1000)
      ),
    };
  }

  const nextCount = existing.count + 1;
  await collection.updateOne(
    { _id: storeKey },
    {
      $set: {
        count: nextCount,
        expireAt: existing.resetAt,
      },
    }
  );

  return {
    allowed: true,
    remaining: Math.max(limit - nextCount, 0),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((existing.resetAt.getTime() - now) / 1000)
    ),
  };
}

export async function consumeRateLimitWithStore(options: RateLimitOptions) {
  if (resolveRateLimitStore() === "mongo") {
    return consumeMongoRateLimit(options);
  }

  return consumeRateLimit(options);
}
