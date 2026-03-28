"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
const db_1 = require("@/lib/db");
const server_1 = require("next/server");
async function GET(req, { params }) {
    const { code } = await params;
    try {
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });
        if (!student) {
            return new server_1.NextResponse("Student not found", { status: 404 });
        }
        const notifications = await db_1.db.notification.findMany({
            where: {
                studentId: student.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 30,
        });
        return server_1.NextResponse.json(notifications);
    }
    catch (error) {
        console.error("GET /api/student/[code]/notifications error:", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
async function PATCH(req, { params }) {
    const { code } = await params;
    try {
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });
        if (!student) {
            return new server_1.NextResponse("Student not found", { status: 404 });
        }
        const { id, isRead } = await req.json();
        if (id === "all") {
            await db_1.db.notification.updateMany({
                where: { studentId: student.id, isRead: false },
                data: { isRead: true }
            });
            return server_1.NextResponse.json({ success: true });
        }
        const notification = await db_1.db.notification.update({
            where: {
                id,
                studentId: student.id,
            },
            data: {
                isRead,
            },
        });
        return server_1.NextResponse.json(notification);
    }
    catch (error) {
        console.error("PATCH /api/student/[code]/notifications error:", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
