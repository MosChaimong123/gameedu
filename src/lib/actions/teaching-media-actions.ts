"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";
import { assertSafeHttpUrl, assertSafeUploadedMediaUrl, BOARD_ERR_INVALID_MEDIA } from "@/lib/safe-media-url";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { normalizeTeachingMediaReferences } from "@/lib/teaching-media-reference";

const MEDIA_TYPES = new Set(["file", "image", "video", "youtube", "link"]);
const MAX_TITLE_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_TAG_LENGTH = 40;
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export type TeachingMediaInput = {
    type: string;
    title: string;
    description?: string;
    url?: string;
    name?: string;
    mimeType?: string;
    size?: number;
    youtubeId?: string;
    linkUrl?: string;
    tags?: string[];
    source?: string;
};

export type TeachingMediaItem = {
    id: string;
    type: string;
    title: string;
    description: string | null;
    url: string | null;
    name: string | null;
    mimeType: string | null;
    size: number | null;
    youtubeId: string | null;
    linkUrl: string | null;
    tags: string[];
    source: string | null;
    isFavorite: boolean;
    isArchived: boolean;
    archivedAt: Date | null;
    usageCount: number;
    lastUsedAt: Date | null;
    boardUsageCount: number;
    createdAt: Date;
};

type TeachingMediaArchiveState = "active" | "archived" | "all";
export type TeachingMediaSort = "newest" | "oldest" | "name_asc" | "size_desc";
export type TeachingMediaTagSuggestion = {
    tag: string;
    count: number;
};
export type TeachingMediaStorageSummary = {
    activeCount: number;
    archivedCount: number;
    totalCount: number;
    activeBytes: number;
    archivedBytes: number;
    totalBytes: number;
};
export type TeachingMediaListResult = {
    items: TeachingMediaItem[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
};

type TeachingMediaUsageSnapshot = {
    usageCount: number;
    lastUsedAt: Date | null;
};

async function requireTeacherUserId() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
    }
    return session.user.id;
}

function normalizeTags(tags: string[] | undefined) {
    return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))]
        .map((tag) => tag.slice(0, MAX_TAG_LENGTH))
        .slice(0, 12);
}

function normalizeTeachingMediaInput(input: TeachingMediaInput): TeachingMediaInput {
    const type = input.type.trim();
    if (!MEDIA_TYPES.has(type)) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    const title = input.title.trim().slice(0, MAX_TITLE_LENGTH);
    if (!title) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    const description = input.description?.trim().slice(0, MAX_DESCRIPTION_LENGTH);
    const url = input.url?.trim();
    const linkUrl = input.linkUrl?.trim();
    const youtubeId = input.youtubeId?.trim();

    if ((type === "file" || type === "image" || type === "video") && !url) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
    if ((type === "file" || type === "image" || type === "video") && url) {
        assertSafeUploadedMediaUrl(url);
    }
    if (type === "link") {
        if (!linkUrl) throw new Error(BOARD_ERR_INVALID_MEDIA);
        assertSafeHttpUrl(linkUrl);
    }
    if (type === "youtube") {
        if (!youtubeId || !YOUTUBE_ID_PATTERN.test(youtubeId)) {
            throw new Error(BOARD_ERR_INVALID_MEDIA);
        }
    }

    return {
        ...input,
        type,
        title,
        description,
        url,
        linkUrl,
        youtubeId,
        name: input.name?.trim().slice(0, MAX_TITLE_LENGTH),
        mimeType: input.mimeType?.trim().slice(0, 120),
        size: Number.isFinite(input.size) ? Math.max(0, Math.floor(input.size ?? 0)) : undefined,
        tags: normalizeTags(input.tags),
        source: input.source?.trim().slice(0, 80),
    };
}

