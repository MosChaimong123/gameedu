"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
// GET /api/student/inventory - Get inventory for a student
async function GET(req) {
    try {
        const studentId = req.nextUrl.searchParams.get("studentId");
        if (!studentId) {
            return server_1.NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }
        const inventory = await db_1.db.studentItem.findMany({
            where: { studentId },
            include: { item: true },
            orderBy: { createdAt: "desc" }
        });
        return server_1.NextResponse.json(inventory);
    }
    catch (error) {
        console.error("Error fetching inventory:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
