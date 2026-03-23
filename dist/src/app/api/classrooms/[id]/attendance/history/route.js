"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req, { params }) {
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
        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        let dateFilter = {};
        if (dateParam) {
            const startOfDay = new Date(dateParam);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateParam);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter = {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            };
        }
        const records = await db_1.db.attendanceRecord.findMany({
            where: {
                classId: id,
                ...dateFilter
            },
            include: {
                student: {
                    select: {
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        // Group by date
        const groupedRecords = records.reduce((acc, record) => {
            const dateStr = record.date.toISOString().split('T')[0];
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(record);
            return acc;
        }, {});
        return server_1.NextResponse.json({ records, groupedRecords });
    }
    catch (error) {
        console.error("[ATTENDANCE_HISTORY_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
