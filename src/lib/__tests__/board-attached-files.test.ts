import { describe, expect, it } from "vitest";
import {
    normalizeAttachedFilesInput,
    parseBoardAttachedFiles,
} from "@/lib/board-attached-files";

describe("board-attached-files", () => {
    it("parses attached files json and falls back to legacy single file fields", () => {
        expect(
            parseBoardAttachedFiles(
                [
                    { url: "/uploads/a.pdf", name: "A.pdf" },
                    { url: "/uploads/b.pdf", name: "B.pdf" },
                ],
                null,
                null
            )
        ).toEqual([
            { url: "/uploads/a.pdf", name: "A.pdf" },
            { url: "/uploads/b.pdf", name: "B.pdf" },
        ]);

        expect(parseBoardAttachedFiles(null, "/uploads/legacy.pdf", "Legacy.pdf")).toEqual([
            { url: "/uploads/legacy.pdf", name: "Legacy.pdf" },
        ]);
    });

    it("normalizes attached files from explicit list or legacy url", () => {
        expect(
            normalizeAttachedFilesInput([
                { url: " /uploads/a.pdf ", name: " A.pdf " },
                { url: "/uploads/b.pdf", name: "" },
            ])
        ).toEqual([
            { url: "/uploads/a.pdf", name: "A.pdf" },
            { url: "/uploads/b.pdf", name: "file" },
        ]);

        expect(
            normalizeAttachedFilesInput(undefined, {
                fileUrl: "/uploads/only.pdf",
                fileName: "Only.pdf",
            })
        ).toEqual([{ url: "/uploads/only.pdf", name: "Only.pdf" }]);
    });
});
