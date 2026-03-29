import type { Prisma } from "@prisma/client";

/** Safe cast for Prisma Json fields (ActiveGame, Classroom.gamifiedSettings, User.settings, …). */
export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}
