"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req, { params }) {
    const { id, studentId } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        // Verify the classroom belongs to this teacher
        const classroom = await db_1.db.classroom.findUnique({
            where: { id, teacherId: session.user.id }
        });
        if (!classroom) {
            return new server_1.NextResponse("Not Found", { status: 404 });
        }
        // Fetch the student and their full history
        const student = await db_1.db.student.findUnique({
            where: { id: studentId, classId: id },
            select: {
                id: true,
                name: true,
                nickname: true,
                points: true,
                avatar: true,
                history: {
                    orderBy: { timestamp: "desc" },
                    take: 200,
                }
            }
        });
        if (!student) {
            return new server_1.NextResponse("Student Not Found", { status: 404 });
        }
        return server_1.NextResponse.json(student);
    }
    catch (error) {
        console.error("[STUDENT_HISTORY_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
