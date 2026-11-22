import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { finishPasskeyRegistration } from "@/lib/auth/passkeys";
import { logAuditEvent } from "@/lib/security/audit-log";

const schema = z.object({ name: z.string().max(80).optional(), response: z.record(z.string(), z.unknown()) });
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const credential = await finishPasskeyRegistration(session.user.id, parsed.data.response as never, parsed.data.name ?? "Passkey");
  if (!credential) return createAppErrorResponse("PASSKEY_VERIFICATION_FAILED", "Passkey verification failed", 400);
  logAuditEvent({ actorUserId: session.user.id, action: "auth.passkey.registered", category: "auth", status: "success", targetType: "passkey", targetId: credential.id });
  return NextResponse.json({ credential });
}
