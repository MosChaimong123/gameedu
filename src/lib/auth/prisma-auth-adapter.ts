import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "@auth/core/adapters";
import type { PrismaClient } from "@prisma/client";

type ProviderAccountKey = {
    provider: string;
    providerAccountId: string;
};

function toAdapterUser(
    user: NonNullable<Awaited<ReturnType<PrismaClient["user"]["findUnique"]>>>
): AdapterUser {
    return {
        id: user.id,
        email: user.email ?? "",
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
    };
}

/**
 * Wraps {@link PrismaAdapter} so MongoDB FK drift (Account/Session rows whose User was deleted)
 * does not crash Auth.js with:
 * "Inconsistent query result: Field user is required to return data, got null instead".
 *
 * Orphan rows are deleted and the sign-in flow can create a fresh link.
 */
export function prismaAuthAdapter(db: PrismaClient) {
    const base = PrismaAdapter(db);

    return {
        ...base,
        async getUserByAccount(provider_providerAccountId: ProviderAccountKey) {
            const account = await db.account.findUnique({
                where: { provider_providerAccountId },
                select: { userId: true },
            });
            if (!account) {
                return null;
            }
            const user = await db.user.findUnique({ where: { id: account.userId } });
            if (!user) {
                try {
                    await db.account.delete({ where: { provider_providerAccountId } });
                } catch {
                    /* ignore race */
                }
                console.warn(
                    "[auth] Removed orphan Account",
                    provider_providerAccountId.provider,
                    provider_providerAccountId.providerAccountId
                );
                return null;
            }
            return toAdapterUser(user);
        },
        async getSessionAndUser(sessionToken: string) {
            const row = await db.session.findUnique({
                where: { sessionToken },
            });
            if (!row) {
                return null;
            }
            const user = await db.user.findUnique({ where: { id: row.userId } });
            if (!user) {
                try {
                    await db.session.delete({ where: { sessionToken } });
                } catch {
                    /* ignore race */
                }
                console.warn("[auth] Removed orphan Session (missing User)", sessionToken.slice(0, 8) + "…");
                return null;
            }
            return {
                user: toAdapterUser(user),
                session: {
                    sessionToken: row.sessionToken,
                    userId: row.userId,
                    expires: row.expires,
                },
            };
        },
    };
}
