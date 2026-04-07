import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockUserCount = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockHash = vi.fn();
const mockCompare = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: mockUserCount,
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

describe("admin register route POST", () => {
  const originalAdminSecret = process.env.ADMIN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "top-secret";
    mockAuth.mockResolvedValue(null);
    mockUserCount.mockResolvedValue(0);
    mockUserFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("hashed-password");
    mockCompare.mockResolvedValue(true);
    mockUserCreate.mockResolvedValue({ id: "admin-1", username: "admin_1234" });
  });

  afterAll(() => {
    process.env.ADMIN_SECRET = originalAdminSecret;
  });

  it("allows bootstrap admin creation only when there are no admins and the secret matches", async () => {
    const { POST } = await import("@/app/api/admin/register/route");

    const response = await POST(
      makeJsonRequest({
        email: "admin@example.com",
        password: "secret123",
        adminSecret: "top-secret",
      })
    );

    expect(response.status).toBe(200);
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "admin@example.com",
        password: "hashed-password",
        role: "ADMIN",
      }),
    });
  });

  it("blocks unauthenticated admin creation once an admin already exists", async () => {
    mockUserCount.mockResolvedValue(1);
    const { POST } = await import("@/app/api/admin/register/route");

    const response = await POST(
      makeJsonRequest({
        email: "admin2@example.com",
        password: "secret123",
        adminSecret: "top-secret",
      })
    );

    expect(response.status).toBe(403);
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("allows an authenticated admin session to promote another user without the bootstrap secret", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "teacher@example.com",
      password: "stored-hash",
      role: "TEACHER",
    });

    const { POST } = await import("@/app/api/admin/register/route");

    const response = await POST(
      makeJsonRequest({
        email: "teacher@example.com",
        password: "secret123",
      })
    );

    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: "teacher@example.com" },
      data: { role: "ADMIN" },
    });
  });
});