function buildTeachingMediaWhere(input: {
    ownerUserId: string;
    archived: TeachingMediaArchiveState;
    type?: string;
    query?: string;
    favorite?: boolean;
}) {
    const { ownerUserId, archived, type, query, favorite } = input;

    return {
        ownerUserId,
        ...(archived === "active"
            ? { isArchived: false }
            : archived === "archived"
              ? { isArchived: true }
              : {}),
        ...(type && MEDIA_TYPES.has(type) ? { type } : {}),
        ...(query
            ? {
                  OR: [
                      { title: { contains: query, mode: "insensitive" as const } },
                      { description: { contains: query, mode: "insensitive" as const } },
                      { tags: { has: query } },
                  ],
              }
            : {}),
        ...(favorite ? { isFavorite: true } : {}),
    };
}

function buildTeachingMediaOrderBy(sort: TeachingMediaSort) {
    if (sort === "oldest") return { createdAt: "asc" as const };
    if (sort === "name_asc") return { title: "asc" as const };
    if (sort === "size_desc") return { size: "desc" as const };
    return { createdAt: "desc" as const };
}

async function hydrateTeachingMediaItems(items: Awaited<ReturnType<typeof db.teachingMedia.findMany>>, ownerUserId: string) {
    const usageById = new Map<string, TeachingMediaUsageSnapshot>();

    await Promise.all(
        items.map(async (item) => {
            const snapshot = await getTeachingMediaUsageSnapshot(item, ownerUserId);
            usageById.set(item.id, snapshot);

            if ((item.usageCount ?? 0) !== snapshot.usageCount || (item.lastUsedAt?.getTime() ?? 0) !== (snapshot.lastUsedAt?.getTime() ?? 0)) {
                await db.teachingMedia.update({
                    where: { id: item.id },
                    data: {
                        usageCount: snapshot.usageCount,
                        lastUsedAt: snapshot.lastUsedAt,
                    },
                });
            }
        })
    );

    return items.map((item) => buildTeachingMediaItemFromRecord(item, usageById.get(item.id)));
}

function buildTeachingMediaItemFromRecord(
    item: Awaited<ReturnType<typeof db.teachingMedia.findFirst>> extends infer T ? NonNullable<T> : never,
    usage?: TeachingMediaUsageSnapshot
): TeachingMediaItem {
    const resolvedUsageCount = usage?.usageCount ?? item.usageCount ?? 0;
    const resolvedLastUsedAt = usage?.lastUsedAt ?? item.lastUsedAt ?? null;

    return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        url: item.url,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        youtubeId: item.youtubeId,
        linkUrl: item.linkUrl,
        tags: item.tags,
        source: item.source,
        isFavorite: item.isFavorite ?? false,
        isArchived: item.isArchived ?? false,
        archivedAt: item.archivedAt ?? null,
        usageCount: resolvedUsageCount,
        lastUsedAt: resolvedLastUsedAt,
        boardUsageCount: resolvedUsageCount,
        createdAt: item.createdAt,
    };
}

export async function listTeachingMediaPage(options?: {
    type?: string;
    query?: string;
    limit?: number;
    archived?: TeachingMediaArchiveState;
    sort?: TeachingMediaSort;
    page?: number;
    favorite?: boolean;
}): Promise<TeachingMediaListResult> {
    const ownerUserId = await requireTeacherUserId();
    const type = options?.type?.trim();
    const query = options?.query?.trim();
    const limit = Math.min(Math.max(options?.limit ?? 24, 1), 100);
    const archived = options?.archived ?? "active";
    const sort = options?.sort ?? "newest";
    const page = Math.max(options?.page ?? 1, 1);
    const favorite = options?.favorite ?? false;
    const where = buildTeachingMediaWhere({ ownerUserId, archived, type, query, favorite });

    const total = await db.teachingMedia.count({ where });
    const items = await db.teachingMedia.findMany({
        where,
        orderBy: buildTeachingMediaOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
    });

    const hydratedItems = await hydrateTeachingMediaItems(items, ownerUserId);

    return {
        items: hydratedItems,
        total,
        page,
        pageSize: limit,
        hasMore: page * limit < total,
    };
}

