import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLessonFindMany = vi.fn();
const mockLessonCreate = vi.fn();
const mockLessonFindUnique = vi.fn();
const mockLessonUpdate = vi.fn();
const mockLessonDelete = vi.fn();
const mockTeachingMediaFindMany = vi.fn();
const mockTeachingMediaUpdate = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        lesson: {
            findMany: mockLessonFindMany,
            create: mockLessonCreate,
            findUnique: mockLessonFindUnique,
            update: mockLessonUpdate,
            delete: mockLessonDelete,
        },
        teachingMedia: {
            findMany: mockTeachingMediaFindMany,
            update: mockTeachingMediaUpdate,
        },
    },
}));

const legacyContent = {
    objectives: ["Understand the topic"],
    sections: [
        {
            id: "s1",
            heading: "Intro",
            content: "Main explanation",
            examples: [{ title: "Example", body: "Example body" }],
        },
    ],
    keyTerms: [{ term: "Term", definition: "Definition" }],
    summary: "Summary",
    estimatedMinutes: 30,
};

const validContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Forces",
        topics: [
            { id: "topic-1", title: "Force basics", order: 0 },
            { id: "topic-2", title: "Motion", order: 1 },
        ],
    },
    topics: [
        {
            id: "topic-1",
            title: "Force basics",
            order: 0,
            contentStatus: "generated",
            objectives: ["Explain force"],
            sections: [
                {
                    id: "section-1",
                    heading: "Meaning",
                    content: "Force is a push or pull.",
                    media: [{ id: "media-1", type: "video", url: "https://example.com/force.mp4" }],
                },
            ],
            documents: [{ type: "file", title: "Worksheet", url: "https://example.com/worksheet.pdf" }],
        },
        {
            id: "topic-2",
            title: "Motion",
            order: 1,
            contentStatus: "empty",
            objectives: [],
            sections: [],
        },
    ],
    estimatedMinutes: 25,
    metadata: {
        curriculum: {
            subject: "physics",
            curriculumCode: "basic_education_2551_revised_2560",
            gradeLevel: "ม.4",
            semester: 1,
            unitId: "phy-m4-s1-u01",
            learningOutcomeIds: ["phy-lo-m4-s1-u01-01"],
        },
    },
};

