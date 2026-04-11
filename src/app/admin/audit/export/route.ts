import { auth } from "@/auth";
import { FORBIDDEN_MESSAGE } from "@/lib/api-error";
import { listRecentAuditEvents } from "@/lib/security/audit-log";
import { NextResponse } from "next/server";

const allowedGroups = new Set(["", "admin.", "classroom.", "socket.", "upload."]);
const allowedDays = new Set(["1", "7", "30", "90"]);
const allowedStatuses = new Set(["", "success", "rejected", "error"]);
const allowedCategories = new Set(["", "admin", "classroom", "socket", "upload", "auth", "other"]);

function readQueryParam(value: string | null) {
  return value?.trim() ?? "";
}

function resolveDays(rawDays: string) {
  return allowedDays.has(rawDays) ? rawDays : "7";
}

function resolveActionGroup(rawGroup: string) {
  return allowedGroups.has(rawGroup) ? rawGroup : "";
}

function resolveStatus(rawStatus: string): "" | "success" | "rejected" | "error" {
  return allowedStatuses.has(rawStatus)
    ? (rawStatus as "" | "success" | "rejected" | "error")
    : "";
}

function resolveCategory(rawCategory: string): "" | "admin" | "classroom" | "socket" | "upload" | "auth" | "other" {
  return allowedCategories.has(rawCategory)
    ? (rawCategory as "" | "admin" | "classroom" | "socket" | "upload" | "auth" | "other")
    : "";
}

function buildSinceDate(days: string) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  return since;
}

function escapeCsvValue(value: unknown) {
  const text = typeof value === "string" ? sanitizeFormulaString(value) : JSON.stringify(sanitizeFormulaValue(value ?? ""));
  const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${sanitized.replace(/"/g, "\"\"")}"`;
}

function sanitizeFormulaString(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function sanitizeFormulaValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeFormulaString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFormulaValue(item));
  }

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

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: FORBIDDEN_MESSAGE } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = readQueryParam(searchParams.get("action"));
  const actor = readQueryParam(searchParams.get("actor"));
  const target = readQueryParam(searchParams.get("target"));
  const reason = readQueryParam(searchParams.get("reason"));
  const group = resolveActionGroup(readQueryParam(searchParams.get("group")));
  const category = resolveCategory(readQueryParam(searchParams.get("category")));
  const days = resolveDays(readQueryParam(searchParams.get("days")));
  const status = resolveStatus(readQueryParam(searchParams.get("status")));

  const events = await listRecentAuditEvents(500, {
    action,
    actorUserId: actor,
    targetId: target,
    reason,
    actionPrefix: group,
    category: category || undefined,
    status: status || undefined,
    since: buildSinceDate(days),
  });

  const rows = [
    ["timestamp", "action", "category", "status", "reason", "actorUserId", "targetType", "targetId", "metadata"].join(","),
    ...events.map((event) =>
      [
        escapeCsvValue(new Date(event.timestamp).toISOString()),
        escapeCsvValue(event.action),
        escapeCsvValue(event.category),
        escapeCsvValue(event.status),
        escapeCsvValue(event.reason ?? ""),
        escapeCsvValue(event.actorUserId ?? ""),
        escapeCsvValue(event.targetType),
        escapeCsvValue(event.targetId ?? ""),
        escapeCsvValue(event.metadata ?? {}),
      ].join(",")
    ),
  ];

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log-export.csv"',
      "Cache-Control": "no-store",
    },
  });
}
