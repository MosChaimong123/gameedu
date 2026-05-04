import { beforeEach, describe, expect, it, vi } from "vitest";

function makeJsonRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockStudentCreateMany = vi.fn();

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
      createMany: mockStudentCreateMany,
    },
  },
}));

describe("student creation route login codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1", students: [] });
    mockStudentFindMany.mockResolvedValue([]);
    mockStudentCreateMany.mockResolvedValue({ count: 2 });
  });

  it("creates longer uppercase login codes using the secure generator flow", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/students/route");
    const response = await POST(
      makeJsonRequest({
        students: [{ name: "Alice" }, { name: "Bob" }],
      }),
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockStudentCreateMany).toHaveBeenCalledTimes(1);

    const call = mockStudentCreateMany.mock.calls[0][0] as {
      data: Array<{ loginCode: string }>;
    };

    expect(call.data).toHaveLength(2);
    for (const student of call.data) {
      expect(student.loginCode).toMatch(/^[A-Z0-9]{12}$/);
      expect(student.loginCode).not.toHaveLength(6);
    }
  });
});
