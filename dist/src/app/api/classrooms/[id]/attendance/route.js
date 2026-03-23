"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function POST(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { updates } = body; // Array of { studentId, status }
        if (!updates || !Array.isArray(updates)) {
            return new server_1.NextResponse("Invalid data", { status: 400 });
        }
        // Verify Class Ownership
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const now = new Date();
        // Transactional update using Prisma transaction array
        await db_1.db.$transaction(updates.flatMap((update) => [
            db_1.db.student.update({
                where: { id: update.studentId },
                data: { attendance: update.status }
            }),
            db_1.db.attendanceRecord.create({
                data: {
                    studentId: update.studentId,
                    classId: id,
                    status: update.status,
                    date: now
                }
            })
        ]));
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("[ATTENDANCE_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
