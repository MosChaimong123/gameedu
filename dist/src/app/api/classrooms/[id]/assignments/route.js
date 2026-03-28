"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const notifications_1 = require("@/lib/notifications");
async function POST(req, { params }) {
    const session = await (0, auth_1.auth)();
    const resolvedParams = await params;
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { name, description, maxScore, type, checklists, passScore, deadline, quizSetId } = body;
        if (!name) {
            return new server_1.NextResponse("Name is required", { status: 400 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: { id: resolvedParams.id },
            include: {
                assignments: { select: { id: true } },
                students: { select: { id: true, loginCode: true } }
            }
        });
        if (!classroom || classroom.teacherId !== session.user.id) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        let quizData = body.quizData || null;
        // If a Question Set is linked, we snapshot its questions for stability
        if (quizSetId && type === "quiz") {
            const questionSet = await db_1.db.questionSet.findUnique({
                where: { id: quizSetId },
                select: { questions: true }
            });
            if (questionSet) {
                quizData = { questions: questionSet.questions };
            }
        }
        const assignment = await db_1.db.assignment.create({
            data: {
                classId: classroom.id,
                name,
                description,
                maxScore: maxScore || 10,
                type: type || "score",
                checklists: checklists || [],
                passScore: passScore !== null && passScore !== void 0 ? passScore : null,
                deadline: deadline ? new Date(deadline) : null,
                quizSetId: quizSetId || null,
                quizData,
                order: classroom.assignments.length
            }
        });
        // Notify all students
        await Promise.all(classroom.students.map((student) => (0, notifications_1.sendNotification)({
            studentId: student.id,
            title: "มีงานใหม่!",
            message: `คุณได้รับงานใหม่: ${name}`,
            type: "ASSIGNMENT",
            link: `/student/${student.loginCode}`
        })));
        return server_1.NextResponse.json(assignment);
    }
    catch (error) {
        console.error("[ASSIGNMENTS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function PATCH(req, { params }) {
    var _a;
    const session = await (0, auth_1.auth)();
    const resolvedParams = await params;
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const classroom = await db_1.db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const items = await req.json();
        await Promise.all(items.map((item) => db_1.db.assignment.update({
            where: { id: item.id },
            data: { order: item.order }
        })));
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[ASSIGNMENTS_REORDER]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
