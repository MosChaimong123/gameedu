import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyRecentOrPassword } from "@/lib/auth/reauthentication";
import { createPasskeyRegistrationOptions } from "@/lib/auth/passkeys";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const body = await req.json().catch(() => ({})) as { currentPassword?: unknown };
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;
  if (!(await verifyRecentOrPassword(session, currentPassword))) return createAppErrorResponse("REAUTHENTICATION_REQUIRED", "Recent authentication required", 403);
  return NextResponse.json(await createPasskeyRegistrationOptions(session.user.id), { headers: { "Cache-Control": "no-store" } });
}
