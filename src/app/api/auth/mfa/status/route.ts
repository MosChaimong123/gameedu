import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfaEnabledAt: true,
      mfaRecoveryCodes: { where: { consumedAt: null }, select: { id: true } },
      passkeyCredentials: { select: { id: true, name: true, createdAt: true, lastUsedAt: true } },
    },
  });
  if (!user) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  return NextResponse.json({
    totpEnabled: Boolean(user.mfaEnabledAt),
    recoveryCodesRemaining: user.mfaRecoveryCodes.length,
    passkeys: user.passkeyCredentials,
    required: session.user.role === "ADMIN" || Boolean(user.mfaEnabledAt),
  });
}
