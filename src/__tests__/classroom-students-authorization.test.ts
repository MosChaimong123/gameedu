import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown> | Array<Record<string, unknown>>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockStudentUpdate = vi.fn();
const mockStudentDelete = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
      findMany: mockStudentFindMany,
      update: mockStudentUpdate,
      delete: mockStudentDelete,
    },
  },
}));

describe("classroom student authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
  });

  it("rejects patching a student outside the classroom", async () => {
    mockStudentFindUnique.mockResolvedValue({ id: "student-2", classId: "class-2" });

    const { PATCH } = await import("@/app/api/classrooms/[id]/students/[studentId]/route");
    const response = await PATCH(makeJsonRequest({ name: "Eve" }), {
      params: Promise.resolve({ id: "class-1", studentId: "student-2" }),
    });

    expect(response.status).toBe(404);
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });

  it("rejects deleting a student outside the classroom", async () => {
    mockStudentFindUnique.mockResolvedValue({ id: "student-2", classId: "class-2" });

    const { DELETE } = await import("@/app/api/classrooms/[id]/students/[studentId]/route");
    const response = await DELETE(makeJsonRequest({}), {
      params: Promise.resolve({ id: "class-1", studentId: "student-2" }),
    });

    expect(response.status).toBe(404);
    expect(mockStudentDelete).not.toHaveBeenCalled();
  });

  it("rejects reordering when any student is outside the classroom", async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", classId: "class-1" },
      { id: "student-2", classId: "class-2" },
    ]);

    const { PATCH } = await import("@/app/api/classrooms/[id]/students/route");
    const response = await PATCH(
      makeJsonRequest([
        { id: "student-1", order: 0 },
        { id: "student-2", order: 1 },
      ]),
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(404);
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });
});
