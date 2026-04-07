import { beforeEach, describe, expect, it, vi } from "vitest";

function makeJsonRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockQuestionSetFindMany = vi.fn();
const mockQuestionSetCreate = vi.fn();
const mockQuestionSetFindUnique = vi.fn();
const mockQuestionSetUpdate = vi.fn();
const mockFolderFindMany = vi.fn();
const mockFolderFindFirst = vi.fn();
const mockFolderCreate = vi.fn();
const mockFolderUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    questionSet: {
      findMany: mockQuestionSetFindMany,
      create: mockQuestionSetCreate,
      findUnique: mockQuestionSetFindUnique,
      update: mockQuestionSetUpdate,
    },
    folder: {
      findMany: mockFolderFindMany,
      findFirst: mockFolderFindFirst,
      create: mockFolderCreate,
      update: mockFolderUpdate,
    },
  },
}));

describe("sets and folders role authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestionSetFindUnique.mockResolvedValue({ id: "set-1", creatorId: "teacher-1" });
    mockFolderFindFirst.mockResolvedValue({ id: "folder-1" });
  });

  it("rejects question set creation for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { POST } = await import("@/app/api/sets/route");

    const response = await POST(makeJsonRequest({ title: "Quiz 1" }));

    expect(response.status).toBe(403);
    expect(mockQuestionSetCreate).not.toHaveBeenCalled();
  });

  it("rejects folder listing for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/folders/route");

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockFolderFindMany).not.toHaveBeenCalled();
  });

  it("allows teachers to update their sets", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockQuestionSetUpdate.mockResolvedValue({ id: "set-1", title: "Updated" });
    const { PATCH } = await import("@/app/api/sets/[id]/route");

    const response = await PATCH(
      makeJsonRequest({ title: "Updated" }),
      { params: Promise.resolve({ id: "set-1" }) }
    );

    if (!response) {
      throw new Error("PATCH /api/sets/[id] returned no response");
    }
    expect(response.status).toBe(200);
    expect(mockQuestionSetUpdate).toHaveBeenCalledTimes(1);
  });

  it("rejects folder updates for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { PATCH } = await import("@/app/api/folders/[folderId]/route");

    const response = await PATCH(
      makeJsonRequest({ name: "Renamed" }),
      { params: Promise.resolve({ folderId: "folder-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mockFolderUpdate).not.toHaveBeenCalled();
  });
});
