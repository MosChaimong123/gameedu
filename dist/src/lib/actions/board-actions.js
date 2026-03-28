"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBoards = getBoards;
exports.getBoardWithPosts = getBoardWithPosts;
exports.createBoardPost = createBoardPost;
exports.deleteBoardPost = deleteBoardPost;
exports.toggleBoardReaction = toggleBoardReaction;
exports.addBoardComment = addBoardComment;
exports.ensureDefaultBoard = ensureDefaultBoard;
exports.voteBoardPoll = voteBoardPoll;
exports.togglePollStatus = togglePollStatus;
const db_1 = require("@/lib/db");
async function getBoards(classId) {
    return await db_1.db.board.findMany({
        where: { classId },
        orderBy: { createdAt: "asc" }
    });
}
async function getBoardWithPosts(boardId) {
    return await db_1.db.board.findUnique({
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
async function createBoardPost(data) {
    const post = await db_1.db.boardPost.create({
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
async function deleteBoardPost(postId, userIdOrStudentId) {
    // Basic security: Check if the user/student is the author or the teacher of the class
    const post = await db_1.db.boardPost.findUnique({
        where: { id: postId },
        include: { board: { select: { classroom: { select: { teacherId: true } } } } }
    });
    if (!post)
        throw new Error("Post not found");
    const isAuthor = post.authorUserId === userIdOrStudentId || post.authorStudentId === userIdOrStudentId;
    const isTeacher = post.board.classroom.teacherId === userIdOrStudentId;
    if (!isAuthor && !isTeacher) {
        throw new Error("Unauthorized");
    }
    await db_1.db.boardPost.delete({ where: { id: postId } });
    return { success: true };
}
async function toggleBoardReaction(data) {
    const existing = await db_1.db.boardReaction.findFirst({
        where: {
            postId: data.postId,
            type: data.type,
            authorStudentId: data.authorStudentId,
            authorUserId: data.authorUserId
        }
    });
    if (existing) {
        await db_1.db.boardReaction.delete({ where: { id: existing.id } });
        return { action: "REMOVED", reaction: existing };
    }
    else {
        const reaction = await db_1.db.boardReaction.create({ data });
        return { action: "ADDED", reaction };
    }
}
async function addBoardComment(data) {
    const comment = await db_1.db.boardComment.create({
        data,
        include: {
            authorStudent: { select: { name: true, avatar: true } },
            authorUser: { select: { name: true, image: true } }
        }
    });
    return comment;
}
async function ensureDefaultBoard(classId) {
    const existing = await db_1.db.board.findFirst({ where: { classId } });
    if (existing)
        return existing;
    return await db_1.db.board.create({
        data: {
            name: "กระดานไอเดีย",
            description: "พื้นที่สำหรับแบ่งปันไอเดียและพูดคุยในห้องเรียน",
            classId: classId
        }
    });
}
async function voteBoardPoll(data) {
    const post = await db_1.db.boardPost.findUnique({
        where: { id: data.postId },
        select: { pollClosed: true, poll: { select: { id: true } } }
    });
    if (post === null || post === void 0 ? void 0 : post.pollClosed)
        throw new Error("โพลนี้ถูกปิดการโหวตแล้ว");
    if (!(post === null || post === void 0 ? void 0 : post.poll))
        throw new Error("ไม่พบโพลสำหรับโพสต์นี้");
    const pollId = post.poll.id;
    // Check if already voted
    const existing = await db_1.db.boardPollVote.findFirst({
        where: {
            pollId,
            authorStudentId: data.authorStudentId,
            authorUserId: data.authorUserId
        }
    });
    if (existing) {
        // Update vote if already exists
        return await db_1.db.boardPollVote.update({
            where: { id: existing.id },
            data: { optionId: data.optionId }
        });
    }
    return await db_1.db.boardPollVote.create({
        data: {
            optionId: data.optionId,
            poll: { connect: { id: pollId } },
            post: { connect: { id: data.postId } },
            authorStudent: data.authorStudentId ? { connect: { id: data.authorStudentId } } : undefined,
            authorUser: data.authorUserId ? { connect: { id: data.authorUserId } } : undefined,
        }
    });
}
async function togglePollStatus(postId, userId) {
    const post = await db_1.db.boardPost.findUnique({
        where: { id: postId },
        include: { board: { select: { classroom: { select: { teacherId: true } } } } }
    });
    if (!post)
        throw new Error("Post not found");
    if (post.board.classroom.teacherId !== userId)
        throw new Error("Unauthorized");
    return await db_1.db.boardPost.update({
        where: { id: postId },
        data: { pollClosed: !post.pollClosed }
    });
}
