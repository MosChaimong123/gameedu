export type AuditLogEvent = {
  actorUserId?: string | null;
  action: string;
  category?: "admin" | "classroom" | "socket" | "upload" | "auth" | "other";
  reason?: string | null;
  status?: "success" | "rejected" | "error";
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

import { resolveAuditLogSink } from "@/lib/env";
import { getAuditLogCollection } from "@/lib/ops/mongo-admin";

export type AuditLogListItem = {
  actorUserId?: string | null;
  action: string;
  category: "admin" | "classroom" | "socket" | "upload" | "auth" | "other";
  reason?: string | null;
  status: "success" | "rejected" | "error";
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
};

export type AuditLogFilters = {
  action?: string;
  actorUserId?: string;
  targetId?: string;
  actionPrefix?: string;
  category?: "admin" | "classroom" | "socket" | "upload" | "auth" | "other";
  reason?: string;
  status?: "success" | "rejected" | "error";
  since?: Date;
};

function inferAuditCategory(action: string): "admin" | "classroom" | "socket" | "upload" | "auth" | "other" {
  if (action.startsWith("admin.")) return "admin";
  if (action.startsWith("classroom.")) return "classroom";
  if (action.startsWith("socket.")) return "socket";
  if (action.startsWith("upload.")) return "upload";
  if (action.startsWith("auth.")) return "auth";
  return "other";
}

function inferAuditReason(event: AuditLogEvent) {
  if (typeof event.reason === "string" && event.reason.trim()) {
    return event.reason.trim();
  }

  const metadataReason = event.metadata?.reason;
  if (typeof metadataReason === "string" && metadataReason.trim()) {
    return metadataReason.trim();
  }

  const metadataCode = event.metadata?.code;
  if (typeof metadataCode === "string" && metadataCode.trim()) {
    return metadataCode.trim();
  }

  return null;
}

export function logAuditEvent(event: AuditLogEvent) {
  const payload = {
    timestamp: new Date(),
    category: event.category ?? inferAuditCategory(event.action),
    reason: inferAuditReason(event),
    status: event.status ?? "success",
    ...event,
  };
  const sink = resolveAuditLogSink();

  if (sink === "console" || sink === "both") {
    console.info("[AUDIT]", JSON.stringify(payload));
  }

  if (sink === "mongo" || sink === "both") {
    void getAuditLogCollection()
      .then((collection) => collection.insertOne(payload))
      .catch((error) => {
        console.error("[AUDIT_LOG_WRITE_FAILED]", error);
      });
  }
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listRecentAuditEvents(
  limit = 50,
  filters: AuditLogFilters = {}
): Promise<AuditLogListItem[]> {
  const collection = await getAuditLogCollection();
  const normalizedLimit = Math.max(1, Math.min(limit, 200));
  const query = buildAuditLogQuery(filters);

  const events = await collection
    .find(
      query,
      {
        projection: {
          _id: 0,
          actorUserId: 1,
          action: 1,
          category: 1,
          reason: 1,
          status: 1,
          targetType: 1,
          targetId: 1,
          metadata: 1,
          timestamp: 1,
        },
      }
    )
    .sort({ timestamp: -1 })
    .limit(normalizedLimit)
    .toArray();

  return events.map((event) => ({
    actorUserId: event.actorUserId ?? null,
    action: event.action,
    category: event.category ?? inferAuditCategory(event.action),
    reason: typeof event.reason === "string" ? event.reason : null,
    status: event.status === "rejected" || event.status === "error" ? event.status : "success",
    targetType: event.targetType,
    targetId: event.targetId ?? null,
    metadata: event.metadata,
    timestamp: new Date(event.timestamp),
  }));
}

export function buildAuditLogQuery(filters: AuditLogFilters): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];

  if (filters.action?.trim()) {
    clauses.push({
      action: { $regex: escapeRegex(filters.action.trim()), $options: "i" },
    });
  }

  if (filters.actionPrefix?.trim()) {
    clauses.push({
      action: { $regex: `^${escapeRegex(filters.actionPrefix.trim())}`, $options: "i" },
    });
  }

  if (filters.actorUserId?.trim()) {
    clauses.push({
      actorUserId: { $regex: escapeRegex(filters.actorUserId.trim()), $options: "i" },
    });
  }

  if (filters.targetId?.trim()) {
    clauses.push({
      targetId: { $regex: escapeRegex(filters.targetId.trim()), $options: "i" },
    });
  }

  if (filters.status) {
    clauses.push({ status: filters.status });
  }

  if (filters.reason?.trim()) {
    clauses.push({
      reason: { $regex: escapeRegex(filters.reason.trim()), $options: "i" },
    });
  }

  if (filters.category) {
    if (filters.category === "other") {
      clauses.push({
        action: {
          $not: /^(admin|classroom|socket|upload|auth)\./i,
        },
      });
    } else {
      clauses.push({
        action: { $regex: `^${escapeRegex(filters.category)}\\.`, $options: "i" },
      });
    }
  }

  if (filters.since) {
    clauses.push({ timestamp: { $gte: filters.since } });
  }

  if (clauses.length === 0) {
    return {};
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { $and: clauses };
}
