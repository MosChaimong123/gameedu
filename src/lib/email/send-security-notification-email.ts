import { Resend } from "resend";
import { resolveEmailDeliveryReadiness } from "@/lib/email/email-delivery-readiness";

export type SecurityNotificationResult = { sent: boolean; messageId?: string };

async function sendSecurityNotification(
  email: string,
  subject: string,
  html: string
): Promise<SecurityNotificationResult> {
  if (process.env.NODE_ENV === "production") {
    const readiness = resolveEmailDeliveryReadiness(process.env);
    if (readiness.status !== "configured") {
      throw new Error(`EMAIL_DELIVERY_NOT_READY:${readiness.reason ?? readiness.status}`);
    }
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY_REQUIRED");
    return { sent: false };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM?.trim() || "TeachPlayEdu <onboarding@resend.dev>",
    to: email,
    subject,
    html,
  });
  if (error) throw new Error(error.message || "RESEND_SEND_FAILED");
  if (!data?.id) throw new Error("RESEND_MESSAGE_ID_MISSING");
  return { sent: true, messageId: data.id };
}

export async function sendEmailChangeSecurityNotification(
  currentEmail: string
): Promise<SecurityNotificationResult> {
  return sendSecurityNotification(
    currentEmail,
    "TeachPlayEdu email change requested",
    `
      <p>We received a request to change the email address on your TeachPlayEdu account.</p>
      <p>Your current email has not been changed yet. The change only completes after a one-time code sent to the new address is confirmed.</p>
      <p>If this was not you, change your password and contact support immediately.</p>
    `
  );
}

export function sendCredentialChangedNotification(email: string, credential: "password" | "email" | "provider" | "account") {
  return sendSecurityNotification(
    email,
    `TeachPlayEdu ${credential} security change`,
    `<p>Your TeachPlayEdu ${credential} settings were changed.</p><p>If this was not you, contact support immediately.</p>`
  );
}

export function sendNewDeviceLoginNotification(email: string, deviceLabel: string) {
  return sendSecurityNotification(
    email,
    "New sign-in to your TeachPlayEdu account",
    `<p>A new sign-in was detected from <strong>${deviceLabel}</strong>.</p><p>If this was not you, change your password and revoke the session from Account Security.</p>`
  );
}
