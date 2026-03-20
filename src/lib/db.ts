import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = (globalForPrisma.prisma as any) || new PrismaClient()

// Update: Force refresh if OMR models are missing (for dev development only)
if (process.env.NODE_ENV !== "production") {
    if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).omrQuiz) {
        console.log("REFRESHING_PRISMA_CLIENT...");
        globalForPrisma.prisma = new PrismaClient();
    } else {
        globalForPrisma.prisma = db
    }
}
