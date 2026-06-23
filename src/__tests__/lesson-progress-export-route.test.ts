import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLessonFindUnique = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        lesson: {
            findUnique: mockLessonFindUnique,
        },
    },
}));

describe("GET /api/lessons/[id]/progress/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            title: "Physics Lesson",
            ownerUserId: "teacher-1",
            content: {
                schemaVersion: "lesson_content_v2",
                outline: {
                    title: "Physics",
                    topics: [
                        { id: "topic-1", title: "Force", order: 0 },
                        { id: "topic-2", title: "Motion", order: 1 },
                    ],
                },
                topics: [
                    {
                        id: "topic-1",
                        title: "Force",
                        order: 0,
                        contentStatus: "generated",
                        objectives: ["Explain force"],
                        sections: [{ id: "section-1", heading: "Intro", content: "Force content" }],
                        assessment: {
                            id: "topic-assessment-1",
                            title: "Force quiz",
                            questionSetId: "set-topic-1",
                            passScore: 1,
                            source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" },
                        },
                    },
                    {
                        id: "topic-2",
                        title: "Motion",
                        order: 1,
                        contentStatus: "generated",
                        objectives: ["Explain motion"],
                        sections: [{ id: "section-2", heading: "Motion", content: "Motion content" }],
                        assessment: {
                            id: "topic-assessment-2",
                            title: "Motion quiz",
                            questionSetId: "set-topic-2",
                            passScore: 1,
                            source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-2" },
                        },
                    },
                ],
                estimatedMinutes: 20,
            },
            assessmentAttempts: [
                {
                    id: "attempt-1",
                    classId: "class-1",
                    studentId: "student-1",
                    questionSetId: "set-topic-1",
                    assessmentSourceType: "topic",
                    topicId: "topic-1",
                    topicAssessmentId: "topic-assessment-1",
                    score: 1,
                    maxScore: 1,
                    passed: true,
                    attemptNumber: 1,
                    rewardGrantedAt: new Date("2026-06-03T02:10:00.000Z"),
                    certificateIssuedAt: new Date("2026-06-03T02:12:00.000Z"),
                    completedAt: new Date("2026-06-03T02:00:00.000Z"),
                },
            ],
            certificates: [
                {
                    id: "certificate-1",
                    classId: "class-1",
                    studentId: "student-1",
                    certificateScope: "topic",
                    topicId: "topic-1",
                    topicAssessmentId: "topic-assessment-1",
                    title: "Force Certificate",
                    certificateCode: "TPT-SON-1-IC-1-STU-1",
                    issuedAt: new Date("2026-06-03T02:12:00.000Z"),
                    criteriaSnapshot: {
                        source: { sourceType: "topic", topicId: "topic-1", topicAssessmentId: "topic-assessment-1" },
                    },
                },
            ],
            classroomAssignments: [
                {
                    id: "lesson-assignment-1",
                    assignedAt: new Date("2026-06-03T01:00:00.000Z"),
                    classroom: {
                        id: "class-1",
                        name: "M5",
                        students: [
                            { id: "student-1", order: 0, name: "Alice", nickname: "A" },
                            { id: "student-2", order: 1, name: "=Bob", nickname: null },
                        ],
                    },
                    completions: [
                        {
                            studentId: "student-1",
                            completedAt: new Date("2026-06-03T02:00:00.000Z"),
                            quizScore: 85,
                        },
                    ],
                },
            ],
        });
    });

    it("exports lesson completion rows and sanitizes spreadsheet-like values", async () => {
        const { GET } = await import("@/app/api/lessons/[id]/progress/export/route");
        const response = await GET(new Request("http://localhost/api/lessons/lesson-1/progress/export"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });
        const csv = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Disposition")).toContain("Physics Lesson-lesson-progress.csv");
        expect(csv).toContain('"topic-1","Force","topic-assessment-1","passed","1","1","1","true","true","TPT-SON-1-IC-1-STU-1"');
        expect(csv).toContain('"topic-2","Motion","topic-assessment-2","not_started","0","","","false","false",""');
        expect(csv).toContain('"student-2","1","\'=Bob","","false"');
    });

    it("blocks teachers who do not own the lesson", async () => {
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            title: "Physics Lesson",
            ownerUserId: "teacher-2",
            content: {
                schemaVersion: "lesson_content_v2",
                outline: { title: "Physics", topics: [] },
                topics: [],
                estimatedMinutes: 20,
            },
            assessmentAttempts: [],
            certificates: [],
            classroomAssignments: [],
        });

        const { GET } = await import("@/app/api/lessons/[id]/progress/export/route");
        const response = await GET(new Request("http://localhost/api/lessons/lesson-1/progress/export"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });

        expect(response.status).toBe(403);
    });
});
