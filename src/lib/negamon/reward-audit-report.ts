import type { AuditLogListItem } from "@/lib/security/audit-log";

export type NegamonRewardAuditEvent = {
  action: string;
  status: AuditLogListItem["status"];
  reason: string | null;
  targetId: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export type NegamonRewardAuditSummary = {
  eventCount: number;
  appliedEventCount: number;
  skippedEventCount: number;
  recipientCount: number;
  totalExp: number;
  linkedIdentityCount: number;
  nameFallbackCount: number;
  appliedLinkedIdentityCount: number;
  appliedNameFallbackCount: number;
  skippedPlayerCount: number;
  skippedDuplicateCount: number;
  skippedAmbiguousNameCount: number;
  skippedInvalidStudentIdCount: number;
  skippedNoMatchCount: number;
};

export type NegamonRewardAuditReport = {
  summary: NegamonRewardAuditSummary;
  events: NegamonRewardAuditEvent[];
};

const EMPTY_SUMMARY: NegamonRewardAuditSummary = {
  eventCount: 0,
  appliedEventCount: 0,
  skippedEventCount: 0,
  recipientCount: 0,
  totalExp: 0,
  linkedIdentityCount: 0,
  nameFallbackCount: 0,
  appliedLinkedIdentityCount: 0,
  appliedNameFallbackCount: 0,
  skippedPlayerCount: 0,
  skippedDuplicateCount: 0,
  skippedAmbiguousNameCount: 0,
  skippedInvalidStudentIdCount: 0,
  skippedNoMatchCount: 0,
};

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildNegamonRewardAuditReport(events: AuditLogListItem[]): NegamonRewardAuditReport {
  const summary = { ...EMPTY_SUMMARY };

  const mappedEvents = events.map((event) => {
    const metadata = event.metadata ?? {};
    summary.eventCount += 1;

    if (event.action === "classroom.negamon_battle.rewards_applied") {
      summary.appliedEventCount += 1;
    }

    if (event.action === "classroom.negamon_battle.rewards_skipped") {
      summary.skippedEventCount += 1;
    }

    summary.recipientCount += metadataNumber(metadata, "recipientCount");
    summary.totalExp += metadataNumber(metadata, "totalExp");
    summary.linkedIdentityCount += metadataNumber(metadata, "linkedIdentityCount");
    summary.nameFallbackCount += metadataNumber(metadata, "nameFallbackCount");
    summary.appliedLinkedIdentityCount += metadataNumber(metadata, "appliedLinkedIdentityCount");
    summary.appliedNameFallbackCount += metadataNumber(metadata, "appliedNameFallbackCount");
    summary.skippedPlayerCount += metadataNumber(metadata, "skippedPlayerCount");
    summary.skippedDuplicateCount += metadataNumber(metadata, "skippedDuplicateCount");
    summary.skippedAmbiguousNameCount += metadataNumber(metadata, "skippedAmbiguousNameCount");
    summary.skippedInvalidStudentIdCount += metadataNumber(metadata, "skippedInvalidStudentIdCount");
    summary.skippedNoMatchCount += metadataNumber(metadata, "skippedNoMatchCount");

    return {
      action: event.action,
      status: event.status,
      reason: event.reason ?? null,
      targetId: event.targetId ?? null,
      timestamp: event.timestamp.toISOString(),
      metadata,
    };
  });

  return {
    summary,
    events: mappedEvents,
  };
}
