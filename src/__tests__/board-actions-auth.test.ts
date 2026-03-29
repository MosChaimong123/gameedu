import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockBoardFindUnique = vi.fn();
const mockBoardFindMany = vi.fn();
const mockBoardFindFirst = vi.fn();
const mockBoardCreate = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockBoardPostCreate = vi.fn();
const mockBoardPostFindUnique = vi.fn();
const mockBoardPostDelete = vi.fn();
const mockBoardPostUpdate = vi.fn();
const mockBoardReactionFindFirst = vi.fn();
const mockBoardReactionCreate = vi.fn();
const mockBoardReactionDelete = vi.fn();
const mockBoardCommentCreate = vi.fn();
const mockBoardPollVoteFindFirst = vi.fn();
const mockBoardPollVoteCreate = vi.fn();
const mockBoardPollVoteUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    board: {
      findUnique: mockBoardFindUnique,
      findMany: mockBoardFindMany,
      findFirst: mockBoardFindFirst,
      create: mockBoardCreate,
    },
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    boardPost: {
      create: mockBoardPostCreate,
      findUnique: mockBoardPostFindUnique,
      delete: mockBoardPostDelete,
      update: mockBoardPostUpdate,
    },
    boardReaction: {
      findFirst: mockBoardReactionFindFirst,
      create: mockBoardReactionCreate,
      delete: mockBoardReactionDelete,
    },
    boardComment: {
      create: mockBoardCommentCreate,
    },
    boardPollVote: {
      findFirst: mockBoardPollVoteFindFirst,
      create: mockBoardPollVoteCreate,
      update: mockBoardPollVoteUpdate,
    },
  },
}));

describe("board actions authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockBoardFindUnique.mockResolvedValue({ id: "board-1", classId: "class-1" });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      students: [{ id: "student-1" }],
    });
    mockBoardPostCreate.mockResolvedValue({
      id: "post-1",
      boardId: "board-1",
      content: "Hello board",
      type: "file",
      title: "Announcement",
      image: null,
      color: "default",
      linkUrl: null,
      fileUrl: null,
      fileName: null,
      videoUrl: null,
      videoName: null,
      youtubeId: null,
      images: [],
      pollClosed: false,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z"),
      authorStudentId: "student-1",
      authorUserId: null,
      authorStudent: { name: "Alice", avatar: "seed", nickname: "Ali" },
      authorUser: null,
      comments: [],
      reactions: [],
      pollVotes: [],
      poll: null,
    });
    mockBoardPostFindUnique.mockResolvedValue({
      id: "post-1",
      authorStudentId: "student-1",
      authorUserId: null,
      pollClosed: false,
      board: {
        id: "board-1",
        classId: "class-1",
        classroom: { teacherId: "teacher-1" },
      },
      poll: null,
    });
  });

  it("creates board posts using the session-linked student instead of trusting client author ids", async () => {
    const { createBoardPost } = await import("@/lib/actions/board-actions");

    await createBoardPost({
      boardId: "board-1",
      content: "Hello board",
      type: "file",
      title: "Announcement",
      color: "default",
    });

    expect(mockBoardPostCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          boardId: "board-1",
          content: "Hello board",
          authorStudentId: "student-1",
          authorUserId: undefined,
        }),
      })
    );
  });

  it("rejects board reads from users who are not the teacher or a linked student in the classroom", async () => {
    mockAuth.mockResolvedValue({ user: { id: "outsider-user" } });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      students: [],
    });

    const { getBoardWithPosts } = await import("@/lib/actions/board-actions");

    await expect(getBoardWithPosts("board-1")).rejects.toThrow("Unauthorized");
  });

  it("prevents a different student session from deleting someone else's post", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      students: [{ id: "student-2" }],
    });

    const { deleteBoardPost } = await import("@/lib/actions/board-actions");

    await expect(deleteBoardPost("post-1")).rejects.toThrow("Unauthorized");
    expect(mockBoardPostDelete).not.toHaveBeenCalled();
  });
});
