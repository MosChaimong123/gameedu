import { describe, expect, it } from "vitest";

import { buildAuditLogQuery } from "@/lib/security/audit-log";

describe("buildAuditLogQuery", () => {
  it("combines action, prefix, category, and status filters without overwriting them", () => {
    const since = new Date("2026-04-04T00:00:00.000Z");

    const query = buildAuditLogQuery({
      action: "auth.register.denied",
      actionPrefix: "auth.",
      category: "auth",
      status: "rejected",
      since,
    });

    expect(query).toEqual({
      $and: [
        {
          action: { $regex: "auth\\.register\\.denied", $options: "i" },
        },
        {
          action: { $regex: "^auth\\.", $options: "i" },
        },
        {
          status: "rejected",
        },
        {
          action: { $regex: "^auth\\.", $options: "i" },
        },
        {
          timestamp: { $gte: since },
        },
      ],
    });
  });

  it("keeps other-category filtering compatible with additional filters", () => {
    const query = buildAuditLogQuery({
      actorUserId: "admin-1",
      category: "other",
    });

    expect(query).toEqual({
      $and: [
        {
          actorUserId: { $regex: "admin-1", $options: "i" },
        },
        {
          action: {
            $not: /^(admin|classroom|socket|upload|auth)\./i,
          },
        },
      ],
    });
  });
});
