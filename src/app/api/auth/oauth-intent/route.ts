import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuthSecret } from "@/lib/env";
import { encodeOAuthRoleIntent, OAUTH_ROLE_INTENT_COOKIE } from "@/lib/auth/oauth-role-intent-cookie";
import { createAppErrorResponse } from "@/lib/api-error";

const bodySchema = z.object({
    role: z.enum(["TEACHER", "STUDENT"]),
});

type RoleIntent = z.infer<typeof bodySchema>["role"];

export async function POST(req: Request) {
    const secret = resolveAuthSecret();
    if (!secret) {
        return createAppErrorResponse("INTERNAL_ERROR", "Auth not configured", 500);
    }

    let role: RoleIntent;
    try {
        const json = await req.json();
        role = bodySchema.parse(json).role;
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid role", 400);
    }

    const value = encodeOAuthRoleIntent(role, secret);
    const res = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(OAUTH_ROLE_INTENT_COOKIE, value, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
    });
    return res;
}
