"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

type BoardPollOptionInput = {
    id: string;
    text: string;
};

type CreateBoardPostInput = {
    boardId: string;
    content: string;
    type?: string;
    title?: string;
    image?: string;
    color?: string;
    linkUrl?: string;
    fileUrl?: string;
    fileName?: string;
    videoUrl?: string;
    videoName?: string;
    youtubeId?: string;
    pollQuestion?: string;
    pollOptions?: BoardPollOptionInput[];
    albumImages?: string[];
};

type BoardActor = {
    userId: string;
    classId: string;
    isTeacher: boolean;
    authorStudentId?: string;
    authorUserId?: string;
};

type BoardRecord = NonNullable<Awaited<ReturnType<typeof fetchBoardById>>>;
type BoardPostRecord = BoardRecord["posts"][number];

async function requireSessionUserId() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }

    return userId;
}

async function resolveClassroomActor(classId: string, userId: string): Promise<BoardActor> {
    const classroom = await db.classroom.findUnique({
        where: { id: classId },
        select: {
            id: true,
            teacherId: true,
            students: {
                where: { userId },
                select: { id: true },
                take: 1,
            },
        },
    });

    if (!classroom) {
        throw new Error("Classroom not found");
    }

    if (classroom.teacherId === userId) {
        return {
            userId,
            classId: classroom.id,
            isTeacher: true,
            authorUserId: userId,
        };
    }

    const linkedStudent = classroom.students[0];
    if (linkedStudent) {
        return {
            userId,
            classId: classroom.id,
            isTeacher: false,
            authorStudentId: linkedStudent.id,
        };
    }

    throw new Error(AUTH_REQUIRED_MESSAGE);
}

async function resolveBoardActor(boardId: string, userId: string) {
    const board = await db.board.findUnique({
        where: { id: boardId },
        select: { id: true, classId: true },
    });

    if (!board) {
        throw new Error("Board not found");
    }

    const actor = await resolveClassroomActor(board.classId, userId);
    return { actor, board };
}

async function fetchBoardById(boardId: string) {
    return db.board.findUnique({
        where: { id: boardId },
        include: {
            posts: {
                include: {
                    authorStudent: { select: { name: true, avatar: true, nickname: true } },
                    authorUser: { select: { name: true, image: true } },
                    comments: {
                        include: {
                            authorStudent: { select: { name: true, avatar: true, nickname: true } },
                            authorUser: { select: { name: true, image: true } },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                    reactions: true,
                    pollVotes: true,
                    poll: true,
                },
                orderBy: { createdAt: "desc" },
            },
        },
    });
}

async function fetchBoardPostById(postId: string) {
    return db.boardPost.findUnique({
        where: { id: postId },
        include: {
            board: {
                select: {
                    id: true,
                    classId: true,
                    classroom: { select: { teacherId: true } },
                },
            },
            poll: true,
        },
    });
}

function mapBoardPost(post: BoardPostRecord) {
    const pollOptions = Array.isArray(post.poll?.options)
        ? (post.poll.options as BoardPollOptionInput[])
        : [];

    return {
        ...post,
        pollQuestion: post.poll?.question ?? null,
        pollOptions,
        albumImages: post.images ?? [],
    };
}

function mapBoard(board: NonNullable<BoardRecord>) {
    return {
        ...board,
        posts: board.posts.map(mapBoardPost),
    };
}

function assertTeacher(actor: BoardActor) {
    if (!actor.isTeacher) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }
}

export async function getBoards(classId: string) {
    const userId = await requireSessionUserId();
    await resolveClassroomActor(classId, userId);

    return db.board.findMany({
        where: { classId },
        orderBy: { createdAt: "asc" },
    });
}

export async function getBoardWithPosts(boardId: string) {
    const userId = await requireSessionUserId();
    await resolveBoardActor(boardId, userId);

    const board = await fetchBoardById(boardId);
    return board ? mapBoard(board) : null;
}

export async function createBoardPost(data: CreateBoardPostInput) {
    const userId = await requireSessionUserId();
    const { actor } = await resolveBoardActor(data.boardId, userId);

    const post = await db.boardPost.create({
        data: {
            boardId: data.boardId,
            content: data.content,
            type: data.type,
            title: data.title,
            image: data.image,
            color: data.color,
            linkUrl: data.linkUrl,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            videoUrl: data.videoUrl,
            videoName: data.videoName,
            youtubeId: data.youtubeId,
            images: data.albumImages ?? [],
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
            poll: data.pollQuestion && data.pollOptions?.length
                ? {
                    create: {
                        question: data.pollQuestion,
                        options: data.pollOptions,
                    },
                }
                : undefined,
        },
        include: {
            authorStudent: { select: { name: true, avatar: true, nickname: true } },
            authorUser: { select: { name: true, image: true } },
            comments: {
                include: {
                    authorStudent: { select: { name: true, avatar: true, nickname: true } },
                    authorUser: { select: { name: true, image: true } },
                },
                orderBy: { createdAt: "asc" },
            },
            reactions: true,
            pollVotes: true,
            poll: true,
        },
    });

    return mapBoardPost(post);
}

export async function deleteBoardPost(postId: string) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(postId);

    if (!post) {
        throw new Error("Post not found");
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);
    const isAuthor =
        (!actor.isTeacher && post.authorStudentId === actor.authorStudentId) ||
        (actor.isTeacher && post.authorUserId === actor.authorUserId);

    if (!isAuthor && post.board.classroom.teacherId !== userId) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }

    await db.boardPost.delete({ where: { id: postId } });
    return { success: true };
}

