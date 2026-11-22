import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

export type SecurityMutationResult = {
    databaseSessionsDeleted: number;
    securitySessionsRevoked: number;
};

function nextAuthVersion(authVersion: number | null | undefined): number | { increment: number } {
    return typeof authVersion === "number" && Number.isSafeInteger(authVersion) && authVersion >= 0
        ? { increment: 1 }
        : 1;
}

/**
 * Required transaction boundary for role, account-status, and MFA security changes.
 * The caller supplies the domain mutation; this service always advances the JWT
 * generation and removes persisted sessions in the same transaction.
 */
export async function mutateUserSecurityState(
    userId: string,
    data: Prisma.UserUpdateInput
): Promise<SecurityMutationResult> {
    return db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { authVersion: true },
        });
        if (!user) {
            throw new Error("User not found");
        }

        await tx.user.update({
            where: { id: userId },
            data: { ...data, authVersion: nextAuthVersion(user.authVersion) },
        });
        const deletedSessions = await tx.session.deleteMany({ where: { userId } });
        const revokedSecuritySessions = await tx.userAuthSession.updateMany({
            where: { userId, ...activeUserAuthSessionFilter() },
            data: { revokedAt: new Date(), revokedReason: "security_state_changed" },
        });

        return { databaseSessionsDeleted: deletedSessions.count, securitySessionsRevoked: revokedSecuritySessions.count };
    });
}

export async function changeUserRole(
    userId: string,
    newRole: "ADMIN" | "TEACHER" | "STUDENT"
): Promise<SecurityMutationResult> {
    return mutateUserSecurityState(userId, { role: newRole });
}
