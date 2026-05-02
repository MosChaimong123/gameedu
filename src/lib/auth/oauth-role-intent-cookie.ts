import { createHmac, timingSafeEqual } from "node:crypto";

export const OAUTH_ROLE_INTENT_COOKIE = "gamedu_oauth_role_intent";

const MAX_AGE_SEC = 600;

export type OAuthRoleIntentRole = "TEACHER" | "STUDENT";

type Payload = { role: OAuthRoleIntentRole; exp: number };

function timingSafeEqualStr(a: string, b: string): boolean {
    try {
        const ba = Buffer.from(a);
        const bb = Buffer.from(b);
        if (ba.length !== bb.length) return false;
        return timingSafeEqual(ba, bb);
    } catch {
        return false;
    }
}

export function encodeOAuthRoleIntent(role: OAuthRoleIntentRole, secret: string): string {
    const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
    const payload = Buffer.from(JSON.stringify({ role, exp } satisfies Payload), "utf8").toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");
    return `${payload}.${sig}`;
}

export function decodeOAuthRoleIntent(value: string, secret: string): Payload | null {
    const [payload, sig] = value.split(".");
    if (!payload || !sig) return null;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    if (!timingSafeEqualStr(sig, expected)) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Payload;
        if (data.role !== "TEACHER" && data.role !== "STUDENT") return null;
        if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
        return data;
    } catch {
        return null;
    }
}
