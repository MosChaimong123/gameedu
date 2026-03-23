"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
// GET /api/omr/quizzes - List all OMR quizzes for the teacher
async function GET() {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const quizzes = await db_1.db.oMRQuiz.findMany({
            where: { teacherId: session.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                results: {
                    orderBy: { scannedAt: "desc" }
                },
                _count: {
                    select: { results: true }
                }
            }
        });
        return server_1.NextResponse.json(quizzes);
    }
    catch (error) {
        console.error("[OMR_QUIZZES_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
// POST /api/omr/quizzes - Create a new OMR quiz
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const body = await req.json();
        const { title, description, questionCount, classId } = body;
        if (!title)
            return new server_1.NextResponse("Title is required", { status: 400 });
        // Initialize empty answer key
        const answerKey = {};
        for (let i = 1; i <= questionCount; i++) {
            answerKey[i.toString()] = ""; // Empty initially
        }
        const quiz = await db_1.db.oMRQuiz.create({
            data: {
                title,
                description,
                questionCount,
                answerKey,
                teacherId: session.user.id,
                classId: classId || null
            },
            include: {
                _count: {
                    select: { results: true }
                }
            }
        });
        return server_1.NextResponse.json(quiz);
    }
    catch (error) {
        console.error("[OMR_QUIZZES_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
