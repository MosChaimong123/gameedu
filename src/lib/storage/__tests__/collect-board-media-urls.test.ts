import { describe, expect, it } from "vitest";
import { collectBoardPostMediaUrls } from "@/lib/storage/collect-board-media-urls";

describe("collectBoardPostMediaUrls", () => {
    it("collects image, video, album, and attached file urls", () => {
        const urls = collectBoardPostMediaUrls({
            image: "/uploads/cover.jpg",
            videoUrl: "https://cdn.example.com/board/class-1/video.mp4",
            images: ["/uploads/a.jpg", "/uploads/b.jpg"],
            attachedFiles: [{ url: "/uploads/doc.pdf", name: "doc.pdf" }],
            fileUrl: "/uploads/legacy.pdf",
            fileName: "legacy.pdf",
        });

        expect(urls).toEqual(
            expect.arrayContaining([
                "/uploads/cover.jpg",
                "https://cdn.example.com/board/class-1/video.mp4",
                "/uploads/a.jpg",
                "/uploads/b.jpg",
                "/uploads/doc.pdf",
            ])
        );
    });
});
