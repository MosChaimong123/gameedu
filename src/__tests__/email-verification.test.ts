import { describe, expect, it } from "vitest";
import {
  collectLegacyVerificationCodeHashes,
  emailVerificationCodeMatches,
  hashEmailVerificationCode,
  hashEmailVerificationCodeForStorage,
} from "@/lib/email-verification";

describe("emailVerificationCodeMatches", () => {
  it("accepts v3 HMAC hashes for new codes", async () => {
    const stored = hashEmailVerificationCodeForStorage("535244");
    expect(stored.startsWith("v3:")).toBe(true);
    await expect(
      emailVerificationCodeMatches(stored, {
        userId: "user-abc",
        email: "doodle29744@gmail.com",
        code: "535244",
      })
    ).resolves.toBe(true);
  });

  it("accepts legacy sha256 hashes keyed by userId or email", async () => {
    const legacyUserHash = hashEmailVerificationCode("user-abc", "535244");
    const legacyEmailHash = hashEmailVerificationCode("doodle29744@gmail.com", "535244");

    await expect(
      emailVerificationCodeMatches(legacyUserHash, {
        userId: "user-abc",
        email: "doodle29744@gmail.com",
        code: "535244",
      })
    ).resolves.toBe(true);

    await expect(
      emailVerificationCodeMatches(legacyEmailHash, {
        userId: "user-abc",
        email: "doodle29744@gmail.com",
        code: "535244",
      })
    ).resolves.toBe(true);
  });

  it("rejects wrong codes", async () => {
    const stored = hashEmailVerificationCodeForStorage("535244");
    await expect(
      emailVerificationCodeMatches(stored, {
        userId: "user-abc",
        email: "doodle29744@gmail.com",
        code: "000000",
      })
    ).resolves.toBe(false);
  });

  it("builds legacy hash candidates across identity keys", () => {
    const hashes = collectLegacyVerificationCodeHashes({
      userId: "user-abc",
      email: "doodle29744@gmail.com",
      code: "535244",
    });
    expect(hashes.size).toBeGreaterThanOrEqual(2);
  });
});
