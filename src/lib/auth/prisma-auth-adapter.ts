import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "@auth/core/adapters";
import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { resolveAuthSecret } from "@/lib/env";
import {
    decodeProviderLinkIntent,
    PROVIDER_LINK_INTENT_COOKIE,
} from "@/lib/auth/provider-link-intent";
import { logAuditEvent } from "@/lib/security/audit-log";
import { sendCredentialChangedNotification } from "@/lib/email/send-security-notification-email";

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
    const baseLinkAccount = base.linkAccount;

    return {
        ...base,
        async linkAccount(account: Parameters<NonNullable<typeof baseLinkAccount>>[0]) {
            if (!baseLinkAccount) throw new Error("ADAPTER_LINK_ACCOUNT_UNAVAILABLE");
            const targetUser = await db.user.findUnique({
                where: { id: account.userId },
                select: { password: true, email: true },
            });
            // A password account linking Google is a sensitive mutation. Auth.js already
            // binds the OAuth callback to the signed-in user; this additionally proves a
            // fresh password reauthentication happened immediately before the redirect.
            if (account.provider === "google" && targetUser?.password) {
                const secret = resolveAuthSecret();
                const jar = await cookies();
                const encoded = jar.get(PROVIDER_LINK_INTENT_COOKIE)?.value;
                const intent = secret && encoded ? decodeProviderLinkIntent(encoded, secret) : null;
                if (!intent || intent.userId !== account.userId || intent.provider !== "google") {
                    throw new Error("PROVIDER_LINK_REAUTH_REQUIRED");
                }
            }
            await baseLinkAccount(account);
            logAuditEvent({
                actorUserId: account.userId,
                action: "auth.provider_linked",
                category: "auth",
                targetType: "user",
                targetId: account.userId,
                metadata: { provider: account.provider },
            });
            if (targetUser?.password && targetUser.email) {
                try { await sendCredentialChangedNotification(targetUser.email, "provider"); }
                catch (error) { console.error("[auth] Provider-link notification failed", error); }
            }
        },
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
