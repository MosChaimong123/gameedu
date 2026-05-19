import { describe, expect, it } from "vitest";
import {
    ATTENDANCE_STATUSES,
    cycleAttendanceStatus,
    isAttendanceStatus,
} from "@/lib/attendance-status";

describe("attendance-status", () => {
    it("includes sick and leave in cycle order", () => {
        expect(ATTENDANCE_STATUSES).toEqual([
            "PRESENT",
            "ABSENT",
            "LEAVE",
            "SICK",
            "LATE",
            "LEFT_EARLY",
        ]);
    });

    it("cycles through all statuses", () => {
        let current = "PRESENT";
        for (let i = 0; i < ATTENDANCE_STATUSES.length; i++) {
            current = cycleAttendanceStatus(current);
        }
        expect(current).toBe("PRESENT");
    });

    it("rejects unknown status values", () => {
        expect(isAttendanceStatus("SICK")).toBe(true);
        expect(isAttendanceStatus("LEAVE")).toBe(true);
        expect(isAttendanceStatus("VACATION")).toBe(false);
    });
});
