import { NextRequest, NextResponse } from "next/server";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { requireSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { buildNegamonRewardAuditReport } from "@/lib/negamon/reward-audit-report";
import { listRecentAuditEvents } from "@/lib/security/audit-log";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSessionUser();
  if (!user) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  const classroom = await db.classroom.findUnique({
    where: { id, teacherId: user.id },
    select: { id: true },
  });
  if (!classroom) {
    return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
  }

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const gamePin = url.searchParams.get("gamePin")?.trim() || null;
  const reason = url.searchParams.get("reason")?.trim() || null;

  const events = await listRecentAuditEvents(MAX_LIMIT, {
    targetId: id,
    category: "classroom",
    actionPrefix: "classroom.negamon_battle.rewards_",
  });

  const filteredEvents = events
    .filter((event) => (gamePin ? metadataString(event.metadata, "gamePin") === gamePin : true))
    .filter((event) => (reason ? metadataString(event.metadata, "reason") === reason : true))
    .slice(0, limit);

  return NextResponse.json({
    filters: {
      classId: id,
      gamePin,
      reason,
      limit,
    },
    ...buildNegamonRewardAuditReport(filteredEvents),
  });
}
