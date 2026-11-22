import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { regenerateRecoveryCodes } from "@/lib/auth/mfa";
import { verifyRecentOrPassword } from "@/lib/auth/reauthentication";

const schema = z.object({ currentPassword: z.string().max(128).optional() });
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !(await verifyRecentOrPassword(session, parsed.data.currentPassword))) {
    return createAppErrorResponse("REAUTHENTICATION_REQUIRED", "Recent authentication required", 403);
  }
  return NextResponse.json({ recoveryCodes: await regenerateRecoveryCodes(session.user.id) }, { headers: { "Cache-Control": "no-store" } });
}
