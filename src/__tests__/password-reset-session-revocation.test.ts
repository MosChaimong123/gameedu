import { describe, expect, it } from "vitest";
import { isAuthVersionCurrent, normalizeAuthVersion } from "@/lib/auth/session-version";

describe("password reset session revocation", () => {
  it("rejects every JWT generation issued before a password reset", () => {
    expect(isAuthVersionCurrent({ tokenVersion: 3, currentVersion: 4, isNewSignIn: false })).toBe(false);
  });

  it("keeps sessions issued after reset when generations match", () => {
    expect(isAuthVersionCurrent({ tokenVersion: 4, currentVersion: 4, isNewSignIn: false })).toBe(true);
  });

  it("adopts the database generation during a new sign-in", () => {
    expect(isAuthVersionCurrent({ tokenVersion: 0, currentVersion: 4, isNewSignIn: true })).toBe(true);
  });

  it("normalizes pre-migration missing versions to zero", () => {
    expect(normalizeAuthVersion(undefined)).toBe(0);
    expect(isAuthVersionCurrent({ tokenVersion: undefined, currentVersion: null, isNewSignIn: false })).toBe(true);
  });
});
