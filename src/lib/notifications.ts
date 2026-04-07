import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatTranslation } from "@/lib/format-translation";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "ASSIGNMENT" | "POINT";

export type NotificationI18n = {
    titleKey: string;
    messageKey: string;
    params?: Record<string, string | number>;
};

interface SendNotificationProps {
    /** Plain text (legacy). Ignored when `i18n` is set. */
    title?: string;
    message?: string;
    i18n?: NotificationI18n;
    type?: NotificationType;
    link?: string;
    userId?: string;
    studentId?: string;
}

/**
 * Sends a notification by saving to the database.
 * When `i18n` is provided, `title`/`message` columns store English fallback text
 * and `titleKey`/`messageKey`/`i18nParams` let the client render in the active UI language.
 */
export async function sendNotification({
    title,
    message,
    i18n,
    type = "INFO",
    link,
    userId,
    studentId,
}: SendNotificationProps) {
    if (!userId && !studentId) {
        console.error("sendNotification: Either userId or studentId must be provided");
        return null;
    }

    let resolvedTitle: string;
    let resolvedMessage: string;
    let titleKey: string | null = null;
    let messageKey: string | null = null;
    let i18nParams: Prisma.InputJsonValue | undefined;

    if (i18n) {
        titleKey = i18n.titleKey;
        messageKey = i18n.messageKey;
        const params = i18n.params;
        if (params && Object.keys(params).length > 0) {
            i18nParams = params as Prisma.InputJsonValue;
        }
        resolvedTitle = formatTranslation("en", i18n.titleKey, params);
        resolvedMessage = formatTranslation("en", i18n.messageKey, params);
    } else {
        if (!title?.trim() || !message?.trim()) {
            console.error("sendNotification: title and message are required when i18n is omitted");
            return null;
        }
        resolvedTitle = title;
        resolvedMessage = message;
    }

    try {
        const notification = await db.notification.create({
            data: {
                title: resolvedTitle,
                message: resolvedMessage,
                titleKey,
                messageKey,
                i18nParams,
                type,
                link,
                user: userId ? { connect: { id: userId } } : undefined,
                student: studentId ? { connect: { id: studentId } } : undefined,
            },
        });

        return notification;
    } catch (error) {
        console.error("Failed to send notification:", error);
        return null;
    }
}
