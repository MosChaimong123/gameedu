import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockFolderFindFirst = vi.fn();
const mockFolderCreate = vi.fn();
const mockQuestionSetFindUnique = vi.fn();
const mockQuestionSetUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    folder: {
      findFirst: mockFolderFindFirst,
      create: mockFolderCreate,
    },
    questionSet: {
      findUnique: mockQuestionSetFindUnique,
      update: mockQuestionSetUpdate,
    },
  },
}));

describe("folder and set authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockQuestionSetFindUnique.mockResolvedValue({
      id: "set-1",
      creatorId: "teacher-1",
    });
  });

  it("rejects creating a folder under another user's parent folder", async () => {
    mockFolderFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/folders/route");
    const response = await POST(
      makeJsonRequest({ name: "Unit 1", parentFolderId: "foreign-folder" })
    );

    expect(response.status).toBe(404);
    expect(mockFolderCreate).not.toHaveBeenCalled();
  });

  it("rejects moving a set into another user's folder", async () => {
    mockFolderFindFirst.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/sets/[id]/route");
    const response = await PATCH(
      makeJsonRequest({ folderId: "foreign-folder" }),
      { params: Promise.resolve({ id: "set-1" }) }
    );

    expect(response).toBeDefined();
    expect(response.status).toBe(404);
    expect(mockQuestionSetUpdate).not.toHaveBeenCalled();
  });
});
