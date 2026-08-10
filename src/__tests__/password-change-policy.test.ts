import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  PASSWORD_CHANGE_MIN_LENGTH,
  isPasswordChangeAllowed,
  passwordChangeSchema,
} from "@/lib/auth/password-policy";

describe("password change policy", () => {
  it("uses one minimum length contract on server and client", () => {
    expect(PASSWORD_CHANGE_MIN_LENGTH).toBe(12);
    expect(isPasswordChangeAllowed("12345678901")).toBe(false);
    expect(isPasswordChangeAllowed("correct horse battery staple")).toBe(true);
    expect(passwordChangeSchema.safeParse("correct horse battery staple").success).toBe(true);
  });

  it("does not trim or normalize password input", () => {
    expect(passwordChangeSchema.parse(" leading space passphrase")).toBe(" leading space passphrase");
  });

  it("blocks common passwords in the shared policy", () => {
    expect(passwordChangeSchema.safeParse("password1234").success).toBe(false);
  });

  it("checks leaked passwords with k-anonymity and never sends the password", async () => {
    const password = "a private passphrase with enough length";
    const digest = createHash("sha1").update(password).digest("hex").toUpperCase();
    const fetcher = vi.fn(async () => new Response(`${digest.slice(5)}:42\nOTHER:1`, { status: 200 }));
    const { checkPasswordBreach } = await import("@/lib/auth/password-policy-server");
    await expect(checkPasswordBreach(password, { enabled: true, fetcher })).resolves.toBe("compromised");
    const requestedUrl = String(fetcher.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain(`/range/${digest.slice(0, 5)}`);
    expect(requestedUrl).not.toContain(password);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ headers: expect.objectContaining({ "Add-Padding": "true" }) });
  });

  it("supports long passphrases while retaining legacy bcrypt login", async () => {
    const bcrypt = await import("bcryptjs");
    const { hashPassword, verifyPassword } = await import("@/lib/auth/password-hash");
    const longPassword = `prefix-${"x".repeat(90)}-suffix`;
    const stored = await hashPassword(longPassword);
    await expect(verifyPassword(longPassword, stored)).resolves.toBe(true);
    await expect(verifyPassword(`${longPassword}changed`, stored)).resolves.toBe(false);

    const legacy = await bcrypt.hash("old-weak", 4);
    await expect(verifyPassword("old-weak", legacy)).resolves.toBe(true);
  });
});
