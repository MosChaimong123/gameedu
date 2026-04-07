import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockGetClassroomGamificationRecord = vi.fn();
const mockUpdateGamificationSettings = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentAchievementCreate = vi.fn();
const mockStudentUpdate = vi.fn();
const mockPointHistoryCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: mockStudentFindUnique,
      update: mockStudentUpdate,
    },
    studentAchievement: {
      create: mockStudentAchievementCreate,
    },
    pointHistory: {
      create: mockPointHistoryCreate,
    },
  },
}));

vi.mock("@/lib/services/classroom-settings/gamification-settings", () => ({
  getClassroomGamificationRecord: mockGetClassroomGamificationRecord,
  updateGamificationSettings: mockUpdateGamificationSettings,
  getCustomAchievementsFromGamification: (settings: { customAchievements?: unknown[] } | null | undefined) =>
    settings?.customAchievements ?? [],
}));

describe("classroom gamification authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
  });

  it("blocks custom achievement creation for users who do not own the classroom", async () => {
    mockGetClassroomGamificationRecord.mockResolvedValue({
      teacherId: "teacher-2",
      gamifiedSettings: {},
    });

    const { POST } = await import("@/app/api/classrooms/[id]/custom-achievements/route");
    const response = await POST(
      makeJsonRequest({
        name: "Bravery",
        description: "For courage",
        icon: "star",
        goldReward: 100,
      }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockUpdateGamificationSettings).not.toHaveBeenCalled();
  });

  it("blocks event deletion for users who do not own the classroom", async () => {
    mockGetClassroomGamificationRecord.mockResolvedValue({
      teacherId: "teacher-2",
      gamifiedSettings: { events: [{ id: "event-1" }] },
    });

    const { DELETE } = await import("@/app/api/classrooms/[id]/events/route");
    const response = await DELETE(
      makeJsonRequest({ eventId: "event-1" }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockUpdateGamificationSettings).not.toHaveBeenCalled();
  });

  it("prevents awarding a custom achievement to a student outside the target classroom", async () => {
    mockGetClassroomGamificationRecord.mockResolvedValue({
      teacherId: "teacher-1",
      gamifiedSettings: {
        customAchievements: [
          { id: "ach-1", name: "Star", icon: "star", goldReward: 50 },
        ],
      },
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-2",
      classId: "other-class",
      achievements: [],
    });

    const { POST } = await import("@/app/api/classrooms/[id]/custom-achievements/award/route");
    const response = await POST(
      makeJsonRequest({ achievementId: "ach-1", studentId: "student-2" }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Student not found in classroom",
    });
    expect(mockStudentAchievementCreate).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockPointHistoryCreate).not.toHaveBeenCalled();
  });
});
