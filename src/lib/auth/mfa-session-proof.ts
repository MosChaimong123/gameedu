import { createHmac, timingSafeEqual } from "node:crypto";

const PROOF_TTL_SECONDS = 60;

type MfaSessionProof = {
  v: 1;
  userId: string;
  securitySessionId: string;
  verifiedAt: number;
  exp: number;
};

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeMfaSessionProof(params: {
  userId: string;
  securitySessionId: string;
  verifiedAt: number;
  secret: string;
}) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    userId: params.userId,
    securitySessionId: params.securitySessionId,
    verifiedAt: params.verifiedAt,
    exp: Math.floor(params.verifiedAt / 1_000) + PROOF_TTL_SECONDS,
  } satisfies MfaSessionProof)).toString("base64url");
  return `${payload}.${sign(payload, params.secret)}`;
}

export function decodeMfaSessionProof(value: string, secret: string, now = Date.now()): MfaSessionProof | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(sign(payload, secret), "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MfaSessionProof;
    const nowSeconds = Math.floor(now / 1_000);
    if (
      decoded.v !== 1 ||
      !decoded.userId ||
      !decoded.securitySessionId ||
      !Number.isFinite(decoded.verifiedAt) ||
      decoded.verifiedAt > now + 5_000 ||
      decoded.exp < nowSeconds ||
      decoded.exp > nowSeconds + PROOF_TTL_SECONDS + 5
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
