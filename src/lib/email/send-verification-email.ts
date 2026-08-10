import { Resend } from "resend";
import { resolveEmailDeliveryReadiness } from "@/lib/email/email-delivery-readiness";

export type SendVerificationCodeEmailResult = { sent: boolean; messageId?: string };
export type VerificationEmailContext = "signup" | "email-change";

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
    const configuredOrigin = normalizePublicOrigin(
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        process.env.AUTH_URL?.trim()
    );
    if (configuredOrigin) return configuredOrigin;

    if (process.env.NODE_ENV !== "production") {
        return "http://localhost:3000";
    }

    return undefined;
}

export async function sendVerificationCodeEmail(
    email: string,
    code: string,
    expiresInMinutes: number,
    referenceCode: string,
    context: VerificationEmailContext = "signup"
): Promise<SendVerificationCodeEmailResult> {
    if (process.env.NODE_ENV === "production") {
        const readiness = resolveEmailDeliveryReadiness(process.env);
        if (readiness.status !== "configured") {
            throw new Error(`EMAIL_DELIVERY_NOT_READY:${readiness.reason ?? readiness.status}`);
        }
    }
    const origin = resolvePublicOrigin();
    if (!origin) {
        throw new Error("MISSING_APP_URL");
    }

    const verifyPageUrl = context === "email-change"
        ? `${origin}/dashboard/settings/security`
        : `${origin}/verify-email?email=${encodeURIComponent(email)}`;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || "TeachPlayEdu <onboarding@resend.dev>";

    if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("RESEND_API_KEY_REQUIRED");
        }
        console.info(
            "[email] RESEND_API_KEY unset; verification code (dev only):",
            JSON.stringify({ email, code, referenceCode, verifyPageUrl, expiresInMinutes })
        );
        return { sent: false };
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
        from,
        to: email,
        subject: context === "email-change"
            ? `Confirm your new TeachPlayEdu email ${referenceCode}`
            : `TeachPlayEdu verification ${referenceCode}`,
        html: `
          <p>${context === "email-change"
              ? "Use this code to confirm your new TeachPlayEdu email address:"
              : "Use this code to verify your TeachPlayEdu email:"}</p>
          <p style="font-size:13px;font-weight:600;letter-spacing:1px;margin:0 0 8px;color:#475569;">Reference: <strong>${referenceCode}</strong></p>
          <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
          <p>This code expires in ${expiresInMinutes} minutes. Use reference <strong>${referenceCode}</strong> on the verify page to confirm you have the latest email.</p>
          <p>You can enter it here: <a href="${verifyPageUrl}">${verifyPageUrl}</a></p>
          <p>${context === "email-change"
              ? "If you did not request this email change, do not share this code. Your current email remains unchanged."
              : "If you did not sign up, you can ignore this message."}</p>
        `,
    });

    if (error) {
        console.error("[email] Resend error:", error);
        throw new Error(error.message || "RESEND_SEND_FAILED");
    }
    if (!data?.id) throw new Error("RESEND_MESSAGE_ID_MISSING");

    return { sent: true, messageId: data.id };
}
