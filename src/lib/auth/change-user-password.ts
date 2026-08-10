import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { passwordChangeSchema } from "@/lib/auth/password-policy";
import { validateNewPassword } from "@/lib/auth/password-policy-server";
import { hashPassword, verifyPassword } from "@/lib/auth/password-hash";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";

type ChangeUserPasswordOptions = {
    userId: string;
    newPassword: string;
    changedAt?: Date;
    claimChallenge?: (tx: Prisma.TransactionClient, changedAt: Date) => Promise<void>;
};

export type ChangeUserPasswordResult = {
    databaseSessionsDeleted: number;
    securitySessionsRevoked: number;
};

export class PasswordReuseError extends Error {}
export class PasswordPolicyError extends Error {}

function nextAuthVersion(authVersion: number | null | undefined): number | { increment: number } {
    return typeof authVersion === "number" && Number.isSafeInteger(authVersion) && authVersion >= 0
        ? { increment: 1 }
        : 1;
}

export async function changeUserPassword({
    userId,
    newPassword,
    changedAt = new Date(),
    claimChallenge,
}: ChangeUserPasswordOptions): Promise<ChangeUserPasswordResult> {
    const password = passwordChangeSchema.parse(newPassword);
    const validation = await validateNewPassword(password);
    if (!validation.valid) throw new PasswordPolicyError(validation.reason);
    const hashedPassword = await hashPassword(password);

    return db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { authVersion: true, password: true },
        });
        if (!user) {
            throw new Error("User not found");
        }
        if (user.password && (await verifyPassword(password, user.password))) {
            throw new PasswordReuseError("New password must differ from the current password");
        }

        await claimChallenge?.(tx, changedAt);

        await tx.emailVerificationCode.updateMany({
            where: {
                userId,
                purpose: PASSWORD_RESET_PURPOSE,
                AND: [
                    { OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }] },
                    { OR: [{ status: "ACTIVE" }, { status: { isSet: false } }] },
                ],
            },
            data: { status: "CONSUMED", consumedAt: changedAt, codePlain: null },
        });
        await tx.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                authVersion: nextAuthVersion(user.authVersion),
                passwordChangedAt: changedAt,
            },
        });
        const deletedSessions = await tx.session.deleteMany({ where: { userId } });
        const revokedSecuritySessions = await tx.userAuthSession.updateMany({
            where: { userId, ...activeUserAuthSessionFilter() },
            data: { revokedAt: changedAt, revokedReason: "password_changed" },
        });

        return {
            databaseSessionsDeleted: deletedSessions.count,
            securitySessionsRevoked: revokedSecuritySessions.count,
        };
    });
}
