import { NextResponse } from "next/server";
import { Resend, type WebhookEventPayload } from "resend";
import { createAppErrorResponse } from "@/lib/api-error";
import { processResendPasswordResetEvent } from "@/lib/email/password-reset-delivery";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[webhooks/resend] Missing RESEND_WEBHOOK_SECRET");
    return createAppErrorResponse("INTERNAL_ERROR", "Webhook not configured", 503);
  }

  const id = req.headers.get("svix-id")?.trim();
  const timestamp = req.headers.get("svix-timestamp")?.trim();
  const signature = req.headers.get("svix-signature")?.trim();
  if (!id || !timestamp || !signature) {
    return createAppErrorResponse("INVALID_PAYLOAD", "Missing webhook signature", 400);
  }

  const payload = await req.text();
  let event: WebhookEventPayload;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY?.trim() || "re_webhook_verification");
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid webhook signature", 400);
  }

  try {
    const result = await processResendPasswordResetEvent(event, id);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[webhooks/resend] Handler failed", error);
    return createAppErrorResponse("INTERNAL_ERROR", "Handler failed", 500);
  }
}
