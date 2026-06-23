import { describe, expect, it, vi } from "vitest";
import { uploadBoardFilesParallel } from "@/lib/board-upload-client";

function makeFile(name: string, type = "application/pdf") {
    return new File(["demo"], name, { type });
}

describe("uploadBoardFilesParallel", () => {
    it("keeps result order and reports progress for each file", async () => {
        const files = [makeFile("one.pdf"), makeFile("two.pdf"), makeFile("three.pdf")];
        const progressCalls: string[] = [];

        const results = await uploadBoardFilesParallel(files, {
            concurrency: 2,
            onProgress: ({ current, total, fileName }) => {
                progressCalls.push(`${current}/${total}:${fileName}`);
            },
            upload: async (file) => ({
                url: `https://cdn.example.com/${file.name}`,
                originalFileName: file.name,
                type: file.type,
                size: file.size,
            }),
        });

        expect(results.map((item) => item.originalFileName)).toEqual([
            "one.pdf",
            "two.pdf",
            "three.pdf",
        ]);
        expect(progressCalls).toHaveLength(3);
        expect(progressCalls.map((entry) => entry.split(":")[1])).toEqual([
            "one.pdf",
            "two.pdf",
            "three.pdf",
        ]);
    });

    it("stops immediately when the signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        const upload = vi.fn();

        await expect(
            uploadBoardFilesParallel([makeFile("cancelled.pdf")], {
                signal: controller.signal,
                upload,
            })
        ).rejects.toThrow(/cancelled/i);

        expect(upload).not.toHaveBeenCalled();
    });
});
