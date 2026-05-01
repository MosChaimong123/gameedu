import { describe, expect, it } from "vitest";
import { buildNegamonRewardAuditReport } from "@/lib/negamon/reward-audit-report";
import type { AuditLogListItem } from "@/lib/security/audit-log";

function makeEvent(event: Partial<AuditLogListItem>): AuditLogListItem {
  return {
    actorUserId: "teacher-1",
    action: "classroom.negamon_battle.rewards_applied",
    category: "classroom",
    reason: null,
    status: "success",
    targetType: "classroom",
    targetId: "class-1",
    metadata: {},
    timestamp: new Date("2026-04-30T00:00:00.000Z"),
    ...event,
  };
}

describe("buildNegamonRewardAuditReport", () => {
  it("summarizes applied and skipped Negamon reward sync audit events", () => {
    const report = buildNegamonRewardAuditReport([
      makeEvent({
        metadata: {
          recipientCount: 2,
          totalExp: 120,
          linkedIdentityCount: 1,
          nameFallbackCount: 1,
          appliedLinkedIdentityCount: 1,
          appliedNameFallbackCount: 1,
        },
      }),
      makeEvent({
        action: "classroom.negamon_battle.rewards_skipped",
        reason: "no_awards",
        metadata: {
          skippedPlayerCount: 3,
          skippedDuplicateCount: 1,
          skippedAmbiguousNameCount: 1,
          skippedInvalidStudentIdCount: 1,
          skippedNoMatchCount: 1,
        },
        timestamp: new Date("2026-04-30T01:00:00.000Z"),
      }),
    ]);

    expect(report.summary).toMatchObject({
      eventCount: 2,
      appliedEventCount: 1,
      skippedEventCount: 1,
      recipientCount: 2,
      totalExp: 120,
      linkedIdentityCount: 1,
      nameFallbackCount: 1,
      appliedLinkedIdentityCount: 1,
      appliedNameFallbackCount: 1,
      skippedPlayerCount: 3,
      skippedDuplicateCount: 1,
      skippedAmbiguousNameCount: 1,
      skippedInvalidStudentIdCount: 1,
      skippedNoMatchCount: 1,
    });
    expect(report.events[1]).toMatchObject({
      action: "classroom.negamon_battle.rewards_skipped",
      reason: "no_awards",
      timestamp: "2026-04-30T01:00:00.000Z",
    });
  });
});
