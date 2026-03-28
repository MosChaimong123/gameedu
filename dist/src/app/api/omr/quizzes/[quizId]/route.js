"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
// GET /api/omr/quizzes/[quizId] - Get single quiz details with results
async function GET(req, { params }) {
    var _a;
    try {
        const { quizId } = await params;
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const quiz = await db_1.db.oMRQuiz.findFirst({
            where: {
                id: quizId,
                teacherId: session.user.id
            },
            include: {
                results: {
                    orderBy: { scannedAt: "desc" },
                    include: {
                        student: {
                            select: { name: true, nickname: true }
                        }
                    }
                }
            }
        });
        if (!quiz)
            return new server_1.NextResponse("Not Found", { status: 404 });
        return server_1.NextResponse.json(quiz);
    }
    catch (error) {
        console.error("[OMR_QUIZ_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
// PUT /api/omr/quizzes/[quizId] - Update quiz (Answer Key, title, etc.)
async function PUT(req, { params }) {
    var _a;
    try {
        const { quizId } = await params;
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const body = await req.json();
        const { title, description, answerKey, classId, questionCount } = body;
        // Verify ownership
        const existing = await db_1.db.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        });
        if (!existing)
            return new server_1.NextResponse("Not Found", { status: 404 });
        const quiz = await db_1.db.oMRQuiz.update({
            where: { id: quizId },
            data: {
                title,
                description,
                answerKey,
                classId,
                questionCount
            },
            include: {
                results: {
                    orderBy: { scannedAt: "desc" },
                    include: {
                        student: {
                            select: { name: true, nickname: true }
                        }
                    }
                }
            }
        });
        return server_1.NextResponse.json(quiz);
    }
    catch (error) {
        console.error("[OMR_QUIZ_PUT]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
// DELETE /api/omr/quizzes/[quizId] - Delete quiz
async function DELETE(req, { params }) {
    var _a;
    try {
        const { quizId } = await params;
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        // Verify ownership
        const existing = await db_1.db.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        });
        if (!existing)
            return new server_1.NextResponse("Not Found", { status: 404 });
        await db_1.db.oMRQuiz.delete({
            where: { id: quizId }
        });
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[OMR_QUIZ_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
