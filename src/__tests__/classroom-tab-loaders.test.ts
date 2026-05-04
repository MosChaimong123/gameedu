import { describe, expect, it, vi } from "vitest";
import {
  loadAttendanceHistory,
  loadClassroomAnalytics,
} from "@/lib/classroom-tab-loaders";

const translations: Record<string, string> = {
  toastGenericError: "Something went wrong.",
  analyticsLoadFailed: "Could not load analytics.",
  errorNetworkUnavailable: "Network unavailable.",
  apiError_FORBIDDEN: "Forbidden",
};

const t = (key: string) => translations[key] ?? key;

describe("classroom tab loaders", () => {
  it("returns attendance records on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ records: [{ id: "record-1", studentId: "student-1", student: { name: "A", avatar: null }, status: "PRESENT", date: "2026-05-04" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await loadAttendanceHistory(fetchImpl, "class-1", "2026-05-04", t, "en");

    expect(result).toEqual({
      ok: true,
      records: [
        {
          id: "record-1",
          studentId: "student-1",
          student: { name: "A", avatar: null },
          status: "PRESENT",
          date: "2026-05-04",
        },
      ],
    });
  });

  it("surfaces localized attendance api errors instead of treating them as empty data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await loadAttendanceHistory(fetchImpl, "class-1", "2026-05-04", t, "en");

    expect(result).toEqual({
      ok: false,
      message: "Forbidden",
    });
  });

  it("maps attendance network failures to a readable error message", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await loadAttendanceHistory(fetchImpl, "class-1", "2026-05-04", t, "en");

    expect(result).toEqual({
      ok: false,
      message: "Network unavailable.",
    });
  });

  it("returns analytics data on success", async () => {
    const payload = {
      summary: [],
      growthData: [],
      skillDistribution: [],
      recentHistory: [],
      studentStats: [],
      attendanceSummary: [],
      achievementSummary: { total: 0, avgPerStudent: 0 },
      achievementDistribution: [],
      assignmentStats: [],
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await loadClassroomAnalytics(fetchImpl, "class-1", t, "en");

    expect(result).toEqual({
      ok: true,
      data: payload,
    });
  });

  it("surfaces localized analytics api errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await loadClassroomAnalytics(fetchImpl, "class-1", t, "en");

    expect(result).toEqual({
      ok: false,
      message: "Forbidden",
    });
  });

  it("falls back to analytics failure copy for non-network fetch exceptions", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("boom"));

    const result = await loadClassroomAnalytics(fetchImpl, "class-1", t, "en");

    expect(result).toEqual({
      ok: false,
      message: "Could not load analytics.",
    });
  });
});
