"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const db_1 = require("@/lib/db");
/**
 * Sends a notification by saving to the database.
 * Real-time delivery is handled by the client-side socket-provider
 * or a dedicated polling mechanism if needed, but here we provide
 * the DB persistence.
 */
async function sendNotification({ title, message, type = "INFO", link, userId, studentId }) {
    if (!userId && !studentId) {
        console.error("sendNotification: Either userId or studentId must be provided");
        return null;
    }
    try {
        const notification = await db_1.db.notification.create({
            data: {
                title,
                message,
                type,
                link,
                user: userId ? { connect: { id: userId } } : undefined,
                student: studentId ? { connect: { id: studentId } } : undefined,
            }
        });
        // TO DO: If we want real-time signaling from server-side to socket server,
        // we can use a fetch to a local trigger endpoint or a shared Redis/PubSub.
        // For now, persistence is the primary goal.
        return notification;
    }
    catch (error) {
        console.error("Failed to send notification:", error);
        return null;
    }
}
