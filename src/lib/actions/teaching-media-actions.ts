"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";
import { assertSafeHttpUrl, assertSafeUploadedMediaUrl, BOARD_ERR_INVALID_MEDIA } from "@/lib/safe-media-url";
import { isTeacherOrAdmin } from "@/lib/role-guards";

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
    createdAt: Date;
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

export async function listTeachingMedia(options?: {
    type?: string;
    query?: string;
    limit?: number;
}): Promise<TeachingMediaItem[]> {
    const ownerUserId = await requireTeacherUserId();
    const type = options?.type?.trim();
    const query = options?.query?.trim();
    const limit = Math.min(Math.max(options?.limit ?? 60, 1), 100);

    const items = await db.teachingMedia.findMany({
        where: {
            ownerUserId,
            ...(type && MEDIA_TYPES.has(type) ? { type } : {}),
            ...(query
                ? {
                      OR: [
                          { title: { contains: query, mode: "insensitive" } },
                          { description: { contains: query, mode: "insensitive" } },
                          { tags: { has: query } },
                      ],
                  }
                : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    return items.map((item) => ({
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
        createdAt: item.createdAt,
    }));
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
        return {
            id: existing.id,
            type: existing.type,
            title: existing.title,
            description: existing.description,
            url: existing.url,
            name: existing.name,
            mimeType: existing.mimeType,
            size: existing.size,
            youtubeId: existing.youtubeId,
            linkUrl: existing.linkUrl,
            tags: existing.tags,
            source: existing.source,
            createdAt: existing.createdAt,
        };
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

    return {
        id: created.id,
        type: created.type,
        title: created.title,
        description: created.description,
        url: created.url,
        name: created.name,
        mimeType: created.mimeType,
        size: created.size,
        youtubeId: created.youtubeId,
        linkUrl: created.linkUrl,
        tags: created.tags,
        source: created.source,
        createdAt: created.createdAt,
    };
}
