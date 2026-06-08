"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";
import {
    normalizeAttachedFilesInput,
    parseBoardAttachedFiles,
    MAX_BOARD_ATTACHED_FILES,
    type BoardAttachedFile,
} from "@/lib/board-attached-files";
import {
    assertSafeHttpUrl,
    assertSafeUploadedMediaUrl,
    BOARD_ERR_INVALID_MEDIA,
} from "@/lib/safe-media-url";
import { collectBoardPostMediaUrls, deleteBoardAssetsFromR2 } from "@/lib/storage";
import { syncTeachingMediaUsageForOwner } from "@/lib/actions/teaching-media-actions";
import {
    getTeachingMediaUsageReferences,
    normalizeTeachingMediaReferences,
    type TeachingMediaReference,
} from "@/lib/teaching-media-reference";

const BOARD_ERR_CLASSROOM_NOT_FOUND = "boardErrClassroomNotFound";
const MAX_BOARD_ALBUM_IMAGES = 20;
const BOARD_ERR_BOARD_NOT_FOUND = "boardErrBoardNotFound";
const BOARD_ERR_POST_NOT_FOUND = "boardErrPostNotFound";
const BOARD_ERR_POLL_CLOSED = "boardErrPollClosed";
const BOARD_ERR_NO_POLL = "boardErrNoPoll";
const BOARD_ERR_INVALID_CONTENT = "boardErrInvalidContent";
const BOARD_POST_TYPES = new Set(["file", "album", "video", "youtube", "poll", "link"]);
const BOARD_REACTION_TYPES = new Set(["HEART"]);
const MAX_BOARD_TEXT_LENGTH = 5000;
const MAX_BOARD_TITLE_LENGTH = 160;
const MAX_POLL_OPTION_LENGTH = 160;

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

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
    attachedFiles?: BoardAttachedFile[];
    videoUrl?: string;
    videoName?: string;
    youtubeId?: string;
    mediaReferences?: TeachingMediaReference[];
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

function collectBoardPostMediaReferences(post: {
    linkUrl?: string | null;
    fileUrl?: string | null;
    videoUrl?: string | null;
    image?: string | null;
    images?: string[] | null;
    youtubeId?: string | null;
    mediaReferences?: unknown;
}) {
    const normalizedReferences = normalizeTeachingMediaReferences(post.mediaReferences);
    const referenceUsage = getTeachingMediaUsageReferences(normalizedReferences);

    return {
        urls: [...new Set([post.fileUrl, post.videoUrl, post.image, ...(post.images ?? []), ...referenceUsage.urls].filter(Boolean) as string[])],
        linkUrls: [...new Set([post.linkUrl, ...referenceUsage.linkUrls].filter(Boolean) as string[])],
        youtubeIds: [...new Set([post.youtubeId, ...referenceUsage.youtubeIds].filter(Boolean) as string[])],
    };
}

async function requireSessionUserId() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }

    return userId;
}

function assertBoundedText(value: string | undefined, max: number) {
    if (value !== undefined && value.length > max) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }
}

