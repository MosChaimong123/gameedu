import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import {
    AUTH_REQUIRED_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";

const notificationSelect = {
    id: true,
    title: true,
    message: true,
    titleKey: true,
    messageKey: true,
    i18nParams: true,
    type: true,
    isRead: true,
    link: true,
    createdAt: true,
} as const;

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    try {
        const notifications = await db.notification.findMany({
            where: {
                userId: session.user.id,
            },
            select: notificationSelect,
            orderBy: {
                createdAt: "desc",
            },
            take: 50,
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("GET /api/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    try {
        const { id, isRead } = await req.json() as {
            id?: unknown;
            isRead?: unknown;
        };

        if (id === "all") {
             await db.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        if (typeof id !== "string" || id.trim().length === 0 || typeof isRead !== "boolean") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Invalid payload", 400);
        }

        const updated = await db.notification.updateMany({
            where: {
                id,
                userId: session.user.id,
            },
            data: {
                isRead,
            },
        });

        if (updated.count === 0) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const notification = await db.notification.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
            select: notificationSelect,
        });

        if (!notification) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        return NextResponse.json(notification);
    } catch (error) {
        console.error("PATCH /api/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id || id.trim().length === 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing id", 400);
        }

        const deleted = await db.notification.deleteMany({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (deleted.count === 0) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
