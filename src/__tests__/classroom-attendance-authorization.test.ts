import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findMany: mockStudentFindMany,
      update: vi.fn(),
    },
    attendanceRecord: {
      create: vi.fn(),
    },
    $transaction: mockTransaction,
  },
}));

describe("classroom attendance authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
  });

  it("rejects attendance updates when any student is outside the classroom", async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", classId: "class-1" },
      { id: "student-2", classId: "class-2" },
    ]);

    const { POST } = await import("@/app/api/classrooms/[id]/attendance/route");
    const response = await POST(
      makeJsonRequest({
        updates: [
          { studentId: "student-1", status: "PRESENT" },
          { studentId: "student-2", status: "ABSENT" },
        ],
      }),
      { params: Promise.resolve({ id: "class-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Student not found",
      },
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
