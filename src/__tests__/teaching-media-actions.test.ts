import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();
const updateManyMock = vi.fn();
const createMock = vi.fn();
const aggregateMock = vi.fn();
const boardCountMock = vi.fn();
const boardFindFirstMock = vi.fn();
const classroomFindManyMock = vi.fn();
const lessonFindManyMock = vi.fn();

vi.mock("@/auth", () => ({
    auth: authMock,
}));

vi.mock("@/lib/db", () => ({
    db: {
        teachingMedia: {
            findMany: findManyMock,
            count: countMock,
            findFirst: findFirstMock,
            update: updateMock,
            updateMany: updateManyMock,
            create: createMock,
            aggregate: aggregateMock,
        },
        boardPost: {
            count: boardCountMock,
            findFirst: boardFindFirstMock,
        },
        classroom: {
            findMany: classroomFindManyMock,
        },
        lesson: {
            findMany: lessonFindManyMock,
        },
    },
}));

describe("teaching media actions", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        classroomFindManyMock.mockResolvedValue([{ boards: [{ id: "board-1" }], assignments: [] }]);
        lessonFindManyMock.mockResolvedValue([]);
        boardCountMock.mockResolvedValue(2);
        boardFindFirstMock.mockResolvedValue({ updatedAt: new Date("2026-06-07T12:00:00.000Z") });
        countMock.mockResolvedValue(1);
        updateManyMock.mockResolvedValue({ count: 2 });
        aggregateMock.mockResolvedValue({ _sum: { size: 0 } });
    });

    it("lists active media by default and includes archive metadata", async () => {
        findManyMock.mockResolvedValue([
            {
                id: "media-1",
                type: "file",
                title: "ใบงาน",
                description: null,
                url: "https://cdn.example.com/a.pdf",
                name: "a.pdf",
                mimeType: "application/pdf",
                size: 1000,
                youtubeId: null,
                linkUrl: null,
                tags: [],
                source: "media-library",
                isFavorite: false,
                isArchived: false,
                archivedAt: null,
                usageCount: 0,
                lastUsedAt: null,
                createdAt: new Date("2026-06-07T10:00:00.000Z"),
            },
        ]);

        const { listTeachingMedia } = await import("@/lib/actions/teaching-media-actions");
        const items = await listTeachingMedia();

        expect(findManyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    ownerUserId: "teacher-1",
                    isArchived: false,
                }),
            })
        );
        expect(items[0]).toMatchObject({
            id: "media-1",
            isArchived: false,
            usageCount: 2,
            boardUsageCount: 2,
        });
    });

    it("rejects unauthenticated media actions before touching storage", async () => {
        authMock.mockResolvedValue(null);

        const { listTeachingMediaPage, bulkArchiveTeachingMedia } = await import("@/lib/actions/teaching-media-actions");

        await expect(listTeachingMediaPage()).rejects.toThrow("Unauthorized");
        await expect(bulkArchiveTeachingMedia(["media-1"])).rejects.toThrow("Unauthorized");
        expect(findManyMock).not.toHaveBeenCalled();
        expect(updateManyMock).not.toHaveBeenCalled();
    });

    it("rejects student-role media actions before touching storage", async () => {
        authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });

        const { createTeachingMedia, getTeachingMediaStorageSummary } = await import("@/lib/actions/teaching-media-actions");

        await expect(
            createTeachingMedia({
                type: "link",
                title: "Student link",
                linkUrl: "https://example.com",
            })
        ).rejects.toThrow("Unauthorized");
        await expect(getTeachingMediaStorageSummary()).rejects.toThrow("Unauthorized");
        expect(createMock).not.toHaveBeenCalled();
        expect(aggregateMock).not.toHaveBeenCalled();
    });

    it("supports server-side paging and sorting metadata", async () => {
        findManyMock.mockResolvedValue([
            {
                id: "media-2",
                type: "image",
                title: "ภาพประกอบ",
                description: null,
                url: "https://cdn.example.com/image.png",
                name: "image.png",
                mimeType: "image/png",
                size: 2048,
                youtubeId: null,
                linkUrl: null,
                tags: ["วิทยาศาสตร์"],
                source: "media-library",
                isFavorite: true,
                isArchived: false,
                archivedAt: null,
                usageCount: 0,
                lastUsedAt: null,
                createdAt: new Date("2026-06-07T11:00:00.000Z"),
            },
        ]);
        countMock.mockResolvedValue(31);

        const { listTeachingMediaPage } = await import("@/lib/actions/teaching-media-actions");
        const result = await listTeachingMediaPage({
            archived: "all",
            sort: "size_desc",
            page: 2,
            limit: 24,
        });

        expect(findManyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { size: "desc" },
                skip: 24,
                take: 24,
            })
        );
        expect(result).toMatchObject({
            total: 31,
            page: 2,
            pageSize: 24,
            hasMore: false,
        });
    });

    it("archives media instead of deleting it", async () => {
        findFirstMock.mockResolvedValue({
            id: "media-1",
            ownerUserId: "teacher-1",
        });

        const { deleteTeachingMedia } = await import("@/lib/actions/teaching-media-actions");
        await deleteTeachingMedia("media-1");

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "media-1" },
            data: expect.objectContaining({
                isArchived: true,
                archivedAt: expect.any(Date),
            }),
        });
    });

    it("restores archived media back into the active library", async () => {
        findFirstMock.mockResolvedValue({
            id: "media-1",
            ownerUserId: "teacher-1",
        });
        updateMock.mockResolvedValue({
            id: "media-1",
            type: "file",
            title: "ใบงาน",
            description: null,
            url: "https://cdn.example.com/a.pdf",
            name: "a.pdf",
            mimeType: "application/pdf",
            size: 1000,
            youtubeId: null,
            linkUrl: null,
            tags: [],
            source: "media-library",
            isFavorite: false,
            isArchived: false,
            archivedAt: null,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: new Date("2026-06-07T10:00:00.000Z"),
        });

        const { restoreTeachingMedia } = await import("@/lib/actions/teaching-media-actions");
        const restored = await restoreTeachingMedia("media-1");

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "media-1" },
            data: {
                isArchived: false,
                archivedAt: null,
            },
        });
        expect(restored).toMatchObject({
            id: "media-1",
            isArchived: false,
            boardUsageCount: 2,
        });
    });

    it("toggles favorite status for a media item", async () => {
        findFirstMock.mockResolvedValue({
            id: "media-1",
            ownerUserId: "teacher-1",
            isFavorite: false,
        });
        updateMock.mockResolvedValue({
            id: "media-1",
            type: "file",
            title: "เนเธเธเธฒเธ",
            description: null,
            url: "https://cdn.example.com/a.pdf",
            name: "a.pdf",
            mimeType: "application/pdf",
            size: 1000,
            youtubeId: null,
            linkUrl: null,
            tags: [],
            source: "media-library",
            isFavorite: true,
            isArchived: false,
            archivedAt: null,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: new Date("2026-06-07T10:00:00.000Z"),
        });

        const { toggleTeachingMediaFavorite } = await import("@/lib/actions/teaching-media-actions");
        const updated = await toggleTeachingMediaFavorite("media-1");

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "media-1" },
            data: { isFavorite: true },
        });
        expect(updated).toMatchObject({
            id: "media-1",
            isFavorite: true,
            boardUsageCount: 2,
        });
    });

    it("archives multiple owned media records in one call", async () => {
        const { bulkArchiveTeachingMedia } = await import("@/lib/actions/teaching-media-actions");
        const result = await bulkArchiveTeachingMedia(["media-1", "media-2", "media-1"]);

        expect(updateManyMock).toHaveBeenCalledWith({
            where: {
                ownerUserId: "teacher-1",
                id: { in: ["media-1", "media-2"] },
                isArchived: false,
            },
            data: {
                isArchived: true,
                archivedAt: expect.any(Date),
            },
        });
        expect(result).toEqual({ count: 2 });
    });

    it("restores multiple owned archived records in one call", async () => {
        const { bulkRestoreTeachingMedia } = await import("@/lib/actions/teaching-media-actions");
        const result = await bulkRestoreTeachingMedia(["media-1", "media-2", "media-2"]);

        expect(updateManyMock).toHaveBeenCalledWith({
            where: {
                ownerUserId: "teacher-1",
                id: { in: ["media-1", "media-2"] },
                isArchived: true,
            },
            data: {
                isArchived: false,
                archivedAt: null,
            },
        });
        expect(result).toEqual({ count: 2 });
    });

    it("adds and removes tags across selected media", async () => {
        findManyMock.mockResolvedValue([
            { id: "media-1", tags: ["เดิม"] },
            { id: "media-2", tags: ["เดิม", "ลบ"] },
        ]);

        const { bulkUpdateTeachingMediaTags } = await import("@/lib/actions/teaching-media-actions");
        await bulkUpdateTeachingMediaTags(["media-1", "media-2"], {
            mode: "add",
            tags: ["ใหม่", "เดิม"],
        });

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "media-1" },
            data: { tags: ["เดิม", "ใหม่"] },
        });
        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "media-2" },
            data: { tags: ["เดิม", "ลบ", "ใหม่"] },
        });
    });

    it("summarizes active and archived storage", async () => {
        countMock.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
        aggregateMock
            .mockResolvedValueOnce({ _sum: { size: 1024 * 1024 * 10 } })
            .mockResolvedValueOnce({ _sum: { size: 1024 * 1024 * 4 } });

        const { getTeachingMediaStorageSummary } = await import("@/lib/actions/teaching-media-actions");
        const summary = await getTeachingMediaStorageSummary();

        expect(summary).toEqual({
            activeCount: 3,
            archivedCount: 2,
            totalCount: 5,
            activeBytes: 1024 * 1024 * 10,
            archivedBytes: 1024 * 1024 * 4,
            totalBytes: 1024 * 1024 * 14,
        });
    });
});
