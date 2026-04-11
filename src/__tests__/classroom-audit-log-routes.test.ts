import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLogAuditEvent = vi.fn();

const mockClassroomFindUnique = vi.fn();
const mockClassroomUpdate = vi.fn();
const mockClassroomCreate = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockStudentUpdate = vi.fn();
const mockStudentAchievementCreate = vi.fn();
const mockPointHistoryCreate = vi.fn();
const mockAssignmentSubmissionDeleteMany = vi.fn();
const mockStudentUpdateMany = vi.fn();
const mockPointHistoryDeleteMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/prisma-json", () => ({
  toPrismaJson: <T,>(value: T) => value,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
      update: mockClassroomUpdate,
      create: mockClassroomCreate,
    },
    student: {
      findUnique: mockStudentFindUnique,
      findMany: mockStudentFindMany,
      update: mockStudentUpdate,
      updateMany: mockStudentUpdateMany,
    },
    studentAchievement: {
      create: mockStudentAchievementCreate,
    },
    pointHistory: {
      create: mockPointHistoryCreate,
      deleteMany: mockPointHistoryDeleteMany,
    },
    assignmentSubmission: {
      deleteMany: mockAssignmentSubmissionDeleteMany,
    },
    $transaction: mockTransaction,
  },
}));

describe("classroom privileged routes audit logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "teacher-1",
      },
    });
    mockClassroomUpdate.mockResolvedValue({});
    mockStudentAchievementCreate.mockResolvedValue({});
    mockStudentUpdate.mockResolvedValue({});
    mockPointHistoryCreate.mockResolvedValue({});
    mockClassroomCreate.mockResolvedValue({
      id: "class-copy-1",
      name: "Math Class (Copy)",
      skills: [],
      assignments: [],
    });
    mockStudentFindMany.mockResolvedValue([{ id: "student-1" }, { id: "student-2" }]);
    mockPointHistoryDeleteMany.mockReturnValue({ count: 5 });
    mockAssignmentSubmissionDeleteMany.mockReturnValue({ count: 2 });
    mockStudentUpdateMany.mockReturnValue({ count: 2 });
    mockTransaction.mockResolvedValue([{ count: 5 }, { count: 2 }, { count: 2 }]);
  });

  it("logs when creating a custom achievement", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      teacherId: "teacher-1",
      gamifiedSettings: { customAchievements: [] },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/custom-achievements/route");
    const response = await POST(
      {
        json: async () => ({
          name: "Helper",
          description: "Supports others",
          icon: "star",
          goldReward: 50,
        }),
      } as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "teacher-1",
        action: "classroom.custom_achievement.created",
        targetType: "classroom",
        targetId: "class-1",
        metadata: expect.objectContaining({
          achievementName: "Helper",
          goldReward: 50,
        }),
      })
    );
  });

  it("logs when awarding a custom achievement", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      teacherId: "teacher-1",
      gamifiedSettings: {
        customAchievements: [
          { id: "ach-1", name: "Helper", icon: "star", goldReward: 25 },
        ],
      },
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      achievements: [],
    });

    const { POST } = await import("@/app/api/classrooms/[id]/custom-achievements/award/route");
    const response = await POST(
      {
        json: async () => ({
          achievementId: "ach-1",
          studentId: "student-1",
        }),
      } as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "teacher-1",
      action: "classroom.custom_achievement.awarded",
      targetType: "student",
      targetId: "student-1",
      metadata: {
        classroomId: "class-1",
        achievementId: "ach-1",
        goldReward: 25,
      },
    });
  });

  it("logs when creating a classroom event", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      teacherId: "teacher-1",
      gamifiedSettings: { events: [] },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/events/route");
    const response = await POST(
      {
        json: async () => ({
          title: "Boost Day",
          type: "GOLD_BOOST",
          multiplier: 2,
          startAt: "2026-04-02T00:00:00.000Z",
          endAt: "2026-04-03T00:00:00.000Z",
        }),
      } as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "teacher-1",
        action: "classroom.event.created",
        targetType: "classroom",
        targetId: "class-1",
        metadata: expect.objectContaining({
          eventType: "GOLD_BOOST",
          multiplier: 2,
        }),
      })
    );
  });

  it("logs when duplicating a classroom", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      name: "Math Class",
      emoji: null,
      theme: null,
      grade: null,
      gamifiedSettings: null,
      levelConfig: null,
      skills: [],
      assignments: [],
    });

    const { POST } = await import("@/app/api/classrooms/[id]/duplicate/route");
    const response = await POST({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "teacher-1",
      action: "classroom.duplicated",
      targetType: "classroom",
      targetId: "class-copy-1",
      metadata: {
        sourceClassroomId: "class-1",
        duplicatedName: "Math Class (Copy)",
      },
    });
  });

  it("logs when resetting classroom points", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
    });

    const { POST } = await import("@/app/api/classrooms/[id]/points/reset/route");
    const response = await POST({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "teacher-1",
      action: "classroom.points.reset",
      targetType: "classroom",
      targetId: "class-1",
      metadata: {
        studentsResetCount: 2,
        activitiesDeletedCount: 5,
      },
    });
  });
});
