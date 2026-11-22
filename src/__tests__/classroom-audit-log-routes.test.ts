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
        role: "TEACHER",
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