export async function listTeachingMedia(options?: {
    type?: string;
    query?: string;
    limit?: number;
    archived?: TeachingMediaArchiveState;
    sort?: TeachingMediaSort;
    favorite?: boolean;
}): Promise<TeachingMediaItem[]> {
    const result = await listTeachingMediaPage({
        type: options?.type,
        query: options?.query,
        limit: options?.limit,
        archived: options?.archived,
        sort: options?.sort,
        favorite: options?.favorite,
        page: 1,
    });

    return result.items;
}

export async function updateTeachingMedia(
    id: string,
    input: { title?: string; tags?: string[]; description?: string }
): Promise<TeachingMediaItem> {
    const ownerUserId = await requireTeacherUserId();
    const item = await db.teachingMedia.findFirst({ where: { id, ownerUserId } });
    if (!item) throw new Error("NOT_FOUND");

    const title = input.title?.trim().slice(0, MAX_TITLE_LENGTH);
    if (title !== undefined && !title) throw new Error(BOARD_ERR_INVALID_MEDIA);

    const updated = await db.teachingMedia.update({
        where: { id },
        data: {
            ...(title ? { title } : {}),
            ...(input.description !== undefined
                ? { description: input.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null }
                : {}),
            ...(input.tags !== undefined ? { tags: normalizeTags(input.tags) } : {}),
        },
    });

    return buildTeachingMediaItemFromRecord(updated, await getTeachingMediaUsageSnapshot(updated, ownerUserId));
}

export async function toggleTeachingMediaFavorite(id: string): Promise<TeachingMediaItem> {
    const ownerUserId = await requireTeacherUserId();
    const item = await db.teachingMedia.findFirst({ where: { id, ownerUserId } });
    if (!item) throw new Error("NOT_FOUND");

    const updated = await db.teachingMedia.update({
        where: { id },
        data: {
            isFavorite: !(item.isFavorite ?? false),
        },
    });

    return buildTeachingMediaItemFromRecord(updated, await getTeachingMediaUsageSnapshot(updated, ownerUserId));
}

export async function deleteTeachingMedia(id: string): Promise<void> {
    const ownerUserId = await requireTeacherUserId();
    const item = await db.teachingMedia.findFirst({ where: { id, ownerUserId } });
    if (!item) throw new Error("NOT_FOUND");
    await db.teachingMedia.update({
        where: { id },
        data: {
            isArchived: true,
            archivedAt: new Date(),
        },
    });
}

export async function restoreTeachingMedia(id: string): Promise<TeachingMediaItem> {
    const ownerUserId = await requireTeacherUserId();
    const item = await db.teachingMedia.findFirst({ where: { id, ownerUserId } });
    if (!item) throw new Error("NOT_FOUND");

    const restored = await db.teachingMedia.update({
        where: { id },
        data: {
            isArchived: false,
            archivedAt: null,
        },
    });

    return buildTeachingMediaItemFromRecord(restored, await getTeachingMediaUsageSnapshot(restored, ownerUserId));
}

function normalizeMediaIds(ids: string[]) {
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
}

export async function bulkArchiveTeachingMedia(ids: string[]): Promise<{ count: number }> {
    const ownerUserId = await requireTeacherUserId();
    const mediaIds = normalizeMediaIds(ids);
    if (mediaIds.length === 0) return { count: 0 };

    const result = await db.teachingMedia.updateMany({
        where: {
            ownerUserId,
            id: { in: mediaIds },
            isArchived: false,
        },
        data: {
            isArchived: true,
            archivedAt: new Date(),
        },
    });

    return { count: result.count };
}

export async function bulkRestoreTeachingMedia(ids: string[]): Promise<{ count: number }> {
    const ownerUserId = await requireTeacherUserId();
    const mediaIds = normalizeMediaIds(ids);
    if (mediaIds.length === 0) return { count: 0 };

    const result = await db.teachingMedia.updateMany({
        where: {
            ownerUserId,
            id: { in: mediaIds },
            isArchived: true,
        },
        data: {
            isArchived: false,
            archivedAt: null,
        },
    });

    return { count: result.count };
}

