import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim();
    const fail = (reason: string) =>
        NextResponse.redirect(new URL(`/login?verifyError=${encodeURIComponent(reason)}`, url.origin));

    if (!token) {
        return fail("missing_token");
    }

    const record = await db.verificationToken.findUnique({
        where: { token },
    });

    if (!record || record.expires < new Date()) {
        return fail("invalid_or_expired");
    }

    const email = record.identifier;
    await db.user.updateMany({
        where: { email, emailVerified: null },
        data: { emailVerified: new Date() },
    });

    await db.verificationToken.deleteMany({ where: { identifier: email } });

    return NextResponse.redirect(new URL("/login?verified=1", url.origin));
}
