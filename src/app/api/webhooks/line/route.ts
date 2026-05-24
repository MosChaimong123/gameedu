import { validateSignature, type WebhookRequestBody } from "@line/bot-sdk";
import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { getLineChannelSecret, isLineBotEnabled } from "@/lib/line-bot/config";
import { handleLineWebhookEvents } from "@/lib/line-bot/handlers";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json({
        service: "line-debt-bot",
        enabled: isLineBotEnabled(),
    });
}

export async function POST(req: Request) {
    if (!isLineBotEnabled()) {
        console.error("[webhooks/line] LINE bot is not configured or disabled");
        return createAppErrorResponse("INTERNAL_ERROR", "LINE bot not configured", 503);
    }

    const channelSecret = getLineChannelSecret();
    if (!channelSecret) {
        return createAppErrorResponse("INTERNAL_ERROR", "LINE bot not configured", 503);
    }

    const signature = req.headers.get("x-line-signature");
    if (!signature) {
        return createAppErrorResponse("INVALID_PAYLOAD", "Missing x-line-signature", 400);
    }

    const rawBody = await req.text();
    if (!validateSignature(rawBody, channelSecret, signature)) {
        console.error("[webhooks/line] Signature verification failed");
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid signature", 400);
    }

    let body: WebhookRequestBody;
    try {
        body = JSON.parse(rawBody) as WebhookRequestBody;
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid JSON body", 400);
    }

    const events = body.events ?? [];
    if (events.length > 0) {
        try {
            await handleLineWebhookEvents(events);
        } catch (error) {
            console.error("[webhooks/line] Handler error", error);
            return createAppErrorResponse("INTERNAL_ERROR", "Handler failed", 500);
        }
    }

    return NextResponse.json({ received: true });
}
