import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockSkillFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockStudentUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockSendNotification = vi.fn();
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    skill: {
      findUnique: mockSkillFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
      findMany: mockStudentFindMany,
      update: mockStudentUpdate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/notifications", () => ({
  sendNotification: mockSendNotification,
}));

describe("classroom points authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
    mockSkillFindUnique.mockResolvedValue({ id: "skill-1", name: "Helping", weight: 5 });
  });

  it("rejects awarding points to a student outside the classroom", async () => {
    mockStudentFindUnique.mockResolvedValue({
      id: "student-2",
      classId: "class-2",
      loginCode: "ABC123",
    });

    const { POST } = await import("@/app/api/classrooms/[id]/points/route");
    const response = await POST(makeJsonRequest({ studentId: "student-2", skillId: "skill-1" }), {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("rejects batch awards when any student is outside the classroom", async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", classId: "class-1" },
      { id: "student-2", classId: "class-2" },
    ]);

    const { POST } = await import("@/app/api/classrooms/[id]/points/batch/route");
    const response = await POST(makeJsonRequest({ studentIds: ["student-1", "student-2"], skillId: "skill-1" }), {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
