import type { AuditLogListItem } from "@/lib/security/audit-log";

export type NegamonRewardRemediationEvent = {
  action: string;
  status: AuditLogListItem["status"];
  targetId: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export type NegamonRewardRemediationSummary = {
  eventCount: number;
  studentCount: number;
  nameChangeCount: number;
  nicknameChangeCount: number;
  gamePinCount: number;
};

export type NegamonRewardRemediationReport = {
  summary: NegamonRewardRemediationSummary;
  events: NegamonRewardRemediationEvent[];
};

const EMPTY_SUMMARY: NegamonRewardRemediationSummary = {
  eventCount: 0,
  studentCount: 0,
  nameChangeCount: 0,
  nicknameChangeCount: 0,
  gamePinCount: 0,
};

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadataChanges(metadata: Record<string, unknown>) {
  const value = metadata.changes;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function buildNegamonRewardRemediationReport(
  events: AuditLogListItem[]
): NegamonRewardRemediationReport {
  const summary = { ...EMPTY_SUMMARY };
  const studentIds = new Set<string>();
  const gamePins = new Set<string>();

  const mappedEvents = events.map((event) => {
    const metadata = event.metadata ?? {};
    const changes = metadataChanges(metadata);
    summary.eventCount += 1;

    if (event.targetId) {
      studentIds.add(event.targetId);
    }

    if ("name" in changes) {
      summary.nameChangeCount += 1;
    }

    if ("nickname" in changes) {
      summary.nicknameChangeCount += 1;
    }

    const rewardGamePin = metadataString(metadata, "rewardGamePin");
    if (rewardGamePin) {
      gamePins.add(rewardGamePin);
    }

    return {
      action: event.action,
      status: event.status,
      targetId: event.targetId ?? null,
      timestamp: event.timestamp.toISOString(),
      metadata,
    };
  });

  summary.studentCount = studentIds.size;
  summary.gamePinCount = gamePins.size;

  return {
    summary,
    events: mappedEvents,
  };
}
