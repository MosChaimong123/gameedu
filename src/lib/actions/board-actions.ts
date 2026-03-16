"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getBoards(classId: string) {
    return await db.board.findMany({
        where: { classId },
        orderBy: { createdAt: "asc" }
    });
}

export async function getBoardWithPosts(boardId: string) {
    return await db.board.findUnique({
        where: { id: boardId },
        include: {
            posts: {
                include: {
                    authorStudent: { select: { name: true, avatar: true, nickname: true } },
                    authorUser: { select: { name: true, image: true } },
                    comments: {
                        include: {
                            authorStudent: { select: { name: true, avatar: true } },
                            authorUser: { select: { name: true, image: true } }
                        },
                        orderBy: { createdAt: "asc" }
                    },
                    reactions: true,
                    pollVotes: true
                },
                orderBy: { createdAt: "desc" }
            }
        }
    });
}

export async function createBoardPost(data: {
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
    pollOptions?: any;
    albumImages?: any;
    authorStudentId?: string;
    authorUserId?: string;
}) {
    const post = await db.boardPost.create({
        data,
        include: {
            authorStudent: { select: { name: true, avatar: true, nickname: true } },
            authorUser: { select: { name: true, image: true } },
            comments: true,
            reactions: true,
            pollVotes: true
        }
    });

    return post;
}

export async function deleteBoardPost(postId: string, userIdOrStudentId: string) {
    // Basic security: Check if the user/student is the author or the teacher of the class
    const post = await db.boardPost.findUnique({
        where: { id: postId },
        include: { board: { select: { classroom: { select: { teacherId: true } } } } }
    });

    if (!post) throw new Error("Post not found");

    const isAuthor = post.authorUserId === userIdOrStudentId || post.authorStudentId === userIdOrStudentId;
    const isTeacher = post.board.classroom.teacherId === userIdOrStudentId;

    if (!isAuthor && !isTeacher) {
        throw new Error("Unauthorized");
    }

    await db.boardPost.delete({ where: { id: postId } });
    return { success: true };
}

export async function toggleBoardReaction(data: {
    postId: string;
    type: string;
    authorStudentId?: string;
    authorUserId?: string;
}) {
    const existing = await db.boardReaction.findFirst({
        where: {
            postId: data.postId,
            type: data.type,
            authorStudentId: data.authorStudentId,
            authorUserId: data.authorUserId
        }
    });

    if (existing) {
        await db.boardReaction.delete({ where: { id: existing.id } });
        return { action: "REMOVED", reaction: existing };
    } else {
        const reaction = await db.boardReaction.create({ data });
        return { action: "ADDED", reaction };
    }
}

export async function addBoardComment(data: {
    postId: string;
    content: string;
    authorStudentId?: string;
    authorUserId?: string;
}) {
    const comment = await db.boardComment.create({
        data,
        include: {
            authorStudent: { select: { name: true, avatar: true } },
            authorUser: { select: { name: true, image: true } }
        }
    });

    return comment;
}

export async function ensureDefaultBoard(classId: string) {
    const existing = await db.board.findFirst({ where: { classId } });
    if (existing) return existing;

    return await db.board.create({
        data: {
            name: "กระดานไอเดีย",
            description: "พื้นที่สำหรับแบ่งปันไอเดียและพูดคุยในห้องเรียน",
            classId: classId
        }
    });
}

export async function voteBoardPoll(data: {
    postId: string;
    optionId: string;
    authorStudentId?: string;
    authorUserId?: string;
}) {
    const post = await db.boardPost.findUnique({
        where: { id: data.postId },
        select: { pollClosed: true, poll: { select: { id: true } } }
    });

    if (post?.pollClosed) throw new Error("โพลนี้ถูกปิดการโหวตแล้ว");
    if (!post?.poll) throw new Error("ไม่พบโพลสำหรับโพสต์นี้");

    const pollId = post.poll.id;

    // Check if already voted
    const existing = await db.boardPollVote.findFirst({
        where: {
            pollId,
            authorStudentId: data.authorStudentId,
            authorUserId: data.authorUserId
        }
    });

    if (existing) {
        // Update vote if already exists
        return await db.boardPollVote.update({
            where: { id: existing.id },
            data: { optionId: data.optionId }
        });
    }

    return await db.boardPollVote.create({
        data: {
            optionId: data.optionId,
            poll: { connect: { id: pollId } },
            post: { connect: { id: data.postId } },
            authorStudent: data.authorStudentId ? { connect: { id: data.authorStudentId } } : undefined,
            authorUser: data.authorUserId ? { connect: { id: data.authorUserId } } : undefined,
        }
    });
}

export async function togglePollStatus(postId: string, userId: string) {
    const post = await db.boardPost.findUnique({
        where: { id: postId },
        include: { board: { select: { classroom: { select: { teacherId: true } } } } }
    });

    if (!post) throw new Error("Post not found");
    if (post.board.classroom.teacherId !== userId) throw new Error("Unauthorized");

    return await db.boardPost.update({
        where: { id: postId },
        data: { pollClosed: !post.pollClosed }
    });
}
