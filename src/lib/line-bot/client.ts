import { messagingApi } from "@line/bot-sdk";
import { getLineChannelAccessToken } from "@/lib/line-bot/config";

let client: messagingApi.MessagingApiClient | null = null;

export function getLineMessagingClient(): messagingApi.MessagingApiClient {
    const token = getLineChannelAccessToken();
    if (!token) {
        throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
    }

    if (!client) {
        client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
    }

    return client;
}

export async function replyLineText(replyToken: string, text: string): Promise<void> {
    const lineClient = getLineMessagingClient();
    await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text }],
    });
}

export async function pushLineText(to: string, text: string): Promise<void> {
    const lineClient = getLineMessagingClient();
    await lineClient.pushMessage({
        to,
        messages: [{ type: "text", text }],
    });
}
