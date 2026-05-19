import { Resend } from "resend";

export type SendVerificationEmailResult = { sent: boolean; verifyUrl: string };
export type SendVerificationCodeEmailResult = { sent: boolean };

function normalizePublicOrigin(raw: string | undefined): string | undefined {
    const value = raw?.trim();
    if (!value) return undefined;
    const noSlash = value.replace(/\/$/, "");
    if (/^https?:\/\//i.test(noSlash)) return noSlash;
    if (noSlash === "localhost" || noSlash.startsWith("localhost:")) {
        return `http://${noSlash}`;
    }
    return `https://${noSlash}`;
}

function resolvePublicOrigin(): string | undefined {
    return normalizePublicOrigin(
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        process.env.AUTH_URL?.trim()
    );
}

export async function sendVerificationEmail(email: string, token: string): Promise<SendVerificationEmailResult> {
    const origin = resolvePublicOrigin();
    if (!origin) {
        throw new Error("MISSING_APP_URL");
    }
    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || "TeachPlayEdu <onboarding@resend.dev>";

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
        subject: "Verify your TeachPlayEdu email",
        html: `<p>Please verify your email to sign in.</p><p><a href="${verifyUrl}">Verify email</a></p><p>If you did not sign up, you can ignore this message.</p>`,
    });

    if (error) {
        console.error("[email] Resend error:", error);
        throw new Error(error.message || "RESEND_SEND_FAILED");
    }

    return { sent: true, verifyUrl };
}

export async function sendVerificationCodeEmail(
    email: string,
    code: string,
    expiresInMinutes: number
): Promise<SendVerificationCodeEmailResult> {
    const origin = resolvePublicOrigin();
    if (!origin) {
        throw new Error("MISSING_APP_URL");
    }

    const verifyPageUrl = `${origin}/verify-email?email=${encodeURIComponent(email)}`;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || "TeachPlayEdu <onboarding@resend.dev>";

    if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("RESEND_API_KEY_REQUIRED");
        }
        console.info(
            "[email] RESEND_API_KEY unset; verification code (dev only):",
            JSON.stringify({ email, code, verifyPageUrl, expiresInMinutes })
        );
        return { sent: false };
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: "Your TeachPlayEdu verification code",
        html: `
          <p>Use this code to verify your TeachPlayEdu email:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
          <p>This code expires in ${expiresInMinutes} minutes.</p>
          <p>You can enter it here: <a href="${verifyPageUrl}">${verifyPageUrl}</a></p>
          <p>If you did not sign up, you can ignore this message.</p>
        `,
    });

    if (error) {
        console.error("[email] Resend error:", error);
        throw new Error(error.message || "RESEND_SEND_FAILED");
    }

    return { sent: true };
}
