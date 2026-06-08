import type { TeachingMediaItem } from "@/lib/actions/teaching-media-actions";

const MEDIA_REFERENCE_TYPES = new Set(["file", "image", "video", "youtube", "link"]);

export type TeachingMediaReference = {
    mediaId?: string;
    type: string;
    title: string;
    url?: string;
    name?: string;
    mimeType?: string;
    size?: number;
    youtubeId?: string;
    linkUrl?: string;
    source?: string;
};

export function createTeachingMediaReference(item: TeachingMediaItem): TeachingMediaReference {
    return {
        mediaId: item.id,
        type: item.type,
        title: item.title,
        url: item.url ?? undefined,
        name: item.name ?? undefined,
        mimeType: item.mimeType ?? undefined,
        size: item.size ?? undefined,
        youtubeId: item.youtubeId ?? undefined,
        linkUrl: item.linkUrl ?? undefined,
        source: "media-library",
    };
}

export function normalizeTeachingMediaReferences(value: unknown): TeachingMediaReference[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((entry): TeachingMediaReference | null => {
            if (!entry || typeof entry !== "object") return null;
            const item = entry as Record<string, unknown>;
            const type = typeof item.type === "string" ? item.type.trim() : "";
            const title = typeof item.title === "string" ? item.title.trim() : "";
            if (!MEDIA_REFERENCE_TYPES.has(type) || !title) return null;

            return {
                mediaId: typeof item.mediaId === "string" ? item.mediaId : undefined,
                type,
                title: title.slice(0, 180),
                url: typeof item.url === "string" ? item.url : undefined,
                name: typeof item.name === "string" ? item.name : undefined,
                mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
                size: typeof item.size === "number" && Number.isFinite(item.size) ? Math.max(0, Math.floor(item.size)) : undefined,
                youtubeId: typeof item.youtubeId === "string" ? item.youtubeId : undefined,
                linkUrl: typeof item.linkUrl === "string" ? item.linkUrl : undefined,
                source: typeof item.source === "string" ? item.source : "media-library",
            };
        })
        .filter((entry): entry is TeachingMediaReference => Boolean(entry))
        .slice(0, 20);
}

export function describeTeachingMediaReference(reference: TeachingMediaReference) {
    if (reference.linkUrl) return reference.linkUrl;
    if (reference.url) return reference.url;
    if (reference.youtubeId) return `https://www.youtube.com/watch?v=${reference.youtubeId}`;
    return reference.name ?? reference.title;
}

export function getTeachingMediaUsageReferences(references: TeachingMediaReference[]) {
    return {
        mediaIds: [...new Set(references.flatMap((reference) => (reference.mediaId ? [reference.mediaId] : [])))],
        urls: [...new Set(references.flatMap((reference) => (reference.url ? [reference.url] : [])))],
        linkUrls: [...new Set(references.flatMap((reference) => (reference.linkUrl ? [reference.linkUrl] : [])))],
        youtubeIds: [...new Set(references.flatMap((reference) => (reference.youtubeId ? [reference.youtubeId] : [])))],
    };
}
