export function parseNotificationI18nParams(raw: unknown): Record<string, string | number> | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return undefined;
    }
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === "string" || typeof v === "number") {
            out[k] = v;
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

type NotificationRow = {
    title: string;
    message: string;
    titleKey?: string | null;
    messageKey?: string | null;
    i18nParams?: unknown;
};

export function resolveNotificationCopy(
    row: NotificationRow,
    t: (key: string, params?: Record<string, string | number>) => string
): { title: string; message: string } {
    if (row.titleKey && row.messageKey) {
        const params = parseNotificationI18nParams(row.i18nParams);
        return {
            title: t(row.titleKey, params),
            message: t(row.messageKey, params),
        };
    }
    return { title: row.title, message: row.message };
}
