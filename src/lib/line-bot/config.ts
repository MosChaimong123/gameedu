export function isLineBotConfigured(): boolean {
    return Boolean(getLineChannelSecret() && getLineChannelAccessToken());
}

export function isLineBotEnabled(): boolean {
    if (process.env.LINE_BOT_ENABLED === "false") return false;
    return isLineBotConfigured();
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
    const value = process.env.LINE_REMINDER_CRON_SECRET?.trim() || process.env.ADMIN_SECRET?.trim();
    return value || undefined;
}