describe("teacher lesson CRUD routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockLessonFindMany.mockResolvedValue([]);
        mockLessonCreate.mockResolvedValue({ id: "lesson-1", title: "Physics", status: "DRAFT" });
        mockLessonFindUnique.mockResolvedValue({ id: "lesson-1", ownerUserId: "teacher-1", content: validContentV2 });
        mockLessonUpdate.mockResolvedValue({ id: "lesson-1", title: "Updated", status: "PUBLISHED" });
        mockLessonDelete.mockResolvedValue({});
        mockTeachingMediaFindMany.mockResolvedValue([]);
        mockTeachingMediaUpdate.mockResolvedValue({});
    });

    it("scopes lesson list to the signed-in teacher", async () => {
        mockLessonFindMany.mockResolvedValue([
            {
                id: "lesson-1",
                title: "Physics",
                subject: "physics",
                gradeLevel: "ม.4",
                description: "desc",
                status: "DRAFT",
                sourceFileName: null,
                content: validContentV2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                classroomAssignments: [],
            },
        ]);
        const { GET } = await import("@/app/api/lessons/route");
        const res = await GET();
        const payload = await res.json();

        expect(res.status).toBe(200);
        expect(mockLessonFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ownerUserId: "teacher-1" },
                orderBy: { createdAt: "desc" },
            })
        );
        expect(payload[0].normalizedCurriculumSummary).toMatchObject({
            subjectId: "physics",
            unitId: "physics-additional-m4-s1-u01",
            unitTitle: "หน่วยการเรียนรู้ที่ 1 การศึกษาวิชาฟิสิกส์",
        });
    });

    it("creates a draft lesson with validated content and trimmed fields", async () => {
        const { POST } = await import("@/app/api/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({
                    title: "  Physics  ",
                    subject: " Science ",
                    gradeLevel: " M5 ",
                    description: "  Lesson intro  ",
                    sourceFileName: " worksheet.pdf ",
                    content: validContentV2,
                }),
            })
        );
        const payload = await res.json();

        expect(res.status).toBe(201);
        expect(mockLessonCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                title: "Physics",
                subject: "Science",
                gradeLevel: "M5",
                description: "Lesson intro",
                sourceFileName: "worksheet.pdf",
                status: "DRAFT",
                ownerUserId: "teacher-1",
                content: expect.objectContaining({
                    ...validContentV2,
                    metadata: {
                        curriculum: expect.objectContaining({
                            subject: "physics",
                            unitId: "physics-additional-m4-s1-u01",
                        }),
                    },
                }),
            }),
        });
        expect(payload.normalizedCurriculumSummary).toMatchObject({
            subjectId: "physics",
            rawUnitId: "physics-additional-m4-s1-u01",
            unitId: "physics-additional-m4-s1-u01",
        });
    });

    it("rejects legacy V1 lesson content on create", async () => {
        const { POST } = await import("@/app/api/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: legacyContent }),
            })
        );

        expect(res.status).toBe(400);
        expect(mockLessonCreate).not.toHaveBeenCalled();
    });

    it("rejects invalid lesson content on create and update", async () => {
        const listRoute = await import("@/app/api/lessons/route");
        const createRes = await listRoute.POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: { sections: [] } }),
            })
        );

        const itemRoute = await import("@/app/api/lessons/[id]/route");
        const patchRes = await itemRoute.PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ content: { sections: [] } }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(createRes.status).toBe(400);
        expect(patchRes.status).toBe(400);
        expect(mockLessonCreate).not.toHaveBeenCalled();
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("blocks students from teacher lesson routes", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });

        const { POST } = await import("@/app/api/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: validContentV2 }),
            })
        );

        expect(res.status).toBe(403);
        expect(mockLessonCreate).not.toHaveBeenCalled();
    });

    it("prevents editing another teacher's lesson", async () => {
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-2", content: validContentV2 });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ title: "Updated" }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(res.status).toBe(403);
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("updates publish status and deletes owned lessons", async () => {
        const { PATCH, DELETE } = await import("@/app/api/lessons/[id]/route");
        const patchRes = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ title: " Updated ", status: "PUBLISHED", content: validContentV2, confirmPublishReady: true }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );
        const patchPayload = await patchRes.json();
        const deleteRes = await DELETE(new Request("http://localhost/api/lessons/lesson-1"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });

        expect(patchRes.status).toBe(200);
        expect(deleteRes.status).toBe(204);
        expect(mockLessonUpdate).toHaveBeenCalledWith({
            where: { id: "lesson-1" },
            data: expect.objectContaining({
                title: "Updated",
                status: "PUBLISHED",
                content: expect.objectContaining({
                    ...validContentV2,
                    metadata: {
                        curriculum: expect.objectContaining({
                            subject: "physics",
                            unitId: "physics-additional-m4-s1-u01",
                        }),
                    },
                }),
            }),
        });
        expect(mockLessonDelete).toHaveBeenCalledWith({ where: { id: "lesson-1" } });
        expect(patchPayload.normalizedCurriculumSummary).toMatchObject({
            subjectId: "physics",
            rawUnitId: "physics-additional-m4-s1-u01",
            unitId: "physics-additional-m4-s1-u01",
        });
    });

    it("returns normalized curriculum summary on lesson detail reads", async () => {
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            ownerUserId: "teacher-1",
            subject: "physics",
            content: validContentV2,
            classroomAssignments: [],
            assessmentAttempts: [],
            certificates: [],
        });

        const { GET } = await import("@/app/api/lessons/[id]/route");
        const res = await GET(new Request("http://localhost/api/lessons/lesson-1"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });
        const payload = await res.json();

        expect(res.status).toBe(200);
        expect(payload.normalizedCurriculumSummary).toMatchObject({
            subjectId: "physics",
            unitId: "physics-additional-m4-s1-u01",
            unitTitle: "หน่วยการเรียนรู้ที่ 1 การศึกษาวิชาฟิสิกส์",
        });
    });

    it("rejects publishing V2 lessons that have no generated topic content", async () => {
        mockLessonFindUnique.mockResolvedValue({
            ownerUserId: "teacher-1",
            content: {
                ...validContentV2,
                topics: validContentV2.topics.map((topic) => ({
                    ...topic,
                    contentStatus: "empty",
                    objectives: [],
                    sections: [],
                })),
            },
        });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED", confirmPublishReady: true }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(res.status).toBe(400);
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("rejects publishing when the teacher explicitly does not confirm readiness", async () => {
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-1", content: validContentV2 });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED", confirmPublishReady: false }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(res.status).toBe(400);
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("rejects publishing when teacher confirmation is omitted", async () => {
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-1", content: validContentV2 });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED" }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );
        const payload = await res.json();

        expect(res.status).toBe(400);
        expect(payload.error).toMatchObject({
            code: "LESSON_NOT_PUBLISH_READY",
            details: expect.arrayContaining([
                expect.objectContaining({ code: "TEACHER_CONFIRMATION_REQUIRED" }),
            ]),
        });
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("allows non-publish patches without teacher confirmation", async () => {
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-1", content: validContentV2 });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ title: " Revised draft ", status: "DRAFT" }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(res.status).toBe(200);
        expect(mockLessonUpdate).toHaveBeenCalledWith({
            where: { id: "lesson-1" },
            data: { title: "Revised draft", status: "DRAFT" },
        });
    });

    it("allows publishing without curriculum metadata (medium gate)", async () => {
        mockLessonFindUnique.mockResolvedValue({
            ownerUserId: "teacher-1",
            content: { ...validContentV2, metadata: undefined },
        });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED", confirmPublishReady: true }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(res.status).toBe(200);
        expect(mockLessonUpdate).toHaveBeenCalledWith({
            where: { id: "lesson-1" },
            data: { status: "PUBLISHED" },
        });
    });
});
