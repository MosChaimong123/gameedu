import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

type DbModelName = "teacherNewsItem" | "teacherMission"

export function getOptionalDbModel<T = unknown>(name: DbModelName): T | null {
    const model = (db as unknown as Record<string, unknown>)[name]
    return model ? (model as T) : null
}

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db
}
