import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MediaLibraryGrid } from "@/components/dashboard/media-library-grid";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        refresh: vi.fn(),
        replace: vi.fn(),
    }),
    usePathname: () => "/dashboard/media-library",
    useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/actions/teaching-media-actions", () => ({
    bulkArchiveTeachingMedia: vi.fn(),
    bulkRestoreTeachingMedia: vi.fn(),
    bulkUpdateTeachingMediaTags: vi.fn(),
    deleteTeachingMedia: vi.fn(),
    restoreTeachingMedia: vi.fn(),
    toggleTeachingMediaFavorite: vi.fn(),
    updateTeachingMedia: vi.fn(),
}));

describe("MediaLibraryGrid", () => {
    it("renders the Thai baseline controls and usage metadata", () => {
        const html = renderToStaticMarkup(
            <MediaLibraryGrid
                initialItems={[
                    {
                        id: "media-1",
                        type: "file",
                        title: "โจทย์เศษส่วน ป.5",
                        description: null,
                        url: "https://cdn.example.com/fractions.pdf",
                        name: "fractions-grade-5.pdf",
                        mimeType: "application/pdf",
                        size: 1024 * 1024 * 4,
                        youtubeId: null,
                        linkUrl: null,
                        tags: ["คณิตศาสตร์", "แบบฝึกหัด"],
                        source: "media-library",
                        isFavorite: true,
                        isArchived: false,
                        archivedAt: null,
                        usageCount: 1,
                        lastUsedAt: new Date("2026-06-07T12:00:00.000Z"),
                        boardUsageCount: 1,
                        createdAt: new Date("2026-06-07T10:00:00.000Z"),
                    },
                ]}
                total={1}
                page={1}
                pageSize={24}
                currentQuery=""
                currentType=""
                currentArchived="active"
                currentSort="newest"
                favoriteOnly={false}
                tagSuggestions={[{ tag: "คณิตศาสตร์", count: 2 }]}
            />
        );

        expect(html).toContain("ค้นหาชื่อสื่อหรือแท็ก");
        expect(html).toContain("ทั้งหมด");
        expect(html).toContain("ใช้งานอยู่");
        expect(html).toContain("เก็บถาวร");
        expect(html).toContain("ใหม่สุด");
        expect(html).toContain("โจทย์เศษส่วน ป.5");
        expect(html).toContain("ไฟล์");
        expect(html).toContain("1 รายการ");
        expect(html).toContain("ใช้งานแล้ว 1 ครั้ง");
        expect(html).toContain("ล่าสุด");
        expect(html).toContain("#คณิตศาสตร์");
        expect(html).toContain("#แบบฝึกหัด");
    });
});
