import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
      update: mockStudentUpdate,
    },
  },
}));

describe("student profile patch audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Alice",
      nickname: "Ali",
      avatar: "seed-1",
      order: 0,
    });
    mockStudentUpdate.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Alice Prime",
      nickname: "Ace",
      avatar: "seed-1",
      order: 0,
    });
  });

  it("logs remediation-aware audit metadata when a teacher updates a student profile", async () => {
    const { PATCH } = await import("@/app/api/classrooms/[id]/students/[studentId]/route");

    const response = await PATCH(
      {
        json: async () => ({
          name: "Alice Prime",
          nickname: "Ace",
          auditContext: {
            source: "negamon_reward_audit",
            studentLookup: "Alice",
            rewardGamePin: "123456",
          },
        }),
      } as never,
      { params: Promise.resolve({ id: "class-1", studentId: "student-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "teacher-1",
      action: "classroom.student.profile_updated",
      category: "classroom",
      targetType: "student",
      targetId: "student-1",
      metadata: {
        classroomId: "class-1",
        changes: {
          name: { before: "Alice", after: "Alice Prime" },
          nickname: { before: "Ali", after: "Ace" },
        },
        source: "negamon_reward_audit",
        studentLookup: "Alice",
        rewardGamePin: "123456",
      },
    });
  });
});
