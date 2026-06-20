import { messagingApi } from "@line/bot-sdk";
import { getLineChannelAccessToken } from "@/lib/line-bot/config";

let client: messagingApi.MessagingApiClient | null = null;
let cachedToken: string | null = null;

export function getLineMessagingClient(): messagingApi.MessagingApiClient {
    const token = getLineChannelAccessToken();
    if (!token) {
        throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
    }

    if (!client || token !== cachedToken) {
        client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
        cachedToken = token;
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

export async function pushLineFlex(
    to: string,
    altText: string,
    contents: messagingApi.FlexContainer
): Promise<void> {
    const lineClient = getLineMessagingClient();
    await lineClient.pushMessage({
        to,
        messages: [{ type: "flex", altText, contents }],
    });
}

/**
 * Fetch a member's LINE display name within a group. Returns null on any failure
 * (token missing, user left the group, API error) so callers can fall back to the
 * student's system name.
 */
export async function getLineGroupMemberDisplayName(
    groupId: string,
    userId: string
): Promise<string | null> {
    try {
        const lineClient = getLineMessagingClient();
        const profile = await lineClient.getGroupMemberProfile(groupId, userId);
        return profile.displayName?.trim() || null;
    } catch {
        return null;
    }
}
