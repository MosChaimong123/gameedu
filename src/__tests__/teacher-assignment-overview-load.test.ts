import { describe, expect, it, vi } from "vitest";
import { loadTeacherAssignmentOverview } from "@/components/dashboard/use-teacher-assignment-overview";

const FALLBACK = "fallback-load-error";

function mockJsonResponse(status: number, body: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response;
}

describe("loadTeacherAssignmentOverview", () => {
    it("returns data on HTTP 200", async () => {
        const payload = {
            generatedAt: "2026-01-01T00:00:00.000Z",
            rangeDays: 14 as const,
            classId: null,
            totals: {
                visibleAssignmentCount: 1,
                overdueAssignmentCount: 0,
                dueWithinRangeCount: 0,
                missingSubmissionSlots: 0,
            },
            classrooms: [],
            items: [],
        };
        const fetchImpl = vi.fn().mockResolvedValue(mockJsonResponse(200, payload));

        const result = await loadTeacherAssignmentOverview(14, FALLBACK, { fetchImpl });

        expect(result).toEqual({ ok: true, data: payload });
        expect(fetchImpl).toHaveBeenCalledWith(
            "/api/teacher/assignments/overview?range=14d",
            expect.objectContaining({ cache: "no-store" })
        );
    });

    it("uses API error message when present on failure", async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValue(
                mockJsonResponse(403, { error: { code: "FORBIDDEN", message: "No access" } })
            );

        const result = await loadTeacherAssignmentOverview(7, FALLBACK, { fetchImpl });

        expect(result).toEqual({ ok: false, error: "No access" });
        expect(fetchImpl).toHaveBeenCalledWith(
            "/api/teacher/assignments/overview?range=7d",
            expect.objectContaining({ cache: "no-store" })
        );
    });

    it("falls back when response is not ok and body has no message", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(mockJsonResponse(500, { error: { code: "INTERNAL_ERROR" } }));

        const result = await loadTeacherAssignmentOverview(30, FALLBACK, { fetchImpl });

        expect(result).toEqual({ ok: false, error: FALLBACK });
    });

    it("returns fallback when fetch throws", async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));

        const result = await loadTeacherAssignmentOverview(14, FALLBACK, { fetchImpl });

        expect(result).toEqual({ ok: false, error: FALLBACK });
    });

    it("returns fallback when JSON parse path fails (invalid json)", async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => {
                throw new Error("bad json");
            },
        } as unknown as Response);

        const result = await loadTeacherAssignmentOverview(14, FALLBACK, { fetchImpl });

        expect(result).toEqual({ ok: false, error: FALLBACK });
    });

    it("returns aborted when fetch rejects with AbortError", async () => {
        const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error("Aborted"), { name: "AbortError" }));

        const result = await loadTeacherAssignmentOverview(14, FALLBACK, { fetchImpl });

        expect(result).toEqual({ aborted: true });
    });

    it("returns aborted when signal is already aborted", async () => {
        const ac = new AbortController();
        ac.abort();
        const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error("Aborted"), { name: "AbortError" }));

        const result = await loadTeacherAssignmentOverview(14, FALLBACK, {
            signal: ac.signal,
            fetchImpl,
        });

        expect(result).toEqual({ aborted: true });
    });

    it("forwards AbortSignal to fetch", async () => {
        const ac = new AbortController();
        const fetchImpl = vi.fn().mockResolvedValue(mockJsonResponse(200, { classrooms: [] }));

        await loadTeacherAssignmentOverview(14, FALLBACK, {
            signal: ac.signal,
            fetchImpl,
        });

        expect(fetchImpl).toHaveBeenCalledWith(
            "/api/teacher/assignments/overview?range=14d",
            expect.objectContaining({
                cache: "no-store",
                signal: ac.signal,
            })
        );
    });
});
