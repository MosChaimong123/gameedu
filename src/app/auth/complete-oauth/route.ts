import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/env";
import {
    decodeOAuthRoleIntent,
    OAUTH_ROLE_INTENT_COOKIE,
} from "@/lib/auth/oauth-role-intent-cookie";
import { resolveBrowserRedirectOrigin } from "@/lib/resolve-browser-redirect-origin";

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
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/login", origin));
    }

    const secret = resolveAuthSecret();
    const jar = await cookies();
    const raw = jar.get(OAUTH_ROLE_INTENT_COOKIE)?.value ?? null;

    const redirectWithClearedCookie = (path: string) => {
        const res = NextResponse.redirect(new URL(path, origin));
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
        return redirectWithClearedCookie("/login");
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

    if (finalRole === "STUDENT") {
        return redirectWithClearedCookie("/student/home");
    }
    if (finalRole === "ADMIN") {
        return redirectWithClearedCookie("/admin");
    }
    return redirectWithClearedCookie("/dashboard");
}
