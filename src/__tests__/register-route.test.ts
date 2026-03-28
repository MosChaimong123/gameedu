import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockHash = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: mockHash,
}));

describe("register route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue("hashed-password");
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      name: "Alice",
      email: "alice@example.com",
      role: "STUDENT",
    });
  });

  it("forces a safe default role even when the client sends ADMIN", async () => {
    const { POST } = await import("@/app/api/register/route");

    const response = await POST(
      makeJsonRequest({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "secret123",
        role: "ADMIN",
        school: "GameEdu Academy",
      })
    );

    expect(response.status).toBe(200);
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "hashed-password",
        role: "STUDENT",
        school: "GameEdu Academy",
      }),
    });
  });
});
