import { randomBytes } from "node:crypto";
import { db, getOptionalDbModel } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";

const LINE_TEACHER_LINK_CODE_TTL_MINUTES = 10;

type TeacherLinkCode = {
    id: string;
    userId: string;
    classroomId: string;
    code: string;
    expiresAt: Date;
    consumedAt: Date | null;
};

type TeacherLinkCodeModel = {
    findFirst(input: {
        where: { userId: string; classroomId: string; consumedAt: null; expiresAt: { gt: Date } };
        orderBy: { createdAt: "desc" };
        select: { code: true; expiresAt: true };
    }): Promise<{ code: string; expiresAt: Date } | null>;
    findUnique(input: {
        where: { code: string };
        select: {
            id: true;
            userId: true;
            classroomId: true;
            code: true;
            expiresAt: true;
            consumedAt: true;
        };
    }): Promise<TeacherLinkCode | null>;
    create(input: {
        data: { userId: string; classroomId: string; code: string; expiresAt: Date };
        select: { code: true; expiresAt: true };
    }): Promise<{ code: string; expiresAt: Date }>;
    update(input: {
        where: { id: string };
        data: { consumedAt: Date; lineUserId: string };
    }): Promise<unknown>;
    updateMany(input: {
        where: { id: string; consumedAt: null; expiresAt: { gt: Date } };
        data: { consumedAt: Date; lineUserId: string };
    }): Promise<{ count: number }>;
};

type TeacherAccountLinkModel = {
    findUnique(input: {
        where: { lineUserId?: string; userId?: string };
        select: { userId: true; lineUserId: true; createdAt?: true };
    }): Promise<{ userId: string; lineUserId: string; createdAt?: Date } | null>;
    upsert(input: {
        where: { userId: string };
        create: { userId: string; lineUserId: string };
        update: { lineUserId: string };
    }): Promise<unknown>;
    delete(input: { where: { userId: string } }): Promise<unknown>;
};

export type ConsumeTeacherLineLinkCodeResult =
    | { ok: true; teacherName: string; classroomName: string }
    | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "CONFLICT" | "FORBIDDEN" | "MODEL_UNAVAILABLE" };

export async function getOrCreateTeacherLineLinkCode(input: {
    userId: string;
    classroomId: string;
    now?: Date;
}): Promise<{ code: string; expiresAt: Date } | null> {
    const model = getOptionalDbModel<TeacherLinkCodeModel>("lineTeacherLinkCode");
    if (!model) return null;

    const now = input.now ?? new Date();
    const active = await model.findFirst({
        where: {
            userId: input.userId,
            classroomId: input.classroomId,
            consumedAt: null,
            expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: { code: true, expiresAt: true },
    });
    if (active) return active;

    const expiresAt = new Date(now.getTime() + LINE_TEACHER_LINK_CODE_TTL_MINUTES * 60 * 1000);
    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            return await model.create({
                data: {
                    userId: input.userId,
                    classroomId: input.classroomId,
                    code: randomBytes(24).toString("base64url"),
                    expiresAt,
                },
                select: { code: true, expiresAt: true },
            });
        } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;
        }
    }

    throw new Error("Could not allocate a unique LINE teacher link code");
}

