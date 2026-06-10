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
import { pushLineFlex } from "@/lib/line-bot/client";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import { createMissingStudentNameResolver } from "@/lib/line-bot/missing-student-names";
import { buildReminderFlexBubble, type ChecklistItemSummary } from "@/lib/line-bot/reminder-flex";
import { isTeacherOrAdmin } from "@/lib/role-guards";

function getAppUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.LINE_BOT_CHAT_URL?.trim() || undefined;
}

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
                type: true,
                checklists: true,
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
                        students: { select: { id: true, name: true } },
                        lineBotGroups: {
                            where: { isActive: true },
                            select: { id: true, lineGroupId: true },
                        },
                    },
                },
                submissions: { select: { studentId: true, score: true } },
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
        const missing = assignment.classroom.students.filter((student) => !submitted.has(student.id));
        const targetCount = missing.length;
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
        const tone = assignment.deadline && assignment.deadline < now ? "overdue" : "today";

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
                const resolveMissingNames = await createMissingStudentNameResolver({
                    lineGroupId: group.lineGroupId,
                    classroomId: assignment.classroom.id,
                });
                const missingStudents = await resolveMissingNames(
                    missing.map((student) => ({ id: student.id, name: student.name }))
                );

                let checklistItems: ChecklistItemSummary[] | undefined;
                if (assignment.type === "checklist" && Array.isArray(assignment.checklists) && assignment.checklists.length > 0) {
                    const rawItems = assignment.checklists as Array<string | { text: string; points?: number }>;
                    const submissionMap = new Map(assignment.submissions.map((s) => [s.studentId, s.score]));
                    checklistItems = await Promise.all(
                        rawItems.map(async (item, i) => {
                            const text = typeof item === "string" ? item : item.text;
                            const missingList = assignment.classroom.students.filter((student) => {
                                const score = submissionMap.get(student.id);
                                if (score === undefined) return true;
                                return Math.floor(score / Math.pow(2, i)) % 2 === 0;
                            });
                            return {
                                text,
                                submittedCount: assignment.classroom.students.length - missingList.length,
                                totalStudents: assignment.classroom.students.length,
                                missingStudents: await resolveMissingNames(missingList),
                            };
                        })
                    );
                }

                const bubble = buildReminderFlexBubble({
                    tone,
                    classroomName: assignment.classroom.name,
                    assignmentName: assignment.name,
                    deadline: assignment.deadline,
                    missingSubmissions: targetCount,
                    totalStudents: assignment.classroom.students.length,
                    missingStudents,
                    footerUrl: getAppUrl(),
                    checklistItems,
                });
                await pushLineFlex(
                    group.lineGroupId,
                    `กริ่งเตือนจากครู: ${assignment.name} (ยังขาด ${targetCount} คน)`,
                    bubble
                );
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

