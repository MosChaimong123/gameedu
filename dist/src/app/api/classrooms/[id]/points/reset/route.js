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
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        // 1. Get all student IDs in this classroom
        const students = await db_1.db.student.findMany({
            where: { classId: id },
            select: { id: true }
        });
        const studentIds = students.map((s) => s.id);
        if (studentIds.length === 0) {
            return server_1.NextResponse.json({
                success: true,
                studentsResetCount: 0,
                activitiesDeletedCount: 0
            });
        }
        // 2. Perform the transaction with direct IDs
        const [deletedActivities, deletedSubmissions, resetStudents] = await db_1.db.$transaction([
            db_1.db.pointHistory.deleteMany({
                where: {
                    studentId: { in: studentIds }
                }
            }),
            db_1.db.assignmentSubmission.deleteMany({
                where: {
                    studentId: { in: studentIds }
                }
            }),
            db_1.db.student.updateMany({
                where: { classId: id },
                data: { points: 0 }
            })
        ]);
        return server_1.NextResponse.json({
            success: true,
            studentsResetCount: resetStudents.count,
            activitiesDeletedCount: deletedActivities.count
        });
    }
    catch (error) {
        console.error("[POINTS_RESET_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
