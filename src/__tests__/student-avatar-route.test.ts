import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockStudentFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: mockStudentFindUnique,
      update: mockStudentUpdate,
    },
  },
}));

describe("student avatar route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentFindUnique.mockResolvedValue({ loginCode: "ABC123" });
    mockStudentUpdate.mockResolvedValue({ id: "student-1", avatar: "nova-1" });
  });

  it("accepts login codes case-insensitively and trims the avatar seed", async () => {
    const { PATCH } = await import("@/app/api/classrooms/[id]/students/[studentId]/avatar/route");
    const response = await PATCH(
      makeJsonRequest({ avatar: "  nova-1  ", loginCode: "abc123" }),
      { params: Promise.resolve({ id: "class-1", studentId: "student-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockStudentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { avatar: "nova-1" },
      select: { id: true, avatar: true },
    });
  });

  it("rejects avatar values outside the allowed seed format", async () => {
    const { PATCH } = await import("@/app/api/classrooms/[id]/students/[studentId]/avatar/route");
    const response = await PATCH(
      makeJsonRequest({ avatar: "https://evil.example/x.svg", loginCode: "ABC123" }),
      { params: Promise.resolve({ id: "class-1", studentId: "student-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid avatar",
      },
    });
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });
});
