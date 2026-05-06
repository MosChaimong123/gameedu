import { describe, expect, it } from "vitest";
import {
  filterSelectedStudentIdsForRoster,
  parseSavedGroupRecord,
  parseSavedGroupStudentIds,
  normalizeSavedGroupsForRoster,
  resolveActiveGroupFilter,
} from "@/components/classroom/use-classroom-selection-flow";

describe("classroom selection flow helpers", () => {
  it("drops removed students from saved groups and removes empty groups", () => {
    const result = normalizeSavedGroupsForRoster(
      [
        {
          id: "group-1",
          name: "Team A",
          studentIds: ["student-1", "student-2"],
        },
        {
          id: "group-2",
          name: "Team B",
          studentIds: ["student-3"],
        },
      ],
      ["student-2", "student-4"]
    );

    expect(result).toEqual([
      {
        id: "group-1",
        name: "Team A",
        studentIds: ["student-2"],
      },
    ]);
  });

  it("preserves groups that still map cleanly to the current roster", () => {
    const result = normalizeSavedGroupsForRoster(
      [
        {
          id: "group-1",
          name: "Team A",
          studentIds: ["student-1", "student-2"],
        },
      ],
      ["student-1", "student-2", "student-3"]
    );

    expect(result).toEqual([
      {
        id: "group-1",
        name: "Team A",
        studentIds: ["student-1", "student-2"],
      },
    ]);
  });

  it("parses raw student ids without dropping them", () => {
    expect(
      parseSavedGroupStudentIds(["student-1", "student-2"])
    ).toEqual(["student-1", "student-2"]);
  });

  it("parses a saved-group API record with raw student ids", () => {
    expect(
      parseSavedGroupRecord({
        id: "group-1",
        name: "Team A",
        studentIds: ["student-1", "student-2"],
      })
    ).toEqual({
      id: "group-1",
      name: "Team A",
      studentIds: ["student-1", "student-2"],
    });
  });

  it("returns the same selected-student array when the roster filter changes nothing", () => {
    const selected = ["student-1", "student-2"];
    const result = filterSelectedStudentIdsForRoster(selected, [
      "student-1",
      "student-2",
      "student-3",
    ]);

    expect(result).toBe(selected);
  });

  it("drops selected students that are no longer in the roster", () => {
    expect(
      filterSelectedStudentIdsForRoster(
        ["student-1", "student-2", "student-3"],
        ["student-2", "student-4"]
      )
    ).toEqual(["student-2"]);
  });

  it("falls back to the all filter when the saved group no longer exists", () => {
    expect(
      resolveActiveGroupFilter("group-2", [
        { id: "group-1", name: "Team A", studentIds: ["student-1"] },
      ])
    ).toBe("all");
  });
});
