import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClassroomDashboardForTeacher } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";

const { mockClassroomFindUnique } = vi.hoisted(() => ({
  mockClassroomFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
  },
}));

describe("classroom dashboard access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found when the classroom does not exist", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce(null);

    const result = await getClassroomDashboardForTeacher("class-missing", "teacher-1");

    expect(result).toEqual({ status: "not_found" });
    expect(mockClassroomFindUnique).toHaveBeenCalledTimes(1);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-missing" },
      select: { teacherId: true },
    });
  });

  it("returns forbidden without loading the full dashboard payload for another teacher", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce({ teacherId: "teacher-2" });

    const result = await getClassroomDashboardForTeacher("class-1", "teacher-1");

    expect(result).toEqual({ status: "forbidden" });
    expect(mockClassroomFindUnique).toHaveBeenCalledTimes(1);
  });

  it("loads the dashboard payload only after ownership is confirmed", async () => {
    mockClassroomFindUnique
      .mockResolvedValueOnce({ teacherId: "teacher-1" })
      .mockResolvedValueOnce({
        id: "class-1",
        teacherId: "teacher-1",
        name: "Class 1",
        emoji: null,
        image: null,
        theme: null,
        grade: null,
        gamifiedSettings: null,
        levelConfig: null,
        quizReviewMode: null,
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
        updatedAt: new Date("2026-04-02T00:00:00.000Z"),
        students: [],
        skills: [],
        assignments: [],
      });

    const result = await getClassroomDashboardForTeacher("class-1", "teacher-1");

    expect(result).toMatchObject({
      status: "ok",
      classroom: {
        id: "class-1",
        teacherId: "teacher-1",
        students: [],
      },
    });
    expect(mockClassroomFindUnique).toHaveBeenNthCalledWith(1, {
      where: { id: "class-1" },
      select: { teacherId: true },
    });
    expect(mockClassroomFindUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: "class-1" },
    }));
  });
});
