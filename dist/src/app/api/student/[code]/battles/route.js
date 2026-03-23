"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
// GET /api/student/[code]/battles
// Returns: pending challenges to this student + recent battle history
async function GET(req, { params }) {
    try {
        const { code } = await params;
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true, classId: true }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        // Pending challenges where this student is the defender
        const pending = await db_1.db.studentBattle.findMany({
            where: { defenderId: student.id, status: "PENDING" },
            include: {
                challenger: { select: { id: true, name: true, avatar: true, gameStats: true, points: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        // Recent completed battles
        const recent = await db_1.db.studentBattle.findMany({
            where: {
                OR: [{ challengerId: student.id }, { defenderId: student.id }],
                status: "COMPLETED"
            },
            include: {
                challenger: { select: { id: true, name: true, avatar: true } },
                defender: { select: { id: true, name: true, avatar: true } }
            },
            orderBy: { resolvedAt: "desc" },
            take: 10
        });
        // Classmates to challenge
        const classmates = await db_1.db.student.findMany({
            where: { classId: student.classId, id: { not: student.id } },
            select: { id: true, name: true, avatar: true, points: true, gameStats: true },
            orderBy: { name: "asc" }
        });
        return server_1.NextResponse.json({ pending, recent, classmates, studentId: student.id });
    }
    catch (error) {
        console.error("Error fetching battles:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/student/[code]/battles
// Body: { defenderId, betAmount }
// Creates a new challenge
async function POST(req, { params }) {
    var _a;
    try {
        const { code } = await params;
        const { defenderId, betAmount } = await req.json();
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true, classId: true, gameStats: true }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const bet = Math.max(10, Math.min(500, Number(betAmount) || 50));
        const gold = ((_a = student.gameStats) === null || _a === void 0 ? void 0 : _a.gold) || 0;
        if (gold < bet) {
            return server_1.NextResponse.json({ error: `Gold ไม่พอ — มี ${gold} แต่ต้องวาง ${bet}` }, { status: 400 });
        }
        // Check if there's already a pending challenge between these two
        const existing = await db_1.db.studentBattle.findFirst({
            where: {
                OR: [
                    { challengerId: student.id, defenderId, status: "PENDING" },
                    { challengerId: defenderId, defenderId: student.id, status: "PENDING" }
                ]
            }
        });
        if (existing) {
            return server_1.NextResponse.json({ error: "มีการท้าดวลที่รอการตอบรับอยู่แล้ว" }, { status: 400 });
        }
        const battle = await db_1.db.studentBattle.create({
            data: {
                challengerId: student.id,
                defenderId,
                betAmount: bet,
                classId: student.classId,
                status: "PENDING"
            },
            include: {
                defender: { select: { name: true } }
            }
        });
        return server_1.NextResponse.json({ success: true, battle });
    }
    catch (error) {
        console.error("Error creating challenge:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
