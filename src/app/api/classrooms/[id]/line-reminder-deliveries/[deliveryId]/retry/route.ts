import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { getDeliveryModel } from "@/lib/line-bot/delivery-contract";
import { retryLineReminderDelivery } from "@/lib/line-bot/reminder-retry";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string; deliveryId: string }> }
): Promise<Response> {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }
    const { id, deliveryId } = await params;
    const classroom = await db.classroom.findUnique({
        where: { id },
        select: { teacherId: true },
    });
    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }
    if (session.user.role !== "ADMIN" && classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }
    const model = getDeliveryModel();
    const delivery = await model?.findUnique({
        where: { id: deliveryId },
        select: { classroomId: true },
    });
    if (!delivery || delivery.classroomId !== id) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }
    const result = await retryLineReminderDelivery(deliveryId);
    const status =
        result.ok ? 200 : result.status === "not_found" ? 404 : result.status === "in_flight" ? 409 : 422;
    return NextResponse.json(result, { status });
}
