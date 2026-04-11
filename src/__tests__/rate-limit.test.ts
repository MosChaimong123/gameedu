import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
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
});
