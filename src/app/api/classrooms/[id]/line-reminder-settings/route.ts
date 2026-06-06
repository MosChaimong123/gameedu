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
import {
    normalizeClassroomLineReminderSetting,
    type ClassroomLineReminderSettingSnapshot,
} from "@/lib/line-bot/reminder-settings";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type ReminderSettingModel = {
    findUnique(input: {
        where: { classroomId: string };
        select: {
            classroomId: true;
            enabled: true;
            beforeDeadline1d: true;
            dueToday: true;
            overdue1d: true;
            weeklySummary: true;
            timezone: true;
        };
    }): Promise<ClassroomLineReminderSettingSnapshot | null>;
    upsert(input: {
        where: { classroomId: string };
        create: ClassroomLineReminderSettingSnapshot;
        update: Omit<ClassroomLineReminderSettingSnapshot, "classroomId">;
        select: {
            classroomId: true;
            enabled: true;
            beforeDeadline1d: true;
            dueToday: true;
            overdue1d: true;
            weeklySummary: true;
            timezone: true;
        };
    }): Promise<ClassroomLineReminderSettingSnapshot>;
};

async function assertTeacherOwnsClassroom(classroomId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false as const, response: createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401) };
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }

    const classroom = await db.classroom.findUnique({
        where: { id: classroomId },
        select: { id: true, teacherId: true },
    });
    if (!classroom) {
        return { ok: false as const, response: createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404) };
    }
    if (classroom.teacherId !== session.user.id) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }
    return { ok: true as const };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const guard = await assertTeacherOwnsClassroom(id);
    if (!guard.ok) return guard.response;

    const model = getOptionalDbModel<ReminderSettingModel>("classroomLineReminderSetting");
    if (!model) {
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }

    const setting = await model.findUnique({
        where: { classroomId: id },
        select: {
            classroomId: true,
            enabled: true,
            beforeDeadline1d: true,
            dueToday: true,
            overdue1d: true,
            weeklySummary: true,
            timezone: true,
        },
    });

    return NextResponse.json({
        setting: normalizeClassroomLineReminderSetting(id, setting),
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const guard = await assertTeacherOwnsClassroom(id);
    if (!guard.ok) return guard.response;

    const model = getOptionalDbModel<ReminderSettingModel>("classroomLineReminderSetting");
    if (!model) {
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }

    const payload = (await req.json().catch(() => null)) as Partial<ClassroomLineReminderSettingSnapshot> | null;
    if (!payload || typeof payload !== "object") {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid LINE reminder setting payload", 400);
    }

    const setting = normalizeClassroomLineReminderSetting(id, payload);
    const saved = await model.upsert({
        where: { classroomId: id },
        create: setting,
        update: {
            enabled: setting.enabled,
            beforeDeadline1d: setting.beforeDeadline1d,
            dueToday: setting.dueToday,
            overdue1d: setting.overdue1d,
            weeklySummary: setting.weeklySummary,
            timezone: setting.timezone,
        },
        select: {
            classroomId: true,
            enabled: true,
            beforeDeadline1d: true,
            dueToday: true,
            overdue1d: true,
            weeklySummary: true,
            timezone: true,
        },
    });

    return NextResponse.json({
        setting: normalizeClassroomLineReminderSetting(id, saved),
    });
}
