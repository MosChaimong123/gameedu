import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockFolderFindMany = vi.fn();
const mockFolderFindFirst = vi.fn();
const mockFolderCreate = vi.fn();
const mockFolderUpdate = vi.fn();
const mockFolderDelete = vi.fn();
const mockQuestionSetUpdateMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/db", () => ({
  db: {
    folder: {
      findMany: mockFolderFindMany,
      findFirst: mockFolderFindFirst,
      create: mockFolderCreate,
      update: mockFolderUpdate,
      delete: mockFolderDelete,
    },
    questionSet: {
      updateMany: mockQuestionSetUpdateMany,
    },
  },
}));

describe("folders route auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockFolderFindMany.mockResolvedValue([]);
    mockFolderFindFirst.mockResolvedValue({ id: "folder-parent-1" });
    mockFolderCreate.mockResolvedValue({
      id: "folder-1",
      name: "Unit 1",
      creatorId: "teacher-1",
      parentFolderId: null,
    });
    mockFolderUpdate.mockResolvedValue({
      id: "folder-1",
      name: "Updated",
      creatorId: "teacher-1",
    });
    mockFolderDelete.mockResolvedValue({ id: "folder-1" });
    mockQuestionSetUpdateMany.mockResolvedValue({ count: 0 });
  });

  it("rejects unauthenticated folder listing requests", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/folders/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockFolderFindMany).not.toHaveBeenCalled();
  });

  it("rejects folder creation for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/folders/route");

    const response = await POST(makeJsonRequest({ name: "Quiz Folder" }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockFolderCreate).not.toHaveBeenCalled();
  });

  it("returns not found when the requested parent folder is missing", async () => {
    mockFolderFindFirst.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/folders/route");

    const response = await POST(
      makeJsonRequest({ name: "Quiz Folder", parentFolderId: "missing-parent" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
    expect(mockFolderCreate).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated folder update requests", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { PATCH } = await import("@/app/api/folders/[folderId]/route");

    const response = await PATCH(
      makeJsonRequest({ name: "Updated" }),
      makeRouteParams({ folderId: "folder-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockFolderUpdate).not.toHaveBeenCalled();
  });

  it("returns not found when updating a folder that no longer exists", async () => {
    mockFolderUpdate.mockRejectedValueOnce({ code: "P2025" });
    const { PATCH } = await import("@/app/api/folders/[folderId]/route");

    const response = await PATCH(
      makeJsonRequest({ name: "Updated" }),
      makeRouteParams({ folderId: "folder-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects folder deletion for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { DELETE } = await import("@/app/api/folders/[folderId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/folders/folder-1", { method: "DELETE" }),
      makeRouteParams({ folderId: "folder-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockQuestionSetUpdateMany).not.toHaveBeenCalled();
    expect(mockFolderDelete).not.toHaveBeenCalled();
  });
});
