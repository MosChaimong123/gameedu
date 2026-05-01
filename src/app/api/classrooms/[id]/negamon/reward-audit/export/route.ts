import { NextRequest, NextResponse } from "next/server";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { requireSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { listRecentAuditEvents } from "@/lib/security/audit-log";

const MAX_LIMIT = 500;

function sanitizeFormulaString(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function sanitizeFormulaValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeFormulaString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeFormulaValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        sanitizeFormulaValue(entryValue),
      ])
    );
  }
  return value;
}

function escapeCsvValue(value: unknown) {
  const text =
    typeof value === "string"
      ? sanitizeFormulaString(value)
      : JSON.stringify(sanitizeFormulaValue(value ?? ""));
  const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${sanitized.replace(/"/g, "\"\"")}"`;
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
  const gamePin = url.searchParams.get("gamePin")?.trim() || "";
  const reason = url.searchParams.get("reason")?.trim() || "";

  const events = await listRecentAuditEvents(MAX_LIMIT, {
    targetId: id,
    category: "classroom",
    actionPrefix: "classroom.negamon_battle.rewards_",
  });

  const filteredEvents = events
    .filter((event) => (gamePin ? metadataString(event.metadata, "gamePin") === gamePin : true))
    .filter((event) => (reason ? metadataString(event.metadata, "reason") === reason : true));

  const rows = [
    [
      "timestamp",
      "action",
      "status",
      "reason",
      "gamePin",
      "recipientCount",
      "totalExp",
      "linkedIdentityCount",
      "nameFallbackCount",
      "skippedPlayerCount",
      "skippedAmbiguousNameCount",
      "skippedInvalidStudentIdCount",
      "skippedNoMatchCount",
      "recipients",
      "skippedPlayers",
    ].join(","),
    ...filteredEvents.map((event) => {
      const metadata = event.metadata ?? {};
      return [
        escapeCsvValue(event.timestamp.toISOString()),
        escapeCsvValue(event.action),
        escapeCsvValue(event.status),
        escapeCsvValue(event.reason ?? ""),
        escapeCsvValue(metadataString(metadata, "gamePin")),
        escapeCsvValue(metadataNumber(metadata, "recipientCount")),
        escapeCsvValue(metadataNumber(metadata, "totalExp")),
        escapeCsvValue(metadataNumber(metadata, "linkedIdentityCount")),
        escapeCsvValue(metadataNumber(metadata, "nameFallbackCount")),
        escapeCsvValue(metadataNumber(metadata, "skippedPlayerCount")),
        escapeCsvValue(metadataNumber(metadata, "skippedAmbiguousNameCount")),
        escapeCsvValue(metadataNumber(metadata, "skippedInvalidStudentIdCount")),
        escapeCsvValue(metadataNumber(metadata, "skippedNoMatchCount")),
        escapeCsvValue(metadata.recipients ?? []),
        escapeCsvValue(metadata.skippedPlayers ?? []),
      ].join(",");
    }),
  ];

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="negamon-reward-audit.csv"',
      "Cache-Control": "no-store",
    },
  });
}
