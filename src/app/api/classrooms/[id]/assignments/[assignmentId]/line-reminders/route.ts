import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db, getOptionalDbModel } from "@/lib/db";
import { pushLineText } from "@/lib/line-bot/client";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type LineReminderDeliveryModel = {
    create(input: {
        data: {
            lineBotGroupId: string;
            lineGroupId: string;
            classroomId: string;
            assignmentId: string;
            reminderKey: string;
            reminderType: string;
            targetCount: number;
        };
    }): Promise<unknown>;
};

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const { id, assignmentId } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const assignment = await db.assignment.findUnique({
            where: { id: assignmentId, classId: id },
            select: {
                id: true,
                name: true,
                deadline: true,
                classroom: {
                    select: {
                        id: true,
                        name: true,
                        teacherId: true,
                        teacher: {
                            select: {
                                role: true,
                                plan: true,
                                planStatus: true,
                                planExpiry: true,
                            },
                        },
                        students: { select: { id: true } },
                        lineBotGroups: {
                            where: { isActive: true },
                            select: { id: true, lineGroupId: true },
                        },
                    },
                },
                submissions: { select: { studentId: true } },
            },
        });

        if (!assignment) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        if (assignment.classroom.teacherId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        if (!canUseLineFeature(assignment.classroom.teacher, "lineAutoReminders")) {
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "Manual LINE reminders from the dashboard require PLUS or School plan",
                403
            );
        }

        const deliveryModel = getOptionalDbModel<LineReminderDeliveryModel>("lineAssignmentReminderDelivery");
        if (!deliveryModel) {
            return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
        }

        const submitted = new Set(assignment.submissions.map((submission) => submission.studentId));
        const targetCount = assignment.classroom.students.filter((student) => !submitted.has(student.id)).length;
        const groups = assignment.classroom.lineBotGroups;
        if (groups.length === 0) {
            return NextResponse.json({
                success: true,
                lineGroupCount: 0,
                sentCount: 0,
                targetCount,
            });
        }

        const now = new Date();
        const reminderKey = `manual:${now.toISOString()}`;
        const message = formatManualLineReminderMessage({
            classroomName: assignment.classroom.name,
            assignmentName: assignment.name,
            deadline: assignment.deadline,
            targetCount,
        });

        let sentCount = 0;
        let failedCount = 0;
        for (const group of groups) {
            try {
                await deliveryModel.create({
                    data: {
                        lineBotGroupId: group.id,
                        lineGroupId: group.lineGroupId,
                        classroomId: assignment.classroom.id,
                        assignmentId: assignment.id,
                        reminderKey,
                        reminderType: "manual",
                        targetCount,
                    },
                });
                await pushLineText(group.lineGroupId, message);
                sentCount += 1;
            } catch (error) {
                failedCount += 1;
                console.error("[ASSIGNMENT_LINE_REMINDERS_POST]", error);
            }
        }

        return NextResponse.json({
            success: failedCount === 0,
            lineGroupCount: groups.length,
            sentCount,
            failedCount,
            targetCount,
            reminderKey,
        });
    } catch (error) {
        console.error("[ASSIGNMENT_LINE_REMINDERS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

function formatManualLineReminderMessage(input: {
    classroomName: string;
    assignmentName: string;
    deadline: Date | null;
    targetCount: number;
}) {
    return [
        "กริ่งเตือนจากครู",
        `ห้อง ${input.classroomName}`,
        `งาน: ${input.assignmentName}`,
        `ยังขาด ${input.targetCount} คน`,
        input.deadline ? `กำหนดส่ง: ${formatBangkokDateTime(input.deadline)}` : "กำหนดส่ง: ไม่มีกำหนด",
        "",
        "เปิด GameEdu เพื่อตรวจงานของตัวเองได้เลย",
    ].join("\n");
}

function formatBangkokDateTime(date: Date): string {
    return date.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}
