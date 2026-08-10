import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const VERIFICATION_FLOW_COOKIE = "gamedu_verification_flow";
export const VERIFICATION_FLOW_MAX_AGE_SECONDS = 30 * 60;

type VerificationFlowPayload = {
  userId: string;
  email: string;
  devCode?: string;
  exp: number;
};

function deriveKey(secret: string): Buffer {
  return createHash("sha256")
    .update(`gamedu:verification-flow:v1:${secret}`, "utf8")
    .digest();
}

export function encodeVerificationFlowHandle(
  identity: { userId: string; email: string; devCode?: string },
  secret: string,
  now = Date.now()
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const payload: VerificationFlowPayload = {
    userId: identity.userId,
    email: identity.email.trim().toLowerCase(),
    ...(identity.devCode ? { devCode: identity.devCode } : {}),
    exp: Math.floor(now / 1000) + VERIFICATION_FLOW_MAX_AGE_SECONDS,
  };
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".");
}

export function decodeVerificationFlowHandle(
  value: string,
  secret: string,
  now = Date.now()
): VerificationFlowPayload | null {
  try {
    const parts = value.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") return null;

    const iv = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    if (iv.length !== 12 || ciphertext.length === 0 || tag.length !== 16) return null;

    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as Partial<VerificationFlowPayload>;

    if (
      typeof payload.userId !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.userId) ||
      typeof payload.email !== "string" ||
      payload.email.length > 254 ||
      !payload.email.includes("@") ||
      (payload.devCode !== undefined && !/^\d{6}$/.test(payload.devCode)) ||
      typeof payload.exp !== "number" ||
      !Number.isInteger(payload.exp) ||
      payload.exp < Math.floor(now / 1000)
    ) {
      return null;
    }

    return payload as VerificationFlowPayload;
  } catch {
    return null;
  }
}
