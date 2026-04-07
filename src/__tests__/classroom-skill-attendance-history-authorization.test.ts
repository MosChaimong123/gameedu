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
const mockSkillDelete = vi.fn();
const mockAttendanceRecordFindUnique = vi.fn();
const mockAttendanceRecordUpdate = vi.fn();
const mockStudentUpdate = vi.fn();

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
      delete: mockSkillDelete,
    },
    attendanceRecord: {
      findUnique: mockAttendanceRecordFindUnique,
      update: mockAttendanceRecordUpdate,
    },
    student: {
      update: mockStudentUpdate,
    },
  },
}));

describe("classroom skill and attendance history authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
  });

  it("rejects deleting a skill outside the classroom", async () => {
    mockSkillFindUnique.mockResolvedValue({ id: "skill-2", classId: "class-2" });

    const { DELETE } = await import("@/app/api/classrooms/[id]/skills/[skillId]/route");
    const response = await DELETE(makeJsonRequest({}), {
      params: Promise.resolve({ id: "class-1", skillId: "skill-2" }),
    });

    expect(response.status).toBe(404);
    expect(mockSkillDelete).not.toHaveBeenCalled();
  });

  it("rejects updating attendance history outside the classroom", async () => {
    mockAttendanceRecordFindUnique.mockResolvedValue({
      id: "record-2",
      classId: "class-2",
      studentId: "student-2",
    });

    const { PATCH } = await import("@/app/api/classrooms/[id]/attendance/history/[recordId]/route");
    const response = await PATCH(makeJsonRequest({ status: "ABSENT" }), {
      params: Promise.resolve({ id: "class-1", recordId: "record-2" }),
    });

    expect(response.status).toBe(404);
    expect(mockAttendanceRecordUpdate).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });
});
