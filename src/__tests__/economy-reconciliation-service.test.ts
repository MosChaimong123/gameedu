import { describe, expect, it } from "vitest";
import { buildEconomyReconciliationReport } from "@/lib/services/student-economy/economy-reconciliation";

describe("buildEconomyReconciliationReport", () => {
  it("reports transaction math mismatches separately from current balance mismatches", () => {
    const report = buildEconomyReconciliationReport(
      [{ id: "student-1", name: "Alice", gold: 15 }],
      [
        {
          id: "tx-bad",
          studentId: "student-1",
          type: "earn",
          source: "quest",
          amount: 5,
          balanceBefore: 10,
          balanceAfter: 20,
          idempotencyKey: "quest:student-1:bad",
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
        },
      ],
      new Date("2026-05-04T00:00:00.000Z")
    );

    expect(report.summary).toMatchObject({
      studentCount: 1,
      mismatchCount: 1,
      issueCount: 2,
      byIssueType: expect.objectContaining({
        transaction_balance_mismatch: 1,
        current_balance_mismatch: 1,
      }),
    });
    expect(report.students[0]).toMatchObject({
      studentId: "student-1",
      status: "mismatch",
      issues: expect.arrayContaining([
        expect.objectContaining({
          type: "transaction_balance_mismatch",
          transactionId: "tx-bad",
          expected: 15,
          actual: 20,
        }),
        expect.objectContaining({
          type: "current_balance_mismatch",
          expected: 20,
          actual: 15,
        }),
      ]),
    });
  });
});
