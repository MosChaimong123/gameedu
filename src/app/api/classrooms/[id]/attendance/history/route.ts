import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type AttendanceRecordWithStudent = Awaited<ReturnType<typeof db.attendanceRecord.findMany>>[number];
type GroupedAttendanceRecords = Record<string, AttendanceRecordWithStudent[]>;

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
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

        const records = await db.attendanceRecord.findMany({
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
        const groupedRecords = records.reduce<GroupedAttendanceRecords>((acc, record) => {
            const dateStr = record.date.toISOString().split('T')[0];
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(record);
            return acc;
        }, {});

        return NextResponse.json({ records, groupedRecords });

    } catch (error) {
        console.error("[ATTENDANCE_HISTORY_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
