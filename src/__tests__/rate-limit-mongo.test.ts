import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRateLimitCollection } = vi.hoisted(() => ({
  mockGetRateLimitCollection: vi.fn(),
}));

vi.mock("@/lib/ops/mongo-admin", () => ({
  getRateLimitCollection: mockGetRateLimitCollection,
}));

vi.mock("@/lib/env", () => ({
  resolveRateLimitStore: () => "mongo",
}));

vi.mock("@/lib/email-verification", () => ({
  resolveEmailVerificationPepper: () => "test-rate-limit-pepper-with-32-bytes",
}));

import { consumeMongoRateLimit } from "@/lib/security/rate-limit";

describe("Mongo rate limit atomic counter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admits exactly the configured limit under concurrent consumption", async () => {
    let count = 0;
    const findOneAndUpdate = vi.fn(async () => {
      count += 1;
      return {
        _id: "auth:test:key",
        bucket: "auth:test",
        key: "key",
        count,
        resetAt: new Date(61_000),
        expireAt: new Date(61_000),
      };
    });
    mockGetRateLimitCollection.mockResolvedValue({ findOneAndUpdate });

    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        consumeMongoRateLimit({
          bucket: "auth:test",
          key: "key",
          limit: 10,
          windowMs: 60_000,
          now: 1_000,
        })
      )
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(10);
    expect(results.filter((result) => !result.allowed)).toHaveLength(15);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(25);
    expect(findOneAndUpdate.mock.calls[0]?.[1]).toEqual(expect.any(Array));
    expect(findOneAndUpdate.mock.calls[0]?.[2]).toMatchObject({
      upsert: true,
      returnDocument: "after",
    });
  });
});
