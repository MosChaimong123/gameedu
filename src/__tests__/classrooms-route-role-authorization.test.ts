import { beforeEach, describe, expect, it, vi } from "vitest";

function makeJsonRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomFindMany = vi.fn();
const mockClassroomCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findMany: mockClassroomFindMany,
      create: mockClassroomCreate,
    },
  },
}));

describe("classrooms route role authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassroomFindMany.mockResolvedValue([]);
    mockClassroomCreate.mockResolvedValue({ id: "class-1", name: "Science" });
  });

  it("rejects classroom listing for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/classrooms/route");

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockClassroomFindMany).not.toHaveBeenCalled();
  });

  it("rejects classroom creation for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { POST } = await import("@/app/api/classrooms/route");

    const response = await POST(makeJsonRequest({ name: "Science" }));

    expect(response.status).toBe(403);
    expect(mockClassroomCreate).not.toHaveBeenCalled();
  });

  it("allows teachers to create classrooms", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const { POST } = await import("@/app/api/classrooms/route");

    const response = await POST(makeJsonRequest({ name: "Science", grade: "5" }));

    expect(response.status).toBe(200);
    expect(mockClassroomCreate).toHaveBeenCalledTimes(1);
  });
});
