import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      update: mockClassroomUpdate,
    },
  },
}));

describe("classroom route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomUpdate.mockResolvedValue({ id: "class-1" });
  });

  it("ignores disallowed fields when patching classroom settings", async () => {
    const { PATCH } = await import("@/app/api/classrooms/[id]/route");
    const response = await PATCH(
      makeJsonRequest({
        name: "Updated Class",
        theme: "from-blue-400 to-cyan-500",
        teacherId: "attacker-user",
        gamifiedSettings: { hacked: true },
      }),
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockClassroomUpdate).toHaveBeenCalledWith({
      where: {
        id: "class-1",
        teacherId: "teacher-1",
      },
      data: {
        name: "Updated Class",
        theme: "from-blue-400 to-cyan-500",
      },
    });
  });
});
