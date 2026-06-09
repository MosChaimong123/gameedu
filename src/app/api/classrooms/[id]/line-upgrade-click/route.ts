import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { logAuditEvent } from "@/lib/security/audit-log";

const ALLOWED_SOURCES = [
    "line_panel_blocked_card",
    "line_auto_reminder_locked",
    "line_export_submissions_locked",
    "line_bulk_reminder_locked",
    "line_assignment_send_locked",
] as const;

type UpgradeClickSource = (typeof ALLOWED_SOURCES)[number];

function isUpgradeClickSource(value: string): value is UpgradeClickSource {
    return ALLOWED_SOURCES.includes(value as UpgradeClickSource);
}

export async function POST(
    req: Request,
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
        },
    });

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const payload = (await req.json().catch(() => null)) as { source?: string } | null;
    if (typeof payload?.source !== "string" || !isUpgradeClickSource(payload.source)) {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid LINE upgrade prompt source", 400);
    }

    logAuditEvent({
        actorUserId: session.user.id,
        action: "billing.line_upgrade_prompt.clicked",
        category: "billing",
        targetType: "classroom",
        targetId: classroom.id,
        metadata: {
            source: payload.source,
            classroomName: classroom.name,
        },
    });

    return NextResponse.json({ success: true });
}
