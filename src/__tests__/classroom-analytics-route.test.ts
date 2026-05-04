import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectAppErrorResponse } from "@/__tests__/utils/route-test-helpers";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
  },
}));

describe("classroom analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({
      students: [],
    });
  });

  it("queries only the fields needed to compute analytics", async () => {
    const route = await import("@/app/api/classrooms/[id]/analytics/route");
    const response = await route.GET({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: {
        assignments: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            checklists: true,
            maxScore: true,
            passScore: true,
            deadline: true,
            visible: true,
          },
        },
        students: {
          select: {
            id: true,
            name: true,
            nickname: true,
            behaviorPoints: true,
            attendance: true,
            submissions: {
              select: {
                assignmentId: true,
                score: true,
                submittedAt: true,
              },
            },
            history: {
              orderBy: { timestamp: "desc" },
              select: {
                id: true,
                reason: true,
                value: true,
                timestamp: true,
              },
            },
            achievements: {
              select: {
                achievementId: true,
              },
            },
          },
        },
      },
    });
  });

  it("returns a structured auth error when no session user exists", async () => {
    mockRequireSessionUser.mockResolvedValueOnce(null);
    const route = await import("@/app/api/classrooms/[id]/analytics/route");
    const response = await route.GET({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("returns not found when the classroom does not belong to the current teacher", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce(null);
    const route = await import("@/app/api/classrooms/[id]/analytics/route");
    const response = await route.GET({} as never, {
      params: Promise.resolve({ id: "class-missing" }),
    });

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });
});
