import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password-hash";
import { hasRecentAuthentication } from "@/lib/auth/session-policy";

export function hasRecentStrongAuthentication(session: Session | null) {
  return hasRecentAuthentication(session?.user?.mfaVerifiedAt) || hasRecentAuthentication(session?.user?.authenticatedAt);
}

export async function verifyRecentOrPassword(session: Session | null, currentPassword?: string) {
  const userId = session?.user?.id;
  if (!userId) return false;
  if (hasRecentStrongAuthentication(session)) return true;
  if (!currentPassword) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { password: true } });
  return Boolean(user?.password && await verifyPassword(currentPassword, user.password));
}
