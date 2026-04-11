import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { awardBatchClassroomPoints } from "@/lib/services/classroom-points/award-classroom-points";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }
    if (!session.user.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentIds, skillId } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !skillId) {
            return new NextResponse("Missing data", { status: 400 });
        }

        const result = await awardBatchClassroomPoints({
            classroomId: id,
            teacherId: session.user.id,
            studentIds,
            skillId,
        });

        if (!result.ok) {
            return new NextResponse(result.message, { status: result.status });
        }

        return NextResponse.json({
            success: true,
            classroomId: result.classroomId,
            skillWeight: result.skillWeight,
            updatedStudents: result.updatedStudents,
        });

    } catch (error) {
        console.error("[POINTS_BATCH_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
