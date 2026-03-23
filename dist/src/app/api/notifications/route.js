"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const server_1 = require("next/server");
async function GET() {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const notifications = await db_1.db.notification.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 50,
        });
        return server_1.NextResponse.json(notifications);
    }
    catch (error) {
        console.error("GET /api/notifications error:", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
async function PATCH(req) {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const { id, isRead } = await req.json();
        if (id === "all") {
            await db_1.db.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true }
            });
            return server_1.NextResponse.json({ success: true });
        }
        const notification = await db_1.db.notification.update({
            where: {
                id,
                userId: session.user.id,
            },
            data: {
                isRead,
            },
        });
        return server_1.NextResponse.json(notification);
    }
    catch (error) {
        console.error("PATCH /api/notifications error:", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
async function DELETE(req) {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return new server_1.NextResponse("Missing id", { status: 400 });
        }
        await db_1.db.notification.delete({
            where: {
                id,
                userId: session.user.id,
            },
        });
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("DELETE /api/notifications error:", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
