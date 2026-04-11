import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockStudentFindFirst = vi.fn();
const mockNotificationUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
    },
    notification: {
      update: mockNotificationUpdate,
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("student notifications validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
  });

  it("normalizes login codes and rejects invalid patch payloads", async () => {
    const { PATCH } = await import("@/app/api/student/[code]/notifications/route");
    const response = await PATCH(
      makeJsonRequest({ id: 123, isRead: "true" }),
      { params: Promise.resolve({ code: " abc123 " }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid notification update",
      },
    });
    expect(mockStudentFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { loginCode: "ABC123" },
          { loginCode: "abc123" },
        ],
      },
      select: { id: true },
    });
    expect(mockNotificationUpdate).not.toHaveBeenCalled();
  });
});
