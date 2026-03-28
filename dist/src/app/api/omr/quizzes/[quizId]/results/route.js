"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
// POST /api/omr/quizzes/[quizId]/results - Save a new scan result
async function POST(req, { params }) {
    var _a;
    try {
        const { quizId } = await params;
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const body = await req.json();
        const { studentId, studentName, score, total, answers } = body;
        // Verify quiz ownership
        const quiz = await db_1.db.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        });
        if (!quiz)
            return new server_1.NextResponse("Forbidden", { status: 403 });
        const result = await db_1.db.oMRResult.create({
            data: {
                quizId,
                studentId: studentId || null,
                studentName,
                score,
                total,
                answers
            }
        });
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error("[OMR_RESULTS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
