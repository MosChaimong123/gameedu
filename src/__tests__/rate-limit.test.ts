import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  createRateLimitResponse,
  digestRateLimitIdentifier,
  getRequestClientIdentifier,
  getTrustedClientAddress,
  resetRateLimitStore,
} from "@/lib/security/rate-limit";

describe("rate limit utility", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("blocks requests after the configured limit within a window", () => {
    const first = consumeRateLimit({
      bucket: "test",
      key: "client-1",
      limit: 2,
      windowMs: 60_000,
      now: 1_000,
    });
    const second = consumeRateLimit({
      bucket: "test",
      key: "client-1",
      limit: 2,
      windowMs: 60_000,
      now: 2_000,
    });
    const third = consumeRateLimit({
      bucket: "test",
      key: "client-1",
      limit: 2,
      windowMs: 60_000,
      now: 3_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("builds stable non-PII digests for sensitive identifiers", () => {
    const digest = digestRateLimitIdentifier(" Alice@Example.com ");
    expect(digest).toBe(digestRateLimitIdentifier("alice@example.com"));
    expect(digest).not.toContain("alice@example.com");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("selects the client by configured trusted proxy hops instead of trusting the first value", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "198.51.100.99, 203.0.113.7" },
    });

    expect(getTrustedClientAddress(request, { TRUSTED_PROXY_HOPS: "1" } as NodeJS.ProcessEnv)).toBe(
      "203.0.113.7"
    );
    const identifier = getRequestClientIdentifier(request, {
      TRUSTED_PROXY_HOPS: "1",
    } as NodeJS.ProcessEnv);
    expect(identifier).toMatch(/^client:[a-f0-9]{64}$/);
    expect(identifier).not.toContain("198.51.100.99");
  });

  it("applies bounded exponential backoff to repeated blocked attempts", () => {
    consumeRateLimit({ bucket: "backoff", key: "client", limit: 1, windowMs: 1_000, now: 0 });
    const firstBlocked = consumeRateLimit({
      bucket: "backoff",
      key: "client",
      limit: 1,
      windowMs: 1_000,
      now: 999,
    });
    const repeatedBlocked = consumeRateLimit({
      bucket: "backoff",
      key: "client",
      limit: 1,
      windowMs: 1_000,
      now: 999,
    });

    expect(firstBlocked.allowed).toBe(false);
    expect(repeatedBlocked.retryAfterSeconds).toBeGreaterThan(firstBlocked.retryAfterSeconds);
  });

  it("returns structured rate-limit and retry headers", async () => {
    const result = consumeRateLimit({ bucket: "headers", key: "client", limit: 1, windowMs: 60_000, now: 0 });
    const response = createRateLimitResponse({ ...result, allowed: false, remaining: 0 });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("RateLimit-Limit")).toBe("1");
    expect(response.headers.get("RateLimit-Remaining")).toBe("0");
    expect(await response.json()).toMatchObject({ retryAfterSeconds: 60 });
  });
});
