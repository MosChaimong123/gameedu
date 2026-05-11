import { afterEach, describe, expect, it, vi } from "vitest";
import { expandPublicAppOriginVariants, resolveSocketIoCorsOrigin } from "@/lib/socket-io-cors";

describe("expandPublicAppOriginVariants", () => {
  it("adds www for apex HTTPS host", () => {
    expect(expandPublicAppOriginVariants("https://teachplayedu.com")).toEqual([
      "https://teachplayedu.com",
      "https://www.teachplayedu.com",
    ]);
  });

  it("adds apex for www HTTPS host", () => {
    expect(expandPublicAppOriginVariants("https://www.teachplayedu.com")).toEqual([
      "https://www.teachplayedu.com",
      "https://teachplayedu.com",
    ]);
  });

  it("does not invent www for app subdomain", () => {
    expect(expandPublicAppOriginVariants("https://app.teachplayedu.com")).toEqual([
      "https://app.teachplayedu.com",
    ]);
  });

  it("leaves localhost alone", () => {
    expect(expandPublicAppOriginVariants("http://localhost:3000")).toEqual(["http://localhost:3000"]);
  });
});

describe("resolveSocketIoCorsOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production: expands NEXTAUTH_URL apex to include www", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SOCKET_IO_CORS_ORIGIN", "");
    vi.stubEnv("NEXTAUTH_URL", "https://teachplayedu.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const r = resolveSocketIoCorsOrigin();
    expect(r).toEqual(["https://teachplayedu.com", "https://www.teachplayedu.com"]);
  });

  it("production: single SOCKET_IO_CORS_ORIGIN expands", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SOCKET_IO_CORS_ORIGIN", "https://www.example.org");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const r = resolveSocketIoCorsOrigin();
    expect(r).toEqual(["https://www.example.org", "https://example.org"]);
  });

  it("dev: reflects origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SOCKET_IO_CORS_ORIGIN", "");
    vi.stubEnv("NEXTAUTH_URL", "https://ignored.example");

    expect(resolveSocketIoCorsOrigin()).toBe(true);
  });
});
