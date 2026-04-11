"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRateLimitKey = buildRateLimitKey;
exports.getRequestClientIdentifier = getRequestClientIdentifier;
exports.consumeRateLimit = consumeRateLimit;
exports.createRateLimitResponse = createRateLimitResponse;
exports.resetRateLimitStore = resetRateLimitStore;
exports.consumeRateLimitWithStore = consumeRateLimitWithStore;
const api_error_1 = require("@/lib/api-error");
const env_1 = require("@/lib/env");
const mongo_admin_1 = require("@/lib/ops/mongo-admin");
const rateLimitStore = new Map();
function buildRateLimitKey(...parts) {
    return parts
        .map((part) => (part !== null && part !== void 0 ? part : "").trim())
        .filter(Boolean)
        .join(":");
}
function getRequestClientIdentifier(request) {
    var _a, _b;
    const headers = request.headers;
    if (!headers || typeof headers.get !== "function") {
        return "unknown";
    }
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        return ((_a = forwardedFor.split(",")[0]) === null || _a === void 0 ? void 0 : _a.trim()) || "unknown";
    }
    return ((_b = headers.get("x-real-ip")) === null || _b === void 0 ? void 0 : _b.trim()) || "unknown";
}
function consumeRateLimit({ bucket, key, limit, windowMs, now = Date.now(), }) {
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
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
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
function createRateLimitResponse(retryAfterSeconds) {
    return Response.json((0, api_error_1.createAppError)("RATE_LIMITED", "Too many requests"), {
        status: 429,
        headers: {
            "Retry-After": String(retryAfterSeconds),
        },
    });
}
function resetRateLimitStore() {
    rateLimitStore.clear();
}
async function consumeMongoRateLimit({ bucket, key, limit, windowMs, now = Date.now(), }) {
    const collection = await (0, mongo_admin_1.getRateLimitCollection)();
    const storeKey = `${bucket}:${key}`;
    const existing = await collection.findOne({ _id: storeKey });
    if (!existing || existing.resetAt.getTime() <= now) {
        const resetAt = new Date(now + windowMs);
        await collection.updateOne({ _id: storeKey }, {
            $set: {
                bucket,
                key,
                count: 1,
                resetAt,
                expireAt: resetAt,
            },
        }, { upsert: true });
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
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt.getTime() - now) / 1000)),
        };
    }
    const nextCount = existing.count + 1;
    await collection.updateOne({ _id: storeKey }, {
        $set: {
            count: nextCount,
            expireAt: existing.resetAt,
        },
    });
    return {
        allowed: true,
        remaining: Math.max(limit - nextCount, 0),
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt.getTime() - now) / 1000)),
    };
}
async function consumeRateLimitWithStore(options) {
    if ((0, env_1.resolveRateLimitStore)() === "mongo") {
        return consumeMongoRateLimit(options);
    }
    return consumeRateLimit(options);
}
