import { describe, expect, it } from "vitest";
import { describeDevice, hashSessionIdentifier } from "@/lib/auth/session-registry";
import { getSessionLifetime, hasRecentAuthentication } from "@/lib/auth/session-policy";

describe("security session policy", () => {
  it("uses shorter administrator absolute and idle lifetimes", () => {
    expect(getSessionLifetime("ADMIN").absoluteMs).toBeLessThan(getSessionLifetime("TEACHER").absoluteMs);
    expect(getSessionLifetime("ADMIN").idleMs).toBeLessThan(getSessionLifetime("TEACHER").idleMs);
  });

  it("enforces a bounded recent-authentication window", () => {
    expect(hasRecentAuthentication(1_000, 1_000 + 9 * 60_000)).toBe(true);
    expect(hasRecentAuthentication(1_000, 1_000 + 11 * 60_000)).toBe(false);
  });

  it("hashes session identifiers and reduces user agents to a safe label", () => {
    expect(hashSessionIdentifier("secret-session-id")).not.toContain("secret-session-id");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0")).toBe("Chrome on Windows");
  });
});