export async function bulkUpdateTeachingMediaTags(
    ids: string[],
    input: { mode: "add" | "remove"; tags: string[] }
): Promise<{ count: number }> {
    const ownerUserId = await requireTeacherUserId();
    const mediaIds = normalizeMediaIds(ids);
    const tags = normalizeTags(input.tags);
    if (mediaIds.length === 0 || tags.length === 0) return { count: 0 };

    const items = await db.teachingMedia.findMany({
        where: {
            ownerUserId,
            id: { in: mediaIds },
        },
        select: {
            id: true,
            tags: true,
        },
    });

    await Promise.all(
        items.map((item) => {
            const nextTags =
                input.mode === "add"
                    ? normalizeTags([...item.tags, ...tags])
                    : item.tags.filter((tag) => !tags.includes(tag));

            return db.teachingMedia.update({
                where: { id: item.id },
                data: { tags: nextTags },
            });
        })
    );

    return { count: items.length };
}

export async function createTeachingMedia(input: TeachingMediaInput): Promise<TeachingMediaItem> {
    const ownerUserId = await requireTeacherUserId();
    const media = normalizeTeachingMediaInput(input);

    const existing = await db.teachingMedia.findFirst({
        where: {
            ownerUserId,
            type: media.type,
            ...(media.url
                ? { url: media.url }
                : media.linkUrl
                  ? { linkUrl: media.linkUrl }
                  : media.youtubeId
                    ? { youtubeId: media.youtubeId }
                    : {}),
        },
    });

    if (existing) {
        const revived = existing.isArchived
            ? await db.teachingMedia.update({
                  where: { id: existing.id },
                  data: {
                      title: media.title,
                      description: media.description,
                      url: media.url,
                      name: media.name,
                      mimeType: media.mimeType,
                      size: media.size,
                      youtubeId: media.youtubeId,
                      linkUrl: media.linkUrl,
                      tags: media.tags ?? [],
                      source: media.source,
                      isFavorite: existing.isFavorite ?? false,
                      isArchived: false,
                      archivedAt: null,
                  },
              })
            : existing;
        return buildTeachingMediaItemFromRecord(revived, await getTeachingMediaUsageSnapshot(revived, ownerUserId));
    }

    const created = await db.teachingMedia.create({
        data: {
            ownerUserId,
            type: media.type,
            title: media.title,
            description: media.description,
            url: media.url,
            name: media.name,
            mimeType: media.mimeType,
            size: media.size,
            youtubeId: media.youtubeId,
            linkUrl: media.linkUrl,
            tags: media.tags ?? [],
            source: media.source,
        },
    });

    return buildTeachingMediaItemFromRecord(created, { usageCount: 0, lastUsedAt: null });
}

function buildBoardMediaUsageFilters(
    item: Pick<TeachingMediaItem, "type" | "url" | "linkUrl" | "youtubeId">,
) {
    const orFilters: Array<Record<string, unknown>> = [];
    if (item.linkUrl) orFilters.push({ linkUrl: item.linkUrl });
    if (item.url) {
        orFilters.push({ fileUrl: item.url });
        orFilters.push({ videoUrl: item.url });
        orFilters.push({ image: item.url });
        orFilters.push({ images: { has: item.url } });
    }
    if (item.youtubeId) orFilters.push({ youtubeId: item.youtubeId });
    return orFilters;
}

async function getTeacherBoardIds(ownerUserId: string) {
    const classrooms = await db.classroom.findMany({
        where: { teacherId: ownerUserId },
        select: { boards: { select: { id: true } } },
    });
    return classrooms.flatMap((classroom) => classroom.boards.map((board) => board.id));
}

async function getBoardMediaUsageSnapshot(
    item: Pick<TeachingMediaItem, "type" | "url" | "linkUrl" | "youtubeId">,
    ownerUserId: string
): Promise<TeachingMediaUsageSnapshot> {
    const boardIds = await getTeacherBoardIds(ownerUserId);
    if (boardIds.length === 0) {
        return { usageCount: 0, lastUsedAt: null };
    }

    const orFilters = buildBoardMediaUsageFilters(item);
    if (orFilters.length === 0) {
        return { usageCount: 0, lastUsedAt: null };
    }

    const where = {
        boardId: { in: boardIds },
        OR: orFilters,
    };

    const [usageCount, lastUsedPost] = await Promise.all([
        db.boardPost.count({ where }),
        db.boardPost.findFirst({
            where,
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
        }),
    ]);

    return {
        usageCount,
        lastUsedAt: lastUsedPost?.updatedAt ?? null,
    };
}

