import { describe, expect, it, vi } from "vitest";
import {
    commitStudentManagerRosterOrder,
    moveStudentManagerRosterStudent,
    removeStudentManagerRosterStudent,
    sortStudentManagerRoster,
    updateStudentManagerRosterStudent,
} from "@/components/classroom/student-manager-dialog.helpers";

const roster = [
    { id: "student-2", order: 2, name: "Bravo", nickname: "B" },
    { id: "student-1", order: 1, name: "Alpha", nickname: null },
    { id: "student-3", order: 3, name: "Charlie", nickname: "C" },
];

describe("student manager roster helpers", () => {
    it("sorts roster rows by ascending order", () => {
        expect(sortStudentManagerRoster(roster).map((student) => student.id)).toEqual([
            "student-1",
            "student-2",
            "student-3",
        ]);
    });

    it("updates the targeted student without disturbing roster ordering", () => {
        expect(
            updateStudentManagerRosterStudent(roster, "student-2", {
                name: "Bravo Prime",
                nickname: "BP",
            })
        ).toEqual([
            { id: "student-1", order: 1, name: "Alpha", nickname: null },
            { id: "student-2", order: 2, name: "Bravo Prime", nickname: "BP" },
            { id: "student-3", order: 3, name: "Charlie", nickname: "C" },
        ]);
    });

    it("removes the targeted student and keeps the remaining roster stable", () => {
        expect(removeStudentManagerRosterStudent(roster, "student-2")).toEqual([
            { id: "student-1", order: 1, name: "Alpha", nickname: null },
            { id: "student-3", order: 3, name: "Charlie", nickname: "C" },
        ]);
    });

    it("moves a student up and reindexes the saved order", () => {
        expect(moveStudentManagerRosterStudent(roster, "student-2", "up")).toEqual([
            { id: "student-2", order: 0, name: "Bravo", nickname: "B" },
            { id: "student-1", order: 1, name: "Alpha", nickname: null },
            { id: "student-3", order: 2, name: "Charlie", nickname: "C" },
        ]);
    });

    it("leaves the roster unchanged when moving past the boundary", () => {
        expect(moveStudentManagerRosterStudent(roster, "student-1", "up")).toEqual([
            { id: "student-1", order: 1, name: "Alpha", nickname: null },
            { id: "student-2", order: 2, name: "Bravo", nickname: "B" },
            { id: "student-3", order: 3, name: "Charlie", nickname: "C" },
        ]);
    });

    it("keeps the reordered roster when persistence succeeds", async () => {
        const reordered = moveStudentManagerRosterStudent(roster, "student-2", "up");
        const persist = vi.fn().mockResolvedValue(undefined);

        await expect(
            commitStudentManagerRosterOrder(roster, reordered, persist)
        ).resolves.toEqual({
            committed: true,
            nextStudents: reordered,
            error: null,
        });
        expect(persist).toHaveBeenCalledWith(reordered);
    });

    it("rolls back to the previous roster when persistence fails", async () => {
        const reordered = moveStudentManagerRosterStudent(roster, "student-2", "up");
        const error = new Error("AUTH_REQUIRED");
        const persist = vi.fn().mockRejectedValue(error);

        await expect(
            commitStudentManagerRosterOrder(roster, reordered, persist)
        ).resolves.toEqual({
            committed: false,
            nextStudents: roster,
            error,
        });
        expect(persist).toHaveBeenCalledWith(reordered);
    });
});
