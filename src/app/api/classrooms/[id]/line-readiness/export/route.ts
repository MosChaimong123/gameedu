import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db, getOptionalDbModel } from "@/lib/db";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type ReminderDeliveryModel = {
    findMany(input: {
        where: { classroomId: string };
        orderBy: { sentAt: "desc" };
        take: number;
        select: {
            classroomId: true;
            reminderType: true;
            targetCount: true;
            sentAt: true;
        };
    }): Promise<Array<{
        classroomId: string;
        reminderType: string;
        targetCount: number;
        sentAt: Date;
    }>>;
};

function sanitizeFormulaString(value: string) {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvValue(value: unknown) {
    const text =
        typeof value === "string"
            ? sanitizeFormulaString(value)
            : value == null
              ? ""
              : String(value);
    const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${sanitized.replace(/"/g, '""')}"`;
}

function safeFilenameSegment(value: string) {
    return (
        value
            .trim()
            .replace(/[\\/:*?"<>|]+/g, "-")
            .replace(/\s+/g, " ")
            .slice(0, 80) || "untitled"
    );
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const classroom = await db.classroom.findUnique({
        where: { id },
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
            lineBotGroups: {
                where: { isActive: true },
                select: {
                    id: true,
                    lineGroupId: true,
                    name: true,
                },
            },
            students: {
                orderBy: { order: "asc" },
                select: {
                    id: true,
                    order: true,
                    name: true,
                    nickname: true,
                    loginCode: true,
                },
            },
        },
    });

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    if (!canUseLineFeature(classroom.teacher, "lineExport")) {
        return createAppErrorResponse(
            "PLAN_LIMIT_AI_FEATURE",
            "LINE readiness export requires PLUS or School plan",
            403
        );
    }

    const [links, latestDelivery] = await Promise.all([
        db.lineStudentAccountLink.findMany({
            where: { classroomId: id },
            select: {
                studentId: true,
                lineUserId: true,
            },
        }),
        getOptionalDbModel<ReminderDeliveryModel>("lineAssignmentReminderDelivery")
            ?.findMany({
                where: { classroomId: id },
                orderBy: { sentAt: "desc" },
                take: 1,
                select: {
                    classroomId: true,
                    reminderType: true,
                    targetCount: true,
                    sentAt: true,
                },
            })
            .then((rows) => rows[0] ?? null)
            .catch(() => null) ?? Promise.resolve(null),
    ]);

    const linkedStudentIds = new Set(links.map((link) => link.studentId));
    const linkedPercent =
        classroom.students.length > 0
            ? Math.round((linkedStudentIds.size / classroom.students.length) * 100)
            : 0;
    const groupNames = classroom.lineBotGroups.map((group) => group.name?.trim() || group.lineGroupId).join(" | ");

    const header = [
        "classroomId",
        "classroomName",
        "groupCount",
        "groupNames",
        "studentCount",
        "linkedStudentCount",
        "linkedPercent",
        "lastReminderSentAt",
        "lastReminderType",
        "lastReminderTargetCount",
        "studentId",
        "studentOrder",
        "studentName",
        "studentNickname",
        "loginCode",
        "lineLinked",
    ];

    const rows = classroom.students.map((student) =>
        [
            classroom.id,
            classroom.name,
            classroom.lineBotGroups.length,
            groupNames,
            classroom.students.length,
            linkedStudentIds.size,
            linkedPercent,
            latestDelivery?.sentAt.toISOString() ?? "",
            latestDelivery?.reminderType ?? "",
            latestDelivery?.targetCount ?? "",
            student.id,
            student.order,
            student.name,
            student.nickname ?? "",
            student.loginCode,
            linkedStudentIds.has(student.id),
        ]
            .map(escapeCsvValue)
            .join(",")
    );

    const csv = [`\uFEFF${header.map(escapeCsvValue).join(",")}`, ...rows].join("\n");
    const filename = `${safeFilenameSegment(classroom.name)}-line-readiness.csv`;

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
