import { describe, expect, it } from "vitest";

import { getNextAuthResultCode } from "@/lib/auth/next-auth-result";

describe("getNextAuthResultCode", () => {
  it("reads the code query param from a next-auth callback result URL", () => {
    expect(
      getNextAuthResultCode(
        "http://localhost:3000/login?error=CredentialsSignin&code=rate_limited",
        "http://localhost:3000"
      )
    ).toBe("rate_limited");
  });

  it("supports relative result URLs", () => {
    expect(
      getNextAuthResultCode(
        "/login?error=CredentialsSignin&code=email_not_verified",
        "http://localhost:3000"
      )
    ).toBe("email_not_verified");
  });

  it("returns null when no code is present or the URL is invalid", () => {
    expect(getNextAuthResultCode("/login?error=CredentialsSignin", "http://localhost:3000")).toBeNull();
    expect(getNextAuthResultCode("::not-a-url::", "http://localhost:3000")).toBeNull();
    expect(getNextAuthResultCode(null, "http://localhost:3000")).toBeNull();
  });
});
