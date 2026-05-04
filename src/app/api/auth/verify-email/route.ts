import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveBrowserRedirectOrigin } from "@/lib/resolve-browser-redirect-origin";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const origin = resolveBrowserRedirectOrigin(req.url);
    const token = url.searchParams.get("token")?.trim();
    const fail = (reason: string) =>
        NextResponse.redirect(new URL(`/login?verifyError=${encodeURIComponent(reason)}`, origin));

    if (!token) {
        return fail("missing_token");
    }

    const record = await db.verificationToken.findUnique({
        where: { token },
    });

    if (!record || record.expires < new Date()) {
        return fail("invalid_or_expired");
    }

    const email = record.identifier.trim();
    const emailVariants = [...new Set([email, email.toLowerCase()])];

    // Do not require `emailVerified: null`. Malformed or oddly-typed values in Mongo
    // can make that filter match zero rows while the user is still blocked at login.
    const updated = await db.user.updateMany({
        where: { email: { in: emailVariants } },
        data: { emailVerified: new Date() },
    });

    if (updated.count === 0) {
        return fail("user_not_found");
    }

    await db.verificationToken.deleteMany({
        where: { identifier: { in: emailVariants } },
    });

    return NextResponse.redirect(new URL("/login?verified=1", origin));
}
