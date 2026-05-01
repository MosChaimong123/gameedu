import { describe, expect, it } from "vitest";
import { buildNegamonRewardRemediationReport } from "@/lib/negamon/reward-remediation-report";
import type { AuditLogListItem } from "@/lib/security/audit-log";

function makeEvent(event: Partial<AuditLogListItem>): AuditLogListItem {
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

describe("buildNegamonRewardRemediationReport", () => {
  it("summarizes remediation audit events from reward audit flows", () => {
    const report = buildNegamonRewardRemediationReport([
      makeEvent({
        metadata: {
          source: "negamon_reward_audit",
          rewardGamePin: "123456",
          changes: {
            name: { before: "Alice", after: "Alice Prime" },
            nickname: { before: "Ali", after: "Ace" },
          },
        },
      }),
      makeEvent({
        targetId: "student-2",
        timestamp: new Date("2026-04-30T01:00:00.000Z"),
        metadata: {
          source: "negamon_reward_audit",
          rewardGamePin: "999999",
          changes: {
            nickname: { before: null, after: "Bee" },
          },
        },
      }),
    ]);

    expect(report.summary).toMatchObject({
      eventCount: 2,
      studentCount: 2,
      nameChangeCount: 1,
      nicknameChangeCount: 2,
      gamePinCount: 2,
    });
    expect(report.events[1]).toMatchObject({
      targetId: "student-2",
      timestamp: "2026-04-30T01:00:00.000Z",
    });
  });
});
