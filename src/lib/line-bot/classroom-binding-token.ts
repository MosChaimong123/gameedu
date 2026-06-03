import { createHmac, timingSafeEqual } from "node:crypto";

const LINE_CLASSROOM_BINDING_TOKEN_MAX_AGE_SEC = 15 * 60;

type ClassroomBindingTokenPayload = {
    classroomId: string;
    exp: number;
};

function timingSafeEqualStr(a: string, b: string) {
    try {
        const left = Buffer.from(a);
        const right = Buffer.from(b);
        if (left.length !== right.length) return false;
        return timingSafeEqual(left, right);
    } catch {
        return false;
    }
}

export function encodeLineClassroomBindingToken(classroomId: string, secret: string) {
    const exp = Math.floor(Date.now() / 1000) + LINE_CLASSROOM_BINDING_TOKEN_MAX_AGE_SEC;
    const payload = Buffer.from(
        JSON.stringify({ classroomId, exp } satisfies ClassroomBindingTokenPayload),
        "utf8"
    ).toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");

    return {
        token: `${payload}.${sig}`,
        expiresAt: new Date(exp * 1000).toISOString(),
    };
}

export function decodeLineClassroomBindingToken(
    token: string,
    secret: string
): ClassroomBindingTokenPayload | null {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    if (!timingSafeEqualStr(sig, expected)) return null;

    try {
        const decoded = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8")
        ) as ClassroomBindingTokenPayload;

        if (
            typeof decoded.classroomId !== "string" ||
            !/^[a-f0-9]{24}$/i.test(decoded.classroomId) ||
            typeof decoded.exp !== "number" ||
            decoded.exp < Math.floor(Date.now() / 1000)
        ) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}