function normalizeBoardPostInput(data: CreateBoardPostInput): CreateBoardPostInput {
    const type = data.type ?? "file";
    if (!BOARD_POST_TYPES.has(type)) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }

    const content = data.content.trim();
    const title = data.title?.trim();
    assertBoundedText(content, MAX_BOARD_TEXT_LENGTH);
    assertBoundedText(title, MAX_BOARD_TITLE_LENGTH);

    const linkUrl = data.linkUrl?.trim();
    const fileUrl = data.fileUrl?.trim();
    const fileName = data.fileName?.trim();
    const attachedFiles =
        (data.type ?? "file") === "file"
            ? normalizeAttachedFilesInput(data.attachedFiles, { fileUrl, fileName })
            : [];
    const videoUrl = data.videoUrl?.trim();
    const image = data.image?.trim();
    const youtubeId = data.youtubeId?.trim();
    const albumImages = data.albumImages?.map((image) => image.trim()).filter(Boolean);

    if (linkUrl) assertSafeHttpUrl(linkUrl);
    if (fileUrl) assertSafeUploadedMediaUrl(fileUrl);
    for (const file of attachedFiles) {
        assertSafeUploadedMediaUrl(file.url);
    }
    if (videoUrl) assertSafeUploadedMediaUrl(videoUrl);
    if (image) assertSafeUploadedMediaUrl(image);
    for (const albumImage of albumImages ?? []) {
        assertSafeUploadedMediaUrl(albumImage.trim());
    }

    if (youtubeId && !YOUTUBE_ID_PATTERN.test(youtubeId)) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    const pollQuestion = data.pollQuestion?.trim();
    const pollOptions = (data.pollOptions ?? [])
        .map((option) => ({ id: option.id.trim(), text: option.text.trim() }))
        .filter((option) => option.id && option.text);

    if (type === "poll") {
        if (!pollQuestion || pollOptions.length < 2) {
            throw new Error(BOARD_ERR_INVALID_CONTENT);
        }
        assertBoundedText(pollQuestion, MAX_BOARD_TITLE_LENGTH);
        for (const option of pollOptions) {
            assertBoundedText(option.text, MAX_POLL_OPTION_LENGTH);
        }
    }

    if (type === "link" && !linkUrl) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
    if (type === "video" && !videoUrl) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
    if (type === "youtube" && !youtubeId) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
    if (type === "album" && !albumImages?.length) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
    if (type === "album" && (albumImages?.length ?? 0) > MAX_BOARD_ALBUM_IMAGES) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }
    if (type === "file" && attachedFiles.length === 0) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
    if (attachedFiles.length > MAX_BOARD_ATTACHED_FILES) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }

    const primaryFile = attachedFiles[0];
    const hasBody = Boolean(content || title);
    const hasAttachment = Boolean(
        linkUrl ||
            primaryFile?.url ||
            videoUrl ||
            image ||
            youtubeId ||
            albumImages?.length
    );
    if (!hasBody && !hasAttachment && type !== "poll") {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }

    return {
        ...data,
        type,
        content,
        title,
        linkUrl,
        fileUrl: primaryFile?.url,
        fileName: primaryFile?.name,
        attachedFiles,
        videoUrl,
        image,
        youtubeId,
        pollQuestion,
        pollOptions,
        albumImages,
    };
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
        throw new Error(BOARD_ERR_CLASSROOM_NOT_FOUND);
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
        throw new Error(BOARD_ERR_BOARD_NOT_FOUND);
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

    const attachedFiles = parseBoardAttachedFiles(post.attachedFiles, post.fileUrl, post.fileName);

    return {
        ...post,
        pollQuestion: post.poll?.question ?? null,
        pollOptions,
        albumImages: post.images ?? [],
        attachedFiles,
        fileUrl: attachedFiles[0]?.url ?? post.fileUrl,
        fileName: attachedFiles[0]?.name ?? post.fileName,
    };
}

function sortBoardPosts(posts: BoardPostRecord[]) {
    return [...posts].sort((left, right) => {
        const leftPinned = left.pinnedAt ? 1 : 0;
        const rightPinned = right.pinnedAt ? 1 : 0;
        if (leftPinned !== rightPinned) {
            return rightPinned - leftPinned;
        }

        if (left.pinnedAt && right.pinnedAt) {
            return right.pinnedAt.getTime() - left.pinnedAt.getTime();
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
    });
}

function mapBoard(board: NonNullable<BoardRecord>) {
    return {
        ...board,
        posts: sortBoardPosts(board.posts).map(mapBoardPost),
    };
}

function assertTeacher(actor: BoardActor) {
    if (!actor.isTeacher) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }
}

