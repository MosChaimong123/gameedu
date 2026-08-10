import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppErrorResponse } from "@/lib/api-error";
import { listRecentAuditEvents } from "@/lib/security/audit-log";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const events = await listRecentAuditEvents(40, { actorUserId: userId, category: "auth" });
  return NextResponse.json({ activity: events.map((event) => ({
    action: event.action,
    status: event.status,
    timestamp: event.timestamp.toISOString(),
  })) });
}