export async function toggleBoardReaction(data: {
    postId: string;
    type: string;
}) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(data.postId);

    if (!post) {
        throw new Error("Post not found");
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);

    const existing = await db.boardReaction.findFirst({
        where: {
            postId: data.postId,
            type: data.type,
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
        },
    });

    if (existing) {
        await db.boardReaction.delete({ where: { id: existing.id } });
        return { action: "REMOVED", reaction: existing };
    }

    const reaction = await db.boardReaction.create({
        data: {
            postId: data.postId,
            type: data.type,
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
        },
    });

    return { action: "ADDED", reaction };
}

export async function addBoardComment(data: {
    postId: string;
    content: string;
}) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(data.postId);

    if (!post) {
        throw new Error("Post not found");
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);

    const comment = await db.boardComment.create({
        data: {
            postId: data.postId,
            content: data.content,
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
        },
        include: {
            authorStudent: { select: { name: true, avatar: true, nickname: true } },
            authorUser: { select: { name: true, image: true } },
        },
    });

    return comment;
}

export async function ensureDefaultBoard(classId: string) {
    const userId = await requireSessionUserId();
    await resolveClassroomActor(classId, userId);

    const existing = await db.board.findFirst({ where: { classId } });
    if (existing) {
        return existing;
    }

    return db.board.create({
        data: {
            name: "กระดานไอเดีย",
            description: "พื้นที่สำหรับแบ่งปันไอเดียและพูดคุยในห้องเรียน",
            classId,
        },
    });
}

export async function voteBoardPoll(data: {
    postId: string;
    optionId: string;
}) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(data.postId);

    if (!post) {
        throw new Error("Post not found");
    }

    if (post.pollClosed) {
        throw new Error("โพลนี้ถูกปิดการโหวตแล้ว");
    }

    if (!post.poll) {
        throw new Error("ไม่พบโพลสำหรับโพสต์นี้");
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);

    const existing = await db.boardPollVote.findFirst({
        where: {
            pollId: post.poll.id,
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
        },
    });

    if (existing) {
        return db.boardPollVote.update({
            where: { id: existing.id },
            data: { optionId: data.optionId },
        });
    }

    return db.boardPollVote.create({
        data: {
            optionId: data.optionId,
            pollId: post.poll.id,
            postId: data.postId,
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
        },
    });
}

export async function togglePollStatus(postId: string) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(postId);

    if (!post) {
        throw new Error("Post not found");
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);
    assertTeacher(actor);

    return db.boardPost.update({
        where: { id: postId },
        data: { pollClosed: !post.pollClosed },
    });
}
