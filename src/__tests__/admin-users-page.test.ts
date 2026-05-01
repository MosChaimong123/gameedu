import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserFindMany = vi.fn();
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
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/app/admin/users/user-table", () => ({
  UserTable: ({ initialUsers }: { initialUsers: unknown[] }) => ({
    type: "UserTable",
    props: { initialUsers },
  }),
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

    await expect(AdminUsersPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("queries only the safe user fields for admin table rendering", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockUserFindMany.mockResolvedValue([]);
    const AdminUsersPage = (await import("@/app/admin/users/page")).default;

    await AdminUsersPage();

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
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
