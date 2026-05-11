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

  it("rejects unsafe post media urls before creating a post", async () => {
    const { createBoardPost } = await import("@/lib/actions/board-actions");

    await expect(
      createBoardPost({
        boardId: "board-1",
        content: "Open this",
        type: "link",
        title: "Unsafe",
        color: "default",
        linkUrl: "javascript:alert(1)",
      })
    ).rejects.toThrow("boardErrInvalidMedia");
    expect(mockBoardPostCreate).not.toHaveBeenCalled();
  });

  it("rejects polls without enough valid options", async () => {
    const { createBoardPost } = await import("@/lib/actions/board-actions");

    await expect(
      createBoardPost({
        boardId: "board-1",
        content: "",
        type: "poll",
        title: "",
        color: "default",
        pollQuestion: "Choose one",
        pollOptions: [{ id: "opt-1", text: "Only option" }],
      })
    ).rejects.toThrow("boardErrInvalidContent");
    expect(mockBoardPostCreate).not.toHaveBeenCalled();
  });

  it("allows media-only link posts when the link is safe", async () => {
    const { createBoardPost } = await import("@/lib/actions/board-actions");

    await createBoardPost({
      boardId: "board-1",
      content: "   ",
      type: "link",
      title: "   ",
      color: "default",
      linkUrl: " https://example.com/board ",
    });

    expect(mockBoardPostCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "",
          title: "",
          linkUrl: "https://example.com/board",
        }),
      })
    );
  });

  it("rejects link posts without a URL", async () => {
    const { createBoardPost } = await import("@/lib/actions/board-actions");

    await expect(
      createBoardPost({
        boardId: "board-1",
        content: "Has text but no link",
        type: "link",
        title: "Missing link",
        color: "default",
      })
    ).rejects.toThrow("boardErrInvalidMedia");
    expect(mockBoardPostCreate).not.toHaveBeenCalled();
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

  it("lets the classroom teacher delete any classroom board post", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      students: [],
    });
    mockBoardPostDelete.mockResolvedValue({ id: "post-1" });

    const { deleteBoardPost } = await import("@/lib/actions/board-actions");

    await expect(deleteBoardPost("post-1")).resolves.toEqual({ success: true });
    expect(mockBoardPostDelete).toHaveBeenCalledWith({ where: { id: "post-1" } });
  });

  it("updates an existing poll vote instead of creating a duplicate vote", async () => {
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
      poll: {
        id: "poll-1",
        options: [
          { id: "opt-1", text: "Alpha" },
          { id: "opt-2", text: "Beta" },
        ],
      },
    });
    mockBoardPollVoteFindFirst.mockResolvedValue({
      id: "vote-1",
      pollId: "poll-1",
      optionId: "opt-1",
      authorStudentId: "student-1",
      authorUserId: null,
    });
    mockBoardPollVoteUpdate.mockResolvedValue({ id: "vote-1", optionId: "opt-2" });

    const { voteBoardPoll } = await import("@/lib/actions/board-actions");

    await expect(voteBoardPoll({ postId: "post-1", optionId: " opt-2 " })).resolves.toEqual({
      id: "vote-1",
      optionId: "opt-2",
    });
    expect(mockBoardPollVoteUpdate).toHaveBeenCalledWith({
      where: { id: "vote-1" },
      data: { optionId: "opt-2" },
    });
    expect(mockBoardPollVoteCreate).not.toHaveBeenCalled();
  });

  it("rejects poll votes for options that do not belong to the poll", async () => {
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
      poll: {
        id: "poll-1",
        options: [{ id: "opt-1", text: "Alpha" }],
      },
    });

    const { voteBoardPoll } = await import("@/lib/actions/board-actions");

    await expect(voteBoardPoll({ postId: "post-1", optionId: "opt-other" })).rejects.toThrow(
      "boardErrInvalidContent"
    );
    expect(mockBoardPollVoteFindFirst).not.toHaveBeenCalled();
    expect(mockBoardPollVoteCreate).not.toHaveBeenCalled();
    expect(mockBoardPollVoteUpdate).not.toHaveBeenCalled();
  });

  it("removes an existing reaction instead of creating a duplicate reaction", async () => {
    mockBoardReactionFindFirst.mockResolvedValue({
      id: "reaction-1",
      postId: "post-1",
      type: "HEART",
      authorStudentId: "student-1",
      authorUserId: null,
    });
    mockBoardReactionDelete.mockResolvedValue({ id: "reaction-1" });

    const { toggleBoardReaction } = await import("@/lib/actions/board-actions");

    await expect(toggleBoardReaction({ postId: "post-1", type: "HEART" })).resolves.toEqual({
      action: "REMOVED",
      reaction: expect.objectContaining({ id: "reaction-1" }),
    });
    expect(mockBoardReactionDelete).toHaveBeenCalledWith({ where: { id: "reaction-1" } });
    expect(mockBoardReactionCreate).not.toHaveBeenCalled();
  });

  it("rejects unsupported reaction types", async () => {
    const { toggleBoardReaction } = await import("@/lib/actions/board-actions");

    await expect(toggleBoardReaction({ postId: "post-1", type: "FIRE" })).rejects.toThrow(
      "boardErrInvalidContent"
    );
    expect(mockBoardReactionFindFirst).not.toHaveBeenCalled();
  });

  it("trims comment text before saving it", async () => {
    mockBoardCommentCreate.mockResolvedValue({ id: "comment-1", content: "Nice idea" });

    const { addBoardComment } = await import("@/lib/actions/board-actions");

    await addBoardComment({ postId: "post-1", content: "  Nice idea  " });

    expect(mockBoardCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: "Nice idea" }),
      })
    );
  });

  it("allows only the classroom teacher to toggle poll status", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      students: [{ id: "student-2" }],
    });

    const { togglePollStatus } = await import("@/lib/actions/board-actions");

    await expect(togglePollStatus("post-1")).rejects.toThrow("Unauthorized");
    expect(mockBoardPostUpdate).not.toHaveBeenCalled();
  });
});
