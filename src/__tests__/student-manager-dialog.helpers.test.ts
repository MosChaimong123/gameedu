import { describe, expect, it } from "vitest";
import {
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
});