/** Prisma omits undefined fields from where — use explicit null for teacher vs student. */
function boardActorWhere(actor: BoardActor) {
    if (actor.authorStudentId) {
        return {
            authorStudentId: actor.authorStudentId,
            authorUserId: null as null,
        };
    }
    return {
        authorStudentId: null as null,
        authorUserId: actor.authorUserId ?? actor.userId,
    };
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
    const normalized = normalizeBoardPostInput(data);
    const { actor, board } = await resolveBoardActor(normalized.boardId, userId);

    const post = await db.boardPost.create({
        data: {
            boardId: normalized.boardId,
            content: normalized.content,
            type: normalized.type,
            title: normalized.title,
            image: normalized.image,
            color: normalized.color,
            linkUrl: normalized.linkUrl,
            fileUrl: normalized.fileUrl,
            fileName: normalized.fileName,
            attachedFiles: normalized.attachedFiles?.length ? normalized.attachedFiles : undefined,
            videoUrl: normalized.videoUrl,
            videoName: normalized.videoName,
            youtubeId: normalized.youtubeId,
            mediaReferences: normalizeTeachingMediaReferences(normalized.mediaReferences),
            images: normalized.albumImages ?? [],
            authorStudentId: actor.authorStudentId,
            authorUserId: actor.authorUserId,
            poll: normalized.pollQuestion && normalized.pollOptions?.length
                ? {
                    create: {
                        question: normalized.pollQuestion,
                        options: normalized.pollOptions,
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

    const classroom = await db.classroom.findUnique({
        where: { id: board.classId },
        select: { teacherId: true },
    });
    if (classroom?.teacherId) {
        await syncTeachingMediaUsageForOwner(classroom.teacherId, collectBoardPostMediaReferences(normalized));
    }

    return mapBoardPost(post);
}

export async function deleteBoardPost(postId: string) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(postId);

    if (!post) {
        throw new Error(BOARD_ERR_POST_NOT_FOUND);
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);
    const isAuthor =
        (!actor.isTeacher && post.authorStudentId === actor.authorStudentId) ||
        (actor.isTeacher && post.authorUserId === actor.authorUserId);

    if (!isAuthor && post.board.classroom.teacherId !== userId) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }

    const mediaUrls = collectBoardPostMediaUrls(post);
    const mediaReferences = collectBoardPostMediaReferences(post);
    await db.boardPost.delete({ where: { id: postId } });
    const reusableMedia = mediaUrls.length
        ? await db.teachingMedia.findMany({
              where: { OR: mediaUrls.map((url) => ({ url })) },
              select: { url: true },
          })
        : [];
    const reusableUrls = new Set(reusableMedia.map((media) => media.url).filter(Boolean));
    await deleteBoardAssetsFromR2(mediaUrls.filter((url) => !reusableUrls.has(url)));
    await syncTeachingMediaUsageForOwner(post.board.classroom.teacherId, mediaReferences);
    return { success: true };
}

export async function toggleBoardReaction(data: {
    postId: string;
    type: string;
}) {
    const userId = await requireSessionUserId();
    if (!BOARD_REACTION_TYPES.has(data.type)) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }
    const post = await fetchBoardPostById(data.postId);

    if (!post) {
        throw new Error(BOARD_ERR_POST_NOT_FOUND);
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);

    const existing = await db.boardReaction.findFirst({
        where: {
            postId: data.postId,
            type: data.type,
            ...boardActorWhere(actor),
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
            authorStudentId: actor.authorStudentId ?? null,
            authorUserId: actor.authorUserId ?? null,
        },
    });

    return { action: "ADDED", reaction };
}

export async function addBoardComment(data: {
    postId: string;
    content: string;
}) {
    const userId = await requireSessionUserId();
    const content = data.content.trim();
    if (!content || content.length > MAX_BOARD_TEXT_LENGTH) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }
    const post = await fetchBoardPostById(data.postId);

    if (!post) {
        throw new Error(BOARD_ERR_POST_NOT_FOUND);
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);

    const comment = await db.boardComment.create({
        data: {
            postId: data.postId,
            content,
            authorStudentId: actor.authorStudentId ?? null,
            authorUserId: actor.authorUserId ?? null,
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
    const optionId = data.optionId.trim();
    if (!optionId) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }
    const post = await fetchBoardPostById(data.postId);

    if (!post) {
        throw new Error(BOARD_ERR_POST_NOT_FOUND);
    }

    if (post.pollClosed) {
        throw new Error(BOARD_ERR_POLL_CLOSED);
    }

    if (!post.poll) {
        throw new Error(BOARD_ERR_NO_POLL);
    }

    const pollOptions = Array.isArray(post.poll.options)
        ? (post.poll.options as BoardPollOptionInput[])
        : [];
    if (!pollOptions.some((option) => option.id === optionId)) {
        throw new Error(BOARD_ERR_INVALID_CONTENT);
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);

    const existing = await db.boardPollVote.findFirst({
        where: {
            pollId: post.poll.id,
            ...boardActorWhere(actor),
        },
    });

    if (existing) {
        return db.boardPollVote.update({
            where: { id: existing.id },
            data: { optionId },
        });
    }

    return db.boardPollVote.create({
        data: {
            optionId,
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
        throw new Error(BOARD_ERR_POST_NOT_FOUND);
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);
    assertTeacher(actor);

    return db.boardPost.update({
        where: { id: postId },
        data: { pollClosed: !post.pollClosed },
    });
}

export async function toggleBoardPostPin(postId: string) {
    const userId = await requireSessionUserId();
    const post = await fetchBoardPostById(postId);

    if (!post) {
        throw new Error(BOARD_ERR_POST_NOT_FOUND);
    }

    const actor = await resolveClassroomActor(post.board.classId, userId);
    assertTeacher(actor);

    const pinnedAt = post.pinnedAt ? null : new Date();

    return db.boardPost.update({
        where: { id: postId },
        data: { pinnedAt },
        select: { id: true, pinnedAt: true },
    });
}

