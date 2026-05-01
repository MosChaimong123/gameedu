import { afterEach, describe, expect, it } from "vitest";
import {
  clearCachedEnvForTests,
  getAppEnv,
  resolveAuthSecret,
  resolveAuditLogSink,
  resolveRateLimitStore,
} from "@/lib/env";

describe("env helpers", () => {
  afterEach(() => {
    clearCachedEnvForTests();
  });

  it("defaults operational modes safely outside production", () => {
    const env = {
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv;

    expect(resolveRateLimitStore(env)).toBe("memory");
    expect(resolveAuditLogSink(env)).toBe("console");
  });

  it("parses critical server env values", () => {
    const env = getAppEnv({
      NODE_ENV: "production",
      DATABASE_URL: "mongodb://localhost:27017/gamedu",
      AUTH_SECRET: "secret",
      NEXT_PUBLIC_APP_URL: "https://example.com",
    });

    expect(env.DATABASE_URL).toContain("mongodb://");
    expect(env.AUTH_SECRET).toBe("secret");
    expect(env.NODE_ENV).toBe("production");
  });

  it("accepts NEXTAUTH_SECRET as a fallback for AUTH_SECRET", () => {
    const env = getAppEnv({
      NODE_ENV: "production",
      DATABASE_URL: "mongodb://localhost:27017/gamedu",
      NEXTAUTH_SECRET: "fallback-secret",
      NEXT_PUBLIC_APP_URL: "https://example.com",
    });

    expect(env.AUTH_SECRET).toBe("fallback-secret");
    expect(
      resolveAuthSecret({ NEXTAUTH_SECRET: "fallback-secret" } as unknown as NodeJS.ProcessEnv)
    ).toBe("fallback-secret");
  });
});
