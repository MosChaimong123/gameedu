import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { beginTotpEnrollment } from "@/lib/auth/mfa";
import { verifyRecentOrPassword } from "@/lib/auth/reauthentication";
import { consumeRateLimitWithStore, createRateLimitResponse, getRequestClientIdentifier } from "@/lib/security/rate-limit";

const schema = z.object({ currentPassword: z.string().max(128).optional() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const limit = await consumeRateLimitWithStore({ bucket: "auth:mfa:enroll", key: `${getRequestClientIdentifier(req)}:${session.user.id}`, limit: 5, windowMs: 15 * 60_000 });
  if (!limit.allowed) return createRateLimitResponse(limit);
  if (!(await verifyRecentOrPassword(session, parsed.data.currentPassword))) {
    return createAppErrorResponse("REAUTHENTICATION_REQUIRED", "Recent authentication required", 403);
  }
  const enrollment = await beginTotpEnrollment(session.user.id, session.user.email ?? session.user.name ?? session.user.id);
  return NextResponse.json(enrollment, { headers: { "Cache-Control": "no-store" } });
}
