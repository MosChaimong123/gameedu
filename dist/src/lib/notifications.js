"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const db_1 = require("@/lib/db");
const format_translation_1 = require("@/lib/format-translation");
/**
 * Sends a notification by saving to the database.
 * When `i18n` is provided, `title`/`message` columns store English fallback text
 * and `titleKey`/`messageKey`/`i18nParams` let the client render in the active UI language.
 */
async function sendNotification({ title, message, i18n, type = "INFO", link, userId, studentId, }) {
    if (!userId && !studentId) {
        console.error("sendNotification: Either userId or studentId must be provided");
        return null;
    }
    let resolvedTitle;
    let resolvedMessage;
    let titleKey = null;
    let messageKey = null;
    let i18nParams;
    if (i18n) {
        titleKey = i18n.titleKey;
        messageKey = i18n.messageKey;
        const params = i18n.params;
        if (params && Object.keys(params).length > 0) {
            i18nParams = params;
        }
        resolvedTitle = (0, format_translation_1.formatTranslation)("en", i18n.titleKey, params);
        resolvedMessage = (0, format_translation_1.formatTranslation)("en", i18n.messageKey, params);
    }
    else {
        if (!(title === null || title === void 0 ? void 0 : title.trim()) || !(message === null || message === void 0 ? void 0 : message.trim())) {
            console.error("sendNotification: title and message are required when i18n is omitted");
            return null;
        }
        resolvedTitle = title;
        resolvedMessage = message;
    }
    try {
        const notification = await db_1.db.notification.create({
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
    }
    catch (error) {
        console.error("Failed to send notification:", error);
        return null;
    }
}
