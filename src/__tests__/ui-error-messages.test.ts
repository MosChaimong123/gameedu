import { describe, expect, it } from "vitest";

import {
  getLocalizedAppErrorMessage,
  getLocalizedAuthErrorMessage,
  getLocalizedErrorMessageFromResponse,
  getLocalizedMessageFromApiErrorBody,
  getThaiErrorMessage,
  getThaiErrorMessageFromAuthResult,
  getThaiErrorMessageFromLegacyText,
  getThaiErrorMessageFromResponse,
  tryLocalizeFetchNetworkFailureMessage,
} from "@/lib/ui-error-messages";

describe("ui error messages", () => {
  it("returns the shared Thai message for known codes", () => {
    expect(getThaiErrorMessage("FORBIDDEN", "fallback")).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    expect(getThaiErrorMessage("RATE_LIMITED", "fallback")).toBe(
      "คุณลองหลายครั้งเกินไป โปรดรอสักครู่แล้วลองใหม่"
    );
  });

  it("prefers contextual overrides when provided", () => {
    expect(
      getThaiErrorMessage("AUTH_REQUIRED", "fallback", {
        AUTH_REQUIRED: "กรุณาเข้าสู่ระบบก่อนเชื่อมบัญชี",
      })
    ).toBe("กรุณาเข้าสู่ระบบก่อนเชื่อมบัญชี");
  });

  it("maps legacy auth and register messages into Thai", () => {
    expect(getThaiErrorMessageFromAuthResult("CredentialsSignin")).toBe(
      "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่"
    );
    expect(getThaiErrorMessageFromLegacyText("Email already exists", "fallback")).toBe(
      "อีเมลนี้ถูกใช้งานแล้ว"
    );
  });

  it("resolves localized app errors via translation keys", () => {
    const t = (key: string) => {
      const dict: Record<string, string> = {
        apiError_FORBIDDEN: "No access",
        syncAccountErrAuthRequired: "Sign in to link",
      };
      return dict[key] ?? key;
    };
    expect(getLocalizedAppErrorMessage("FORBIDDEN", "fb", t)).toBe("No access");
    expect(
      getLocalizedAppErrorMessage("AUTH_REQUIRED", "fb", t, {
        AUTH_REQUIRED: "syncAccountErrAuthRequired",
      })
    ).toBe("Sign in to link");
    expect(getLocalizedAppErrorMessage("NOT_FOUND", "missing", t)).toBe("missing");
  });

  it("maps structured API responses into Thai with overrides", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "INVALID_PAYLOAD",
          message: "Invalid data",
        },
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      }
    );

    await expect(
      getThaiErrorMessageFromResponse(response, "fallback", {
        INVALID_PAYLOAD: "ข้อมูลสมัครสมาชิกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      })
    ).resolves.toBe("ข้อมูลสมัครสมาชิกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
  });

  it("localizes auth errors for English UI", () => {
    const t = (key: string) => {
      const dict: Record<string, string> = {
        loginAuthErrorUnknown: "Sign-in failed (unknown).",
        loginAuthErrorInvalidCredentials: "Bad login.",
        loginAuthErrorRateLimited: "Too many sign-in attempts.",
      };
      return dict[key] ?? key;
    };
    expect(getLocalizedAuthErrorMessage(null, "en", t)).toBe("Sign-in failed (unknown).");
    expect(getLocalizedAuthErrorMessage("rate_limited", "en", t)).toBe("Too many sign-in attempts.");
    expect(getLocalizedAuthErrorMessage("RATE_LIMITED", "en", t)).toBe("Too many sign-in attempts.");
    expect(getLocalizedAuthErrorMessage("CredentialsSignin", "en", t)).toBe(
      "Invalid email or password. Please try again."
    );
    expect(getLocalizedAuthErrorMessage("weird", "en", t)).toBe("Bad login.");
  });

  it("parses fetch/Axios JSON bodies with structured or legacy error fields", () => {
    const t = (key: string) => {
      const dict: Record<string, string> = {
        apiError_NOT_ENOUGH_GOLD: "Need more gold",
        toastGenericError: "Generic",
      };
      return dict[key] ?? key;
    };
    expect(
      getLocalizedMessageFromApiErrorBody(
        { error: { code: "NOT_ENOUGH_GOLD", message: "Not enough gold" } },
        t
      )
    ).toBe("Need more gold");
    expect(getLocalizedMessageFromApiErrorBody({ error: "Not enough gold" }, t)).toBe("Need more gold");
  });

  it("maps structured API responses with localized codes and legacy text", async () => {
    const t = (key: string) => {
      const dict: Record<string, string> = {
        registerErrorFailed: "Signup failed",
        registerErrorInvalidPayload: "Invalid signup payload",
        apiError_RATE_LIMITED: "Slow down",
      };
      return dict[key] ?? key;
    };

    const jsonRes = new Response(
      JSON.stringify({ error: { code: "INVALID_PAYLOAD", message: "x" } }),
      { headers: { "content-type": "application/json" } }
    );
    await expect(
      getLocalizedErrorMessageFromResponse(jsonRes, "registerErrorFailed", t, "en", {
        overrideTranslationKeys: { INVALID_PAYLOAD: "registerErrorInvalidPayload" },
      })
    ).resolves.toBe("Invalid signup payload");

    const legacyRes = new Response(JSON.stringify({ error: "Email already exists" }), {
      headers: { "content-type": "application/json" },
    });
    await expect(
      getLocalizedErrorMessageFromResponse(legacyRes, "registerErrorFailed", t, "en")
    ).resolves.toBe("This email is already in use.");
  });

  it("localizes typical browser fetch network failures", () => {
    const t = (key: string) => (key === "errorNetworkUnavailable" ? "Offline" : key);
    expect(tryLocalizeFetchNetworkFailureMessage("Failed to fetch", t)).toBe("Offline");
    expect(tryLocalizeFetchNetworkFailureMessage("  Load failed ", t)).toBe("Offline");
    expect(tryLocalizeFetchNetworkFailureMessage("TypeError: NetworkError when attempting to fetch", t)).toBe(
      "Offline"
    );
    expect(tryLocalizeFetchNetworkFailureMessage("Not found", t)).toBeNull();
    expect(tryLocalizeFetchNetworkFailureMessage(null, t)).toBeNull();
  });
});
