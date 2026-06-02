import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { isTeacherOrAdmin } from "@/lib/role-guards";

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
                deadline: true,
                classroom: {
                    select: {
                        id: true,
                        teacherId: true,
                        students: {
                            select: {
                                id: true,
                                loginCode: true,
                            },
                        },
                    },
                },
                submissions: {
                    select: {
                        studentId: true,
                    },
                },
            },
        });

        if (!assignment) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        if (assignment.classroom.teacherId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const submittedStudentIds = new Set(assignment.submissions.map((submission) => submission.studentId));
        const targets = assignment.classroom.students.filter((student) => !submittedStudentIds.has(student.id));

        const assignmentType = String(assignment.type || "score").toLowerCase();
        const buildLink =
            assignmentType === "quiz"
                ? (loginCode: string) => `/student/${loginCode}/quiz/${assignment.id}`
                : assignmentType === "worksheet"
                  ? (loginCode: string) => `/student/${loginCode}/worksheet/${assignment.id}`
                  : (loginCode: string) => `/student/${loginCode}`;

        const due = assignment.deadline
            ? assignment.deadline.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
              })
            : null;

        await Promise.all(
            targets.map((student) =>
                sendNotification({
                    studentId: student.id,
                    type: "ASSIGNMENT",
                    link: buildLink(student.loginCode),
                    i18n: due
                        ? {
                              titleKey: "notifAssignmentReminderTitle",
                              messageKey: "notifAssignmentReminderBodyDue",
                              params: { name: assignment.name, due },
                          }
                        : {
                              titleKey: "notifAssignmentReminderTitle",
                              messageKey: "notifAssignmentReminderBody",
                              params: { name: assignment.name },
                          },
                })
            )
        );

        return NextResponse.json({
            success: true,
            targetCount: targets.length,
        });
    } catch (error) {
        console.error("[ASSIGNMENT_REMINDERS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
