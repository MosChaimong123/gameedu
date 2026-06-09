import { Resend } from "resend";

export type SendPasswordResetEmailResult = { sent: boolean };

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

export async function sendPasswordResetEmail(
    email: string,
    code: string,
    expiresInMinutes: number,
    referenceCode: string
): Promise<SendPasswordResetEmailResult> {
    const origin = resolvePublicOrigin();
    if (!origin) {
        throw new Error("MISSING_APP_URL");
    }

    const resetPageUrl = `${origin}/forgot-password/reset?email=${encodeURIComponent(email)}`;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || "TeachPlayEdu <onboarding@resend.dev>";

    if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("RESEND_API_KEY_REQUIRED");
        }
        console.info(
            "[email] RESEND_API_KEY unset; password reset code (dev only):",
            JSON.stringify({ email, code, referenceCode, resetPageUrl, expiresInMinutes })
        );
        return { sent: false };
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: `TeachPlayEdu รีเซ็ตรหัสผ่าน ${referenceCode}`,
        html: `
          <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี TeachPlayEdu</p>
          <p style="font-size:13px;font-weight:600;letter-spacing:1px;margin:0 0 8px;color:#475569;">รหัสอ้างอิง: <strong>${referenceCode}</strong></p>
          <p>ใช้รหัส OTP นี้เพื่อตั้งรหัสผ่านใหม่:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
          <p>รหัสนี้จะหมดอายุใน ${expiresInMinutes} นาที</p>
          <p>คุณสามารถเข้าหน้ารีเซ็ตรหัสผ่านได้ที่: <a href="${resetPageUrl}">${resetPageUrl}</a></p>
          <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน สามารถเพิกเฉยอีเมลนี้ได้</p>
        `,
    });

    if (error) {
        console.error("[email] Resend error:", error);
        throw new Error(error.message || "RESEND_SEND_FAILED");
    }

    return { sent: true };
}
