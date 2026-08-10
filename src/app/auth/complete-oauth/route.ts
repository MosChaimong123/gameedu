import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/env";
import {
    decodeOAuthRoleIntent,
    OAUTH_ROLE_INTENT_COOKIE,
} from "@/lib/auth/oauth-role-intent-cookie";
import {
    appendCallbackUrl,
    getSafeAuthCallbackPath,
    getSafeSameOriginPath,
} from "@/lib/auth/callback-url";
import { getDefaultPostAuthPath, normalizePostAuthRole } from "@/lib/auth/post-auth-destination";
import { resolveBrowserRedirectOrigin } from "@/lib/resolve-browser-redirect-origin";
import { logAuditEvent } from "@/lib/security/audit-log";

function clearIntentCookie(response: NextResponse) {
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(OAUTH_ROLE_INTENT_COOKIE, "", {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

export async function GET(req: Request) {
    const origin = resolveBrowserRedirectOrigin(req.url);
    const callbackPath = getSafeAuthCallbackPath(new URL(req.url).searchParams.get("callbackUrl"), origin);
    const session = await auth();
    const loginPath = appendCallbackUrl("/login", callbackPath);

    if (!session?.user?.id) {
        logAuditEvent({ actorUserId: null, action: "auth.oauth.failed", category: "auth", status: "rejected", reason: "callback_session_missing", targetType: "oauth_callback" });
        return NextResponse.redirect(new URL(loginPath, origin));
    }

    const secret = resolveAuthSecret();
    const jar = await cookies();
    const raw = jar.get(OAUTH_ROLE_INTENT_COOKIE)?.value ?? null;

    const redirectWithClearedCookie = (path: string) => {
        const safePath = getSafeSameOriginPath(path, origin) ?? "/login";
        const res = NextResponse.redirect(new URL(safePath, origin));
        clearIntentCookie(res);
        return res;
    };

    const intent =
        raw && secret ? decodeOAuthRoleIntent(raw, secret) : null;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, emailVerified: true },
    });

    if (!user) {
        logAuditEvent({ actorUserId: session.user.id, action: "auth.oauth.failed", category: "auth", status: "rejected", reason: "account_missing", targetType: "user", targetId: session.user.id });
        return redirectWithClearedCookie(loginPath);
    }

    const updates: { role?: string; emailVerified?: Date } = {};
    if (intent && user.role === "USER") {
        updates.role = intent.role;
    }
    if (!user.emailVerified) {
        updates.emailVerified = new Date();
    }

    if (Object.keys(updates).length > 0) {
        await db.user.update({
            where: { id: session.user.id },
            data: updates,
        });
    }

    const finalRole = updates.role ?? user.role;
    if (callbackPath) {
        return redirectWithClearedCookie(callbackPath);
    }
    return redirectWithClearedCookie(getDefaultPostAuthPath(normalizePostAuthRole(finalRole)));
}