function referenceMatchesTeachingMedia(
    reference: ReturnType<typeof normalizeTeachingMediaReferences>[number],
    item: Pick<TeachingMediaItem, "id" | "url" | "linkUrl" | "youtubeId">
) {
    return (
        reference.mediaId === item.id ||
        (Boolean(item.url) && reference.url === item.url) ||
        (Boolean(item.linkUrl) && reference.linkUrl === item.linkUrl) ||
        (Boolean(item.youtubeId) && reference.youtubeId === item.youtubeId)
    );
}

async function getAssignmentMediaUsageSnapshot(
    item: Pick<TeachingMediaItem, "id" | "url" | "linkUrl" | "youtubeId">,
    ownerUserId: string
): Promise<TeachingMediaUsageSnapshot> {
    const classrooms = await db.classroom.findMany({
        where: { teacherId: ownerUserId },
        select: {
            assignments: {
                select: {
                    updatedAt: true,
                    mediaReferences: true,
                },
            },
        },
    });

    let usageCount = 0;
    let lastUsedAt: Date | null = null;

    for (const assignment of classrooms.flatMap((classroom) => classroom.assignments)) {
        const references = normalizeTeachingMediaReferences(assignment.mediaReferences);
        if (!references.some((reference) => referenceMatchesTeachingMedia(reference, item))) continue;
        usageCount += 1;
        if (!lastUsedAt || assignment.updatedAt > lastUsedAt) {
            lastUsedAt = assignment.updatedAt;
        }
    }

    return { usageCount, lastUsedAt };
}

async function getLessonMediaUsageSnapshot(
    item: Pick<TeachingMediaItem, "id" | "url" | "linkUrl" | "youtubeId">,
    ownerUserId: string
): Promise<TeachingMediaUsageSnapshot> {
    const lessons = await db.lesson.findMany({
        where: { ownerUserId },
        select: {
            updatedAt: true,
            content: true,
        },
    });

    let usageCount = 0;
    let lastUsedAt: Date | null = null;

    for (const lesson of lessons) {
        const content = lesson.content && typeof lesson.content === "object" ? lesson.content as Record<string, unknown> : {};
        const references = normalizeTeachingMediaReferences(content.mediaReferences);
        if (!references.some((reference) => referenceMatchesTeachingMedia(reference, item))) continue;
        usageCount += 1;
        if (!lastUsedAt || lesson.updatedAt > lastUsedAt) {
            lastUsedAt = lesson.updatedAt;
        }
    }

    return { usageCount, lastUsedAt };
}

async function getTeachingMediaUsageSnapshot(
    item: Pick<TeachingMediaItem, "id" | "type" | "url" | "linkUrl" | "youtubeId">,
    ownerUserId: string
): Promise<TeachingMediaUsageSnapshot> {
    const [board, assignment, lesson] = await Promise.all([
        getBoardMediaUsageSnapshot(item, ownerUserId),
        getAssignmentMediaUsageSnapshot(item, ownerUserId),
        getLessonMediaUsageSnapshot(item, ownerUserId),
    ]);

    const lastUsedAt = [board.lastUsedAt, assignment.lastUsedAt, lesson.lastUsedAt]
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
        usageCount: board.usageCount + assignment.usageCount + lesson.usageCount,
        lastUsedAt,
    };
}

