import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockNotificationDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
    },
    notification: {
      delete: mockNotificationDelete,
    },
  },
}));

describe("student notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
  });

  it("allows deleting a notification through the student login-code route", async () => {
    const { DELETE } = await import("@/app/api/student/[code]/notifications/route");
    const response = await DELETE(
      new Request("http://localhost/api/student/ABC123/notifications?id=notif-1"),
      { params: Promise.resolve({ code: "ABC123" }) }
    );

    expect(response.status).toBe(200);
    expect(mockStudentFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { loginCode: "ABC123" },
          { loginCode: "abc123" },
        ],
      },
      select: { id: true },
    });
    expect(mockNotificationDelete).toHaveBeenCalledWith({
      where: {
        id: "notif-1",
        studentId: "student-1",
      },
    });
  });

  it("returns a structured payload when the notification id is missing", async () => {
    const { DELETE } = await import("@/app/api/student/[code]/notifications/route");
    const response = await DELETE(
      new Request("http://localhost/api/student/ABC123/notifications"),
      { params: Promise.resolve({ code: "ABC123" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Missing id",
      },
    });
  });
});