export async function consumeTeacherLineLinkCode(input: {
    lineUserId: string;
    code: string;
    now?: Date;
}): Promise<ConsumeTeacherLineLinkCodeResult> {
    const codeModel = getOptionalDbModel<TeacherLinkCodeModel>("lineTeacherLinkCode");
    const linkModel = getOptionalDbModel<TeacherAccountLinkModel>("lineTeacherAccountLink");
    if (!codeModel || !linkModel) return { ok: false, reason: "MODEL_UNAVAILABLE" };

    const now = input.now ?? new Date();
    const codeRow = await codeModel.findUnique({
        where: { code: input.code.trim() },
        select: {
            id: true,
            userId: true,
            classroomId: true,
            code: true,
            expiresAt: true,
            consumedAt: true,
        },
    });
    if (!codeRow) return { ok: false, reason: "NOT_FOUND" };
    if (codeRow.consumedAt || codeRow.expiresAt.getTime() <= now.getTime()) {
        return { ok: false, reason: "EXPIRED" };
    }

    const [user, classroom, existingLineLink] = await Promise.all([
        db.user.findUnique({ where: { id: codeRow.userId }, select: { id: true, name: true, role: true } }),
        db.classroom.findUnique({ where: { id: codeRow.classroomId }, select: { id: true, name: true, teacherId: true } }),
        linkModel.findUnique({ where: { lineUserId: input.lineUserId }, select: { userId: true, lineUserId: true } }),
    ]);

    if (!user || !classroom || !isTeacherOrAdmin(user.role) || (user.role !== "ADMIN" && classroom.teacherId !== user.id)) {
        return { ok: false, reason: "FORBIDDEN" };
    }
    if (existingLineLink && existingLineLink.userId !== user.id) {
        return { ok: false, reason: "CONFLICT" };
    }

    try {
        await db.$transaction(async (tx) => {
            // Prisma Client is generated during deployment. Use the transaction
            // model dynamically so the current source remains type-safe even if
            // a local dev server still holds the generated client file open.
            const txModels = tx as unknown as Record<string, unknown>;
            const txCodeModel = txModels.lineTeacherLinkCode as TeacherLinkCodeModel | undefined;
            const txLinkModel = txModels.lineTeacherAccountLink as TeacherAccountLinkModel | undefined;
            if (!txCodeModel || !txLinkModel) throw new Error("LINE teacher link models unavailable in transaction");

            const claimed = await txCodeModel.updateMany({
                where: { id: codeRow.id, consumedAt: null, expiresAt: { gt: now } },
                data: { consumedAt: now, lineUserId: input.lineUserId },
            });
            if (claimed.count !== 1) throw new TeacherLinkCodeUnavailableError();

            await txLinkModel.upsert({
                where: { userId: user.id },
                create: { userId: user.id, lineUserId: input.lineUserId },
                update: { lineUserId: input.lineUserId },
            });
        });
    } catch (error) {
        if (error instanceof TeacherLinkCodeUnavailableError) return { ok: false, reason: "EXPIRED" };
        throw error;
    }

    return {
        ok: true,
        teacherName: user.name?.trim() || "ครู",
        classroomName: classroom.name,
    };
}

class TeacherLinkCodeUnavailableError extends Error {}

export async function getTeacherLineLinkStatus(userId: string): Promise<{ linked: boolean } | null> {
    const linkModel = getOptionalDbModel<TeacherAccountLinkModel>("lineTeacherAccountLink");
    if (!linkModel) return null;
    const link = await linkModel.findUnique({
        where: { userId },
        select: { userId: true, lineUserId: true },
    });
    return { linked: Boolean(link) };
}

export async function revokeTeacherLineAccountLink(userId: string): Promise<{ revoked: boolean } | null> {
    const linkModel = getOptionalDbModel<TeacherAccountLinkModel>("lineTeacherAccountLink");
    if (!linkModel) return null;
    const link = await linkModel.findUnique({
        where: { userId },
        select: { userId: true, lineUserId: true },
    });
    if (!link) return { revoked: false };
    await linkModel.delete({ where: { userId } });
    return { revoked: true };
}

export async function isLineTeacherAuthorizedForGroup(input: {
    lineUserId: string;
    lineGroupId: string;
}): Promise<boolean> {
    const linkModel = getOptionalDbModel<TeacherAccountLinkModel>("lineTeacherAccountLink");
    if (!linkModel) return false;

    const [link, group] = await Promise.all([
        linkModel.findUnique({ where: { lineUserId: input.lineUserId }, select: { userId: true, lineUserId: true } }),
        db.lineBotGroup.findUnique({
            where: { lineGroupId: input.lineGroupId },
            select: { classroomId: true },
        }),
    ]);
    if (!link || !group?.classroomId) return false;

    const [user, classroom] = await Promise.all([
        db.user.findUnique({ where: { id: link.userId }, select: { role: true } }),
        db.classroom.findUnique({ where: { id: group.classroomId }, select: { teacherId: true } }),
    ]);
    if (!user || !classroom || !isTeacherOrAdmin(user.role)) return false;
    return user.role === "ADMIN" || classroom.teacherId === link.userId;
}

export function buildTeacherLineLinkCommand(code: string): string {
    return `ยืนยันครู ${code}`;
}

function isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
