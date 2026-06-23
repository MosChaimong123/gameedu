import { describe, expect, it } from "vitest"
import {
    createTeachingMediaReference,
    describeTeachingMediaReference,
    getLessonMediaBlockUsageReferences,
    getTeachingMediaUsageReferences,
    normalizeTeachingMediaReferences,
    type TeachingMediaReference,
} from "@/lib/teaching-media-reference"
import type { TeachingMediaItem } from "@/lib/actions/teaching-media-actions"

function buildMediaItem(overrides: Partial<TeachingMediaItem> = {}): TeachingMediaItem {
    return {
        id: "media-1",
        type: "link",
        title: "บทอ่าน",
        description: null,
        url: null,
        name: null,
        mimeType: null,
        size: null,
        youtubeId: null,
        linkUrl: "https://example.com/lesson",
        tags: [],
        source: null,
        isFavorite: false,
        isArchived: false,
        archivedAt: null,
        usageCount: 0,
        lastUsedAt: null,
        boardUsageCount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        ...overrides,
    }
}

describe("teaching media references", () => {
    it("creates a compact reference from a media library item", () => {
        const reference = createTeachingMediaReference(buildMediaItem())

        expect(reference).toEqual({
            mediaId: "media-1",
            type: "link",
            title: "บทอ่าน",
            linkUrl: "https://example.com/lesson",
            source: "media-library",
        })
    })

    it("normalizes only supported reference shapes", () => {
        const references = normalizeTeachingMediaReferences([
            { mediaId: "media-1", type: "image", title: " ภาพประกอบ ", url: "/uploads/a.png" },
            { type: "bad", title: "ไม่เอา" },
            { type: "link", title: "" },
            null,
        ])

        expect(references).toEqual([
            {
                mediaId: "media-1",
                type: "image",
                title: "ภาพประกอบ",
                url: "/uploads/a.png",
                source: "media-library",
            },
        ])
    })

    it("collects usage lookup keys for sync", () => {
        const references: TeachingMediaReference[] = [
            { mediaId: "media-1", type: "image", title: "ภาพ", url: "/uploads/a.png" },
            { mediaId: "media-1", type: "image", title: "ภาพซ้ำ", url: "/uploads/a.png" },
            { type: "youtube", title: "คลิป", youtubeId: "abcdefghijk" },
            { type: "link", title: "เว็บ", linkUrl: "https://example.com" },
        ]

        expect(getTeachingMediaUsageReferences(references)).toEqual({
            mediaIds: ["media-1"],
            urls: ["/uploads/a.png"],
            linkUrls: ["https://example.com"],
            youtubeIds: ["abcdefghijk"],
        })
    })

    it("collects usage keys from lesson media blocks", () => {
        expect(
            getLessonMediaBlockUsageReferences([
                { mediaId: "media-2", type: "video", title: "คลิปสอน", url: "https://cdn.example.com/video.mp4" },
                { mediaId: "media-2", type: "video", title: "คลิปสอนซ้ำ", url: "https://cdn.example.com/video.mp4" },
                { type: "image", title: "ภาพสรุป", url: "https://cdn.example.com/image.png" },
            ])
        ).toEqual({
            mediaIds: ["media-2"],
            urls: ["https://cdn.example.com/video.mp4", "https://cdn.example.com/image.png"],
            linkUrls: [],
            youtubeIds: [],
        })
    })

    it("describes the first usable target", () => {
        expect(
            describeTeachingMediaReference({
                type: "youtube",
                title: "คลิป",
                youtubeId: "abcdefghijk",
            })
        ).toBe("https://www.youtube.com/watch?v=abcdefghijk")
    })
})
