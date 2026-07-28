export function isLineBotConfigured(): boolean {
    return Boolean(getLineChannelSecret() && getLineChannelAccessToken());
}

export function isLineBotEnabled(): boolean {
    if (process.env.LINE_BOT_ENABLED === "false") return false;
    return isLineBotConfigured();
}

/**
 * Temporary containment switch for group commands that mutate classroom or
 * legacy debt data. Keep disabled until Phase 1 teacher verification and
 * classroom authorization are implemented.
 */
export function isLineGroupMutationsEnabled(): boolean {
    return process.env.LINE_GROUP_MUTATIONS_ENABLED === "true";
}

export function isLineWebhookAcceptingEnabled(): boolean {
    return process.env.LINE_WEBHOOK_ACCEPTING_ENABLED !== "false";
}

export function isLineReminderDeliveryEnabled(): boolean {
    return process.env.LINE_REMINDER_DELIVERY_ENABLED !== "false";
}

export function isLineDirectSubmissionsEnabled(): boolean {
    return process.env.LINE_DIRECT_SUBMISSIONS_ENABLED !== "false";
}

export function isLineClassroomInPilot(classroomId: string): boolean {
    const configured = process.env.LINE_PILOT_CLASSROOM_IDS?.split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    return !configured?.length || configured.includes(classroomId);
}

export function getLineChannelSecret(): string | undefined {
    const value = process.env.LINE_CHANNEL_SECRET?.trim();
    return value || undefined;
}

export function getLineChannelAccessToken(): string | undefined {
    const value = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    return value || undefined;
}

export function getLineClassroomBindingSecret(): string | undefined {
    const value = process.env.LINE_CLASSROOM_BINDING_SECRET?.trim();
    return value || undefined;
}

export function getLineReminderCronSecret(): string | undefined {
    const value = process.env.LINE_REMINDER_CRON_SECRET?.trim();
    return value || undefined;
}

export function getLineWebhookInboxSecret(): string | undefined {
    const value = process.env.LINE_WEBHOOK_INBOX_SECRET?.trim();
    return value && value.length >= 32 ? value : undefined;
}

export function getLineBotChatUrl(): string | undefined {
    const value =
        process.env.NEXT_PUBLIC_LINE_BOT_URL?.trim() ||
        process.env.LINE_BOT_CHAT_URL?.trim();
    return isSafePublicUrl(value) ? value : undefined;
}

export function getLineAppUrl(): string | undefined {
    const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
    return isSafePublicUrl(value) ? value : undefined;
}

export type LineConfigurationCheck =
    | "channelSecret"
    | "channelAccessToken"
    | "bindingSecret"
    | "cronSecret"
    | "webhookInboxSecret"
    | "appUrl"
    | "botChatUrl";

export function getLineConfigurationReadiness(): {
    ready: boolean;
    checks: Record<LineConfigurationCheck, "configured" | "missing">;
    missing: LineConfigurationCheck[];
} {
    const values: Record<LineConfigurationCheck, boolean> = {
        channelSecret: Boolean(getLineChannelSecret()),
        channelAccessToken: Boolean(getLineChannelAccessToken()),
        bindingSecret: Boolean(getLineClassroomBindingSecret()),
        cronSecret: Boolean(getLineReminderCronSecret()),
        webhookInboxSecret: Boolean(getLineWebhookInboxSecret()),
        appUrl: Boolean(getLineAppUrl()),
        botChatUrl: Boolean(getLineBotChatUrl()),
    };
    const missing = (Object.keys(values) as LineConfigurationCheck[]).filter(
        (key) => !values[key]
    );
    return {
        ready: missing.length === 0,
        checks: Object.fromEntries(
            (Object.keys(values) as LineConfigurationCheck[]).map((key) => [
                key,
                values[key] ? "configured" : "missing",
            ])
        ) as Record<LineConfigurationCheck, "configured" | "missing">,
        missing,
    };
}

function isSafePublicUrl(value: string | undefined): value is string {
    if (!value) return false;
    try {
        const url = new URL(value);
        const localHost = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
            url.hostname.toLowerCase()
        );
        return (
            (url.protocol === "https:" ||
                (process.env.NODE_ENV !== "production" && url.protocol === "http:")) &&
            !url.username &&
            !url.password &&
            (process.env.NODE_ENV !== "production" || !localHost)
        );
    } catch {
        return false;
    }
}
