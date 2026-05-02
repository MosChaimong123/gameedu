import { Resend } from "resend";

export type SendVerificationEmailResult = { sent: boolean; verifyUrl: string };

function resolvePublicOrigin(): string | undefined {
    const u =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        process.env.AUTH_URL?.trim();
    return u?.replace(/\/$/, "");
}

export async function sendVerificationEmail(email: string, token: string): Promise<SendVerificationEmailResult> {
    const origin = resolvePublicOrigin();
    if (!origin) {
        throw new Error("MISSING_APP_URL");
    }
    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || "GameEdu <onboarding@resend.dev>";

    if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("RESEND_API_KEY_REQUIRED");
        }
        console.info("[email] RESEND_API_KEY unset; verification link (dev only):", verifyUrl);
        return { sent: false, verifyUrl };
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: "Verify your GameEdu email",
        html: `<p>Please verify your email to sign in.</p><p><a href="${verifyUrl}">Verify email</a></p><p>If you did not sign up, you can ignore this message.</p>`,
    });

    if (error) {
        console.error("[email] Resend error:", error);
        throw new Error(error.message || "RESEND_SEND_FAILED");
    }

    return { sent: true, verifyUrl };
}
