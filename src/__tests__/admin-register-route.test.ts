import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectAppErrorResponse, makeJsonRequest } from "@/__tests__/utils/route-test-helpers";

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

describe("admin register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockUserCount.mockResolvedValue(1);
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "admin-1" });
    mockUserUpdate.mockResolvedValue({ id: "user-1", role: "ADMIN" });
    mockHash.mockResolvedValue("hashed-password");
    mockCompare.mockResolvedValue(true);
  });

  it("returns forbidden when an admin already exists and the caller has no admin session", async () => {
    const { POST } = await import("@/app/api/admin/register/route");

    const response = await POST(
      makeJsonRequest({
        email: "admin@example.com",
        password: "secret123",
      })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("creates the first admin when the shared admin secret is valid", async () => {
    mockUserCount.mockResolvedValueOnce(0);
    vi.stubEnv("ADMIN_SECRET", "open-sesame");
    const { POST } = await import("@/app/api/admin/register/route");

    const response = await POST(
      makeJsonRequest({
        email: "admin@example.com",
        password: "secret123",
        adminSecret: "open-sesame",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
