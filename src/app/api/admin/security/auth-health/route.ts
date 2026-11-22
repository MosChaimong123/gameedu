import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { getAuthSecurityObservability } from "@/lib/security/auth-observability";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  if (session.user.role !== "ADMIN" || session.user.mfaLevel !== 1) return createAppErrorResponse("FORBIDDEN", "Forbidden", 403);
  const requestedWindow = Number(new URL(req.url).searchParams.get("windowMinutes"));
  const windowMinutes = Number.isFinite(requestedWindow) ? Math.max(1, Math.min(requestedWindow, 1_440)) : 15;
  return NextResponse.json(await getAuthSecurityObservability(windowMinutes), { headers: { "Cache-Control": "no-store" } });
}
