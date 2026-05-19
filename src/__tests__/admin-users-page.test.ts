import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserFindMany = vi.fn();
const mockUserCount = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: mockUserFindMany,
      count: mockUserCount,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/app/admin/users/user-table", () => ({
  UserTable: () => null,
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return { ...actual };
});

vi.mock("@/components/ui/page-back-link", () => ({
  PageBackLink: () => null,
}));

describe("admin users page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin users away from the page", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    const AdminUsersPage = (await import("@/app/admin/users/page")).default;

    await expect(AdminUsersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("queries paginated user fields for admin table rendering", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockUserCount.mockResolvedValue(109);
    mockUserFindMany.mockResolvedValue([]);
    const AdminUsersPage = (await import("@/app/admin/users/page")).default;

    await AdminUsersPage({ searchParams: Promise.resolve({ page: "4", pageSize: "25" }) });

    expect(mockUserCount).toHaveBeenCalled();
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        skip: 75,
        take: 25,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          planStatus: true,
          planExpiry: true,
          createdAt: true,
        },
      })
    );
  });
});