export async function syncTeachingMediaUsageForOwner(
    ownerUserId: string,
    references?: {
        mediaIds?: string[];
        urls?: string[];
        linkUrls?: string[];
        youtubeIds?: string[];
    }
) {
    const mediaIds = [...new Set((references?.mediaIds ?? []).filter(Boolean))];
    const urls = [...new Set((references?.urls ?? []).filter(Boolean))];
    const linkUrls = [...new Set((references?.linkUrls ?? []).filter(Boolean))];
    const youtubeIds = [...new Set((references?.youtubeIds ?? []).filter(Boolean))];

    const mediaWhere =
        mediaIds.length > 0 || urls.length > 0 || linkUrls.length > 0 || youtubeIds.length > 0
            ? {
                  ownerUserId,
                  OR: [
                      ...mediaIds.map((id) => ({ id })),
                      ...urls.map((url) => ({ url })),
                      ...linkUrls.map((linkUrl) => ({ linkUrl })),
                      ...youtubeIds.map((youtubeId) => ({ youtubeId })),
                  ],
              }
            : { ownerUserId };

    const items = await db.teachingMedia.findMany({
        where: mediaWhere,
        select: {
            id: true,
            type: true,
            url: true,
            linkUrl: true,
            youtubeId: true,
            usageCount: true,
            lastUsedAt: true,
        },
    });

    await Promise.all(
        items.map(async (item) => {
            const snapshot = await getTeachingMediaUsageSnapshot(
                {
                    id: item.id,
                    type: item.type,
                    url: item.url,
                    linkUrl: item.linkUrl,
                    youtubeId: item.youtubeId,
                },
                ownerUserId
            );

            if ((item.usageCount ?? 0) === snapshot.usageCount && (item.lastUsedAt?.getTime() ?? 0) === (snapshot.lastUsedAt?.getTime() ?? 0)) {
                return;
            }

            await db.teachingMedia.update({
                where: { id: item.id },
                data: {
                    usageCount: snapshot.usageCount,
                    lastUsedAt: snapshot.lastUsedAt,
                },
            });
        })
    );
}

export async function getTeachingMediaTypeCounts() {
    const ownerUserId = await requireTeacherUserId();
    const baseWhere = { ownerUserId, isArchived: false };
    const [file, image, video, youtube, link] = await Promise.all([
        db.teachingMedia.count({ where: { ...baseWhere, type: "file" } }),
        db.teachingMedia.count({ where: { ...baseWhere, type: "image" } }),
        db.teachingMedia.count({ where: { ...baseWhere, type: "video" } }),
        db.teachingMedia.count({ where: { ...baseWhere, type: "youtube" } }),
        db.teachingMedia.count({ where: { ...baseWhere, type: "link" } }),
    ]);

    return { file, image, video, youtube, link };
}

export async function getTeachingMediaStorageSummary(): Promise<TeachingMediaStorageSummary> {
    const ownerUserId = await requireTeacherUserId();
    const [activeCount, archivedCount, activeStorage, archivedStorage] = await Promise.all([
        db.teachingMedia.count({ where: { ownerUserId, isArchived: false } }),
        db.teachingMedia.count({ where: { ownerUserId, isArchived: true } }),
        db.teachingMedia.aggregate({
            where: { ownerUserId, isArchived: false },
            _sum: { size: true },
        }),
        db.teachingMedia.aggregate({
            where: { ownerUserId, isArchived: true },
            _sum: { size: true },
        }),
    ]);
    const activeBytes = activeStorage._sum.size ?? 0;
    const archivedBytes = archivedStorage._sum.size ?? 0;

    return {
        activeCount,
        archivedCount,
        totalCount: activeCount + archivedCount,
        activeBytes,
        archivedBytes,
        totalBytes: activeBytes + archivedBytes,
    };
}

export async function getTeachingMediaTagSuggestions(limit = 12): Promise<TeachingMediaTagSuggestion[]> {
    const ownerUserId = await requireTeacherUserId();
    const items = await db.teachingMedia.findMany({
        where: { ownerUserId, isArchived: false },
        select: { tags: true },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    const counts = new Map<string, number>();
    for (const item of items) {
        for (const tag of item.tags) {
            const normalized = tag.trim();
            if (!normalized) continue;
            counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0], "th");
        })
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
}
