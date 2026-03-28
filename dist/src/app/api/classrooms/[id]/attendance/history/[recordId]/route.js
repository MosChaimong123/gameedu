"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function PATCH(req, { params }) {
    const { id, recordId } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { status } = body;
        if (!status) {
            return new server_1.NextResponse("Status is required", { status: 400 });
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
        const updatedRecord = await db_1.db.attendanceRecord.update({
            where: {
                id: recordId,
                classId: id
            },
            data: {
                status
            }
        });
        // Also update the current status in Student model if the record is for today?
        // Let's just update the student's status as a bonus if they edit it, 
        // but maybe safer to keep them decoupled or update both. We will just update the Student too.
        await db_1.db.student.update({
            where: { id: updatedRecord.studentId },
            data: { attendance: status }
        });
        return server_1.NextResponse.json(updatedRecord);
    }
    catch (error) {
        console.error("[ATTENDANCE_RECORD_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
