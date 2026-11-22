import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true, accounts: { select: { provider: true } }, passkeyCredentials: { select: { id: true } } },
  });
  if (!user) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  return NextResponse.json({
    methods: {
      password: Boolean(user.password),
      google: user.accounts.some((account) => account.provider === "google"),
      passkey: user.passkeyCredentials.length > 0,
    },
    linkingPolicy: "reauthenticated-explicit-link-only",
  });
}
