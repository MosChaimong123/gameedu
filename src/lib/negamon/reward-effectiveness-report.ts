import type { AuditLogListItem } from "@/lib/security/audit-log";

export type NegamonRewardEffectivenessGamePin = {
  gamePin: string;
  rewardEventCount: number;
  appliedEventCount: number;
  skippedEventCount: number;
  recipientCount: number;
  skippedPlayerCount: number;
  remediationEventCount: number;
  remediatedStudentCount: number;
  resolvedSkippedCount: number;
  unresolvedSkippedCount: number;
  latestRewardAt: string;
  latestRemediationAt: string | null;
};

export type NegamonRewardEffectivenessSummary = {
  gamePinCount: number;
  pinsWithSkips: number;
  pinsWithRemediation: number;
  pinsNeedingFollowUp: number;
  totalRecipients: number;
  totalSkippedPlayers: number;
  totalRemediationEvents: number;
};

export type NegamonRewardEffectivenessReport = {
  summary: NegamonRewardEffectivenessSummary;
  gamePins: NegamonRewardEffectivenessGamePin[];
};

const EMPTY_SUMMARY: NegamonRewardEffectivenessSummary = {
  gamePinCount: 0,
  pinsWithSkips: 0,
  pinsWithRemediation: 0,
  pinsNeedingFollowUp: 0,
  totalRecipients: 0,
  totalSkippedPlayers: 0,
  totalRemediationEvents: 0,
};

type EffectivenessAccumulator = {
  gamePin: string;
  rewardEventCount: number;
  appliedEventCount: number;
  skippedEventCount: number;
  recipientCount: number;
  skippedPlayerCount: number;
  remediationEventCount: number;
  remediatedStudentIds: Set<string>;
  latestRewardAtMs: number;
  latestRemediationAtMs: number | null;
};

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getOrCreateAccumulator(
  byGamePin: Map<string, EffectivenessAccumulator>,
  gamePin: string
) {
  const existing = byGamePin.get(gamePin);
  if (existing) {
    return existing;
  }

  const created: EffectivenessAccumulator = {
    gamePin,
    rewardEventCount: 0,
    appliedEventCount: 0,
    skippedEventCount: 0,
    recipientCount: 0,
    skippedPlayerCount: 0,
    remediationEventCount: 0,
    remediatedStudentIds: new Set<string>(),
    latestRewardAtMs: 0,
    latestRemediationAtMs: null,
  };
  byGamePin.set(gamePin, created);
  return created;
}

export function buildNegamonRewardEffectivenessReport(args: {
  rewardEvents: AuditLogListItem[];
  remediationEvents: AuditLogListItem[];
}): NegamonRewardEffectivenessReport {
  const summary = { ...EMPTY_SUMMARY };
  const byGamePin = new Map<string, EffectivenessAccumulator>();

  for (const event of args.rewardEvents) {
    const gamePin = metadataString(event.metadata, "gamePin");
    if (!gamePin) {
      continue;
    }

    const bucket = getOrCreateAccumulator(byGamePin, gamePin);
    bucket.rewardEventCount += 1;
    bucket.recipientCount += metadataNumber(event.metadata, "recipientCount");
    bucket.skippedPlayerCount += metadataNumber(event.metadata, "skippedPlayerCount");
    bucket.latestRewardAtMs = Math.max(bucket.latestRewardAtMs, event.timestamp.getTime());

    if (event.action === "classroom.negamon_battle.rewards_applied") {
      bucket.appliedEventCount += 1;
    }

    if (event.action === "classroom.negamon_battle.rewards_skipped") {
      bucket.skippedEventCount += 1;
    }
  }

  for (const event of args.remediationEvents) {
    const gamePin = metadataString(event.metadata, "rewardGamePin");
    if (!gamePin) {
      continue;
    }

    const bucket = getOrCreateAccumulator(byGamePin, gamePin);
    bucket.remediationEventCount += 1;
    if (event.targetId) {
      bucket.remediatedStudentIds.add(event.targetId);
    }
    const eventTime = event.timestamp.getTime();
    bucket.latestRemediationAtMs = Math.max(bucket.latestRemediationAtMs ?? 0, eventTime);
  }

  const gamePins = Array.from(byGamePin.values())
    .map((bucket) => ({
      gamePin: bucket.gamePin,
      rewardEventCount: bucket.rewardEventCount,
      appliedEventCount: bucket.appliedEventCount,
      skippedEventCount: bucket.skippedEventCount,
      recipientCount: bucket.recipientCount,
      skippedPlayerCount: bucket.skippedPlayerCount,
      remediationEventCount: bucket.remediationEventCount,
      remediatedStudentCount: bucket.remediatedStudentIds.size,
      resolvedSkippedCount: Math.min(bucket.remediatedStudentIds.size, bucket.skippedPlayerCount),
      unresolvedSkippedCount: Math.max(0, bucket.skippedPlayerCount - bucket.remediatedStudentIds.size),
      latestRewardAt: new Date(bucket.latestRewardAtMs).toISOString(),
      latestRemediationAt:
        bucket.latestRemediationAtMs !== null
          ? new Date(bucket.latestRemediationAtMs).toISOString()
          : null,
    }))
    .sort((a, b) => {
      const aLatest = Math.max(
        Date.parse(a.latestRewardAt),
        a.latestRemediationAt ? Date.parse(a.latestRemediationAt) : 0
      );
      const bLatest = Math.max(
        Date.parse(b.latestRewardAt),
        b.latestRemediationAt ? Date.parse(b.latestRemediationAt) : 0
      );
      return bLatest - aLatest;
    });

  summary.gamePinCount = gamePins.length;
  for (const gamePin of gamePins) {
    summary.totalRecipients += gamePin.recipientCount;
    summary.totalSkippedPlayers += gamePin.skippedPlayerCount;
    summary.totalRemediationEvents += gamePin.remediationEventCount;
    if (gamePin.skippedPlayerCount > 0) {
      summary.pinsWithSkips += 1;
      if (gamePin.remediationEventCount === 0) {
        summary.pinsNeedingFollowUp += 1;
      }
    }
    if (gamePin.remediationEventCount > 0) {
      summary.pinsWithRemediation += 1;
    }
  }

  return {
    summary,
    gamePins,
  };
}
