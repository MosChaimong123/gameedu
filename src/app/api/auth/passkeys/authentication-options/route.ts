import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPasskeyAuthenticationOptions } from "@/lib/auth/passkeys";
import {
  consumeRateLimitWithStore,
  createRateLimitResponse,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const clientIdentifier = getRequestClientIdentifier(req);
  const limits = await Promise.all([
    consumeRateLimitWithStore({
      bucket: "auth:passkey-options:ip",
      key: clientIdentifier,
      limit: 30,
      windowMs: 60_000,
    }),
    consumeRateLimitWithStore({
      bucket: "auth:passkey-options:global",
      key: "global",
      limit: 1_000,
      windowMs: 60_000,
    }),
  ]);
  const blocked = limits.find((result) => !result.allowed);
  if (blocked) return createRateLimitResponse(blocked);

  const session = await auth();
  return NextResponse.json(await createPasskeyAuthenticationOptions(session?.user?.id), { headers: { "Cache-Control": "no-store" } });
}
