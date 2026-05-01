import { describe, expect, it } from "vitest";
import { buildNegamonRewardEffectivenessReport } from "@/lib/negamon/reward-effectiveness-report";
import type { AuditLogListItem } from "@/lib/security/audit-log";

function makeRewardEvent(event: Partial<AuditLogListItem>): AuditLogListItem {
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

function makeRemediationEvent(event: Partial<AuditLogListItem>): AuditLogListItem {
  return {
    actorUserId: "teacher-1",
    action: "classroom.student.profile_updated",
    category: "classroom",
    reason: null,
    status: "success",
    targetType: "student",
    targetId: "student-1",
    metadata: {},
    timestamp: new Date("2026-04-30T00:00:00.000Z"),
    ...event,
  };
}

describe("buildNegamonRewardEffectivenessReport", () => {
  it("correlates reward audit activity with remediation by game pin", () => {
    const report = buildNegamonRewardEffectivenessReport({
      rewardEvents: [
        makeRewardEvent({
          metadata: {
            gamePin: "123456",
            recipientCount: 2,
            skippedPlayerCount: 1,
          },
          timestamp: new Date("2026-04-30T00:00:00.000Z"),
        }),
        makeRewardEvent({
          action: "classroom.negamon_battle.rewards_skipped",
          metadata: {
            gamePin: "123456",
            skippedPlayerCount: 2,
          },
          timestamp: new Date("2026-04-30T01:00:00.000Z"),
        }),
        makeRewardEvent({
          metadata: {
            gamePin: "999999",
            recipientCount: 1,
          },
          timestamp: new Date("2026-04-30T02:00:00.000Z"),
        }),
      ],
      remediationEvents: [
        makeRemediationEvent({
          metadata: {
            source: "negamon_reward_audit",
            classroomId: "class-1",
            rewardGamePin: "123456",
          },
          targetId: "student-1",
          timestamp: new Date("2026-04-30T03:00:00.000Z"),
        }),
        makeRemediationEvent({
          metadata: {
            source: "negamon_reward_audit",
            classroomId: "class-1",
            rewardGamePin: "123456",
          },
          targetId: "student-2",
          timestamp: new Date("2026-04-30T04:00:00.000Z"),
        }),
      ],
    });

    expect(report.summary).toMatchObject({
      gamePinCount: 2,
      pinsWithSkips: 1,
      pinsWithRemediation: 1,
      pinsNeedingFollowUp: 0,
      totalRecipients: 3,
      totalSkippedPlayers: 3,
      totalRemediationEvents: 2,
    });
    expect(report.gamePins[0]).toMatchObject({
      gamePin: "123456",
      rewardEventCount: 2,
      appliedEventCount: 1,
      skippedEventCount: 1,
      recipientCount: 2,
      skippedPlayerCount: 3,
      remediationEventCount: 2,
      remediatedStudentCount: 2,
      resolvedSkippedCount: 2,
      unresolvedSkippedCount: 1,
      latestRewardAt: "2026-04-30T01:00:00.000Z",
      latestRemediationAt: "2026-04-30T04:00:00.000Z",
    });
  });

  it("flags pins with skips but no remediation for follow-up", () => {
    const report = buildNegamonRewardEffectivenessReport({
      rewardEvents: [
        makeRewardEvent({
          action: "classroom.negamon_battle.rewards_skipped",
          metadata: {
            gamePin: "555555",
            skippedPlayerCount: 4,
          },
        }),
      ],
      remediationEvents: [],
    });

    expect(report.summary).toMatchObject({
      gamePinCount: 1,
      pinsWithSkips: 1,
      pinsWithRemediation: 0,
      pinsNeedingFollowUp: 1,
      totalSkippedPlayers: 4,
    });
    expect(report.gamePins[0]).toMatchObject({
      gamePin: "555555",
      remediationEventCount: 0,
      remediatedStudentCount: 0,
      resolvedSkippedCount: 0,
      unresolvedSkippedCount: 4,
      latestRemediationAt: null,
    });
  });
});
