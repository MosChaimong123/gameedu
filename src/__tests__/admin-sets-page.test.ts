import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockQuestionSetFindMany = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    questionSet: {
      findMany: mockQuestionSetFindMany,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/app/admin/sets/set-list", () => ({
  SetList: ({ initialSets }: { initialSets: unknown[] }) => ({
    type: "SetList",
    props: { initialSets },
  }),
}));

vi.mock("lucide-react", () => ({
  BookOpen: "BookOpenIcon",
}));

vi.mock("@/components/ui/page-back-link", () => ({
  PageBackLink: () => null,
}));

describe("admin sets page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin users away from the page", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    const AdminSetsPage = (await import("@/app/admin/sets/page")).default;

    await expect(AdminSetsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockQuestionSetFindMany).not.toHaveBeenCalled();
  });

  it("queries only the fields needed for admin set listing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockQuestionSetFindMany.mockResolvedValue([]);
    const AdminSetsPage = (await import("@/app/admin/sets/page")).default;

    await AdminSetsPage();

    expect(mockQuestionSetFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });
});
