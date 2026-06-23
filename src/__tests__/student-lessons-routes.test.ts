import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockLessonAssignmentFindMany = vi.fn();
const mockLessonAssignmentFindUnique = vi.fn();
const mockLessonCompletionFindUnique = vi.fn();
const mockLessonCompletionUpsert = vi.fn();
const mockLessonAssessmentAttemptFindMany = vi.fn();
const mockLessonAssessmentAttemptCreate = vi.fn();
const mockLessonAssessmentAttemptUpdate = vi.fn();
const mockTopicVideoWatchFindMany = vi.fn();
const mockQuestionSetFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();
const mockPointHistoryCreate = vi.fn();
const mockStudentAchievementUpsert = vi.fn();
const mockLessonCertificateFindMany = vi.fn();
const mockLessonCertificateCreate = vi.fn();
const mockSendNotification = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        student: {
            findFirst: mockStudentFindFirst,
            update: mockStudentUpdate,
        },
        lessonAssignment: {
            findMany: mockLessonAssignmentFindMany,
            findUnique: mockLessonAssignmentFindUnique,
        },
        lessonCompletion: {
            findUnique: mockLessonCompletionFindUnique,
            upsert: mockLessonCompletionUpsert,
        },
        lessonAssessmentAttempt: {
            findMany: mockLessonAssessmentAttemptFindMany,
            create: mockLessonAssessmentAttemptCreate,
            update: mockLessonAssessmentAttemptUpdate,
        },
        topicVideoWatch: {
            findMany: mockTopicVideoWatchFindMany,
        },
        lessonCertificate: {
            findMany: mockLessonCertificateFindMany,
            create: mockLessonCertificateCreate,
        },
        questionSet: {
            findUnique: mockQuestionSetFindUnique,
        },
        pointHistory: {
            create: mockPointHistoryCreate,
        },
        studentAchievement: {
            upsert: mockStudentAchievementUpsert,
        },
        $transaction: mockTransaction,
    },
}));

vi.mock("@/lib/notifications", () => ({
    sendNotification: mockSendNotification,
}));

const topicAssessmentLessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Physics Topics",
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
            objectives: ["Understand force"],
            sections: [{ id: "section-1", heading: "Intro", content: "Force content" }],
            assessment: {
                id: "topic-assessment-1",
                title: "Force quiz",
                questionSetId: "set-topic-1",
                passScore: 1,
                allowRetake: true,
                source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" },
                reward: {
                    behaviorPoints: 3,
                    gold: 10,
                },
                certificate: {
                    enabled: true,
                    title: "Force Certificate",
                    description: "Awarded for passing Force",
                },
            },
        },
        {
            id: "topic-2",
            title: "Motion",
            order: 1,
            contentStatus: "generated",
            objectives: ["Understand motion"],
            sections: [{ id: "section-2", heading: "Motion intro", content: "Motion content" }],
            assessment: {
                id: "topic-assessment-2",
                title: "Motion quiz",
                questionSetId: "set-topic-2",
                passScore: 1,
                allowRetake: true,
                source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-2" },
                reward: {
                    behaviorPoints: 4,
                    gold: 12,
                },
                certificate: {
                    enabled: true,
                    title: "Motion Certificate",
                    description: "Awarded for passing Motion",
                },
            },
        },
    ],
    estimatedMinutes: 30,
};

const legacyOnlyLessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    assessment: {
        title: "Legacy lesson quiz",
        questionSetId: "set-legacy",
        passScore: 1,
        allowRetake: true,
        source: { sourceType: "lesson", lessonId: "lesson-legacy" },
    },
    outline: {
        title: "Legacy Physics",
        topics: [{ id: "topic-legacy", title: "Legacy topic", order: 0 }],
    },
    topics: [
        {
            id: "topic-legacy",
            title: "Legacy topic",
            order: 0,
            contentStatus: "generated",
            objectives: ["Understand legacy topic"],
            sections: [{ id: "section-legacy", heading: "Intro", content: "Legacy content" }],
        },
    ],
    estimatedMinutes: 10,
};

describe("student lessons routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1", name: "Alice" });
        mockLessonAssignmentFindMany.mockResolvedValue([]);
        mockLessonAssignmentFindUnique.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
            completions: [],
        });
        mockLessonCompletionFindUnique.mockResolvedValue(null);
        mockLessonCompletionUpsert.mockResolvedValue({
            id: "completion-1",
            lessonAssignmentId: "lesson-assignment-1",
            studentId: "student-1",
            quizScore: null,
        });
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([]);
        mockTopicVideoWatchFindMany.mockResolvedValue([]);
        mockLessonAssessmentAttemptCreate.mockResolvedValue({
            id: "attempt-1",
            score: 1,
            maxScore: 1,
            passed: true,
            attemptNumber: 1,
            rewardGrantedAt: new Date("2026-06-17T12:00:00.000Z"),
            rewardSnapshot: {
                behaviorPoints: 5,
                gold: 20,
                achievementId: "lesson-physics-pass",
                achievementTitle: "Physics Pass",
            },
            certificateIssuedAt: null,
            completedAt: new Date("2026-06-17T12:00:00.000Z"),
        });
        mockLessonAssessmentAttemptUpdate.mockResolvedValue({});
        mockQuestionSetFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
            id: where.id,
            title:
                where.id === "set-topic-1" ? "Force quiz set" : where.id === "set-topic-2" ? "Motion quiz set" : "Question set",
            questions: [
                {
                    id: "q1",
                    question: "1+1",
                    options: ["1", "2", "3", "4"],
                    correctAnswer: 1,
                    explanation: "",
                    image: null,
                    timeLimit: 20,
                    optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
                    questionType: "MULTIPLE_CHOICE",
                },
            ],
        }));
        mockStudentUpdate.mockResolvedValue({});
        mockPointHistoryCreate.mockResolvedValue({});
        mockStudentAchievementUpsert.mockResolvedValue({});
        mockLessonCertificateFindMany.mockResolvedValue([]);
        mockLessonCertificateCreate.mockResolvedValue({
            id: "certificate-1",
            title: "Physics Lesson Certificate",
            description: "Awarded for passing the lesson assessment",
            certificateCode: "TPL-SON-1-STU-1",
            issuedAt: new Date("2026-06-17T12:00:00.000Z"),
        });
        mockSendNotification.mockResolvedValue(undefined);
        mockTransaction.mockImplementation(async (callback) =>
            callback({
                lessonAssessmentAttempt: {
                    create: mockLessonAssessmentAttemptCreate,
                    update: mockLessonAssessmentAttemptUpdate,
                },
                lessonCertificate: {
                    findMany: mockLessonCertificateFindMany,
                    create: mockLessonCertificateCreate,
                },
                student: {
                    update: mockStudentUpdate,
                },
                pointHistory: {
                    create: mockPointHistoryCreate,
                },
                studentAchievement: {
                    upsert: mockStudentAchievementUpsert,
                },
            })
        );
    });

    it("lists published student lessons using login-code variants", async () => {
        const { GET } = await import("@/app/api/student/[code]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123" }),
        });

        expect(res.status).toBe(200);
        expect(mockStudentFindFirst).toHaveBeenCalledWith({
            where: {
                OR: [{ loginCode: "abc123" }, { loginCode: "ABC123" }],
            },
            select: { id: true, classId: true },
        });
        expect(mockLessonAssignmentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    classId: "class-1",
                    lesson: { status: "PUBLISHED" },
                },
            })
        );
    });

    it("includes topic assessment status in the lesson list", async () => {
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([
            {
                lessonId: "lesson-1",
                questionSetId: "set-topic-1",
                assessmentSourceType: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: "2026-06-17T12:00:00.000Z",
                certificateIssuedAt: "2026-06-17T12:00:00.000Z",
                completedAt: "2026-06-17T12:00:00.000Z",
            },
            {
                lessonId: "lesson-1",
                questionSetId: "set-topic-2",
                assessmentSourceType: "topic",
                topicId: "topic-2",
                topicAssessmentId: "topic-assessment-2",
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: "2026-06-17T12:10:00.000Z",
                certificateIssuedAt: "2026-06-17T12:10:00.000Z",
                completedAt: "2026-06-17T12:10:00.000Z",
            },
        ]);
        mockLessonAssignmentFindMany.mockResolvedValue([
            {
                id: "lesson-assignment-1",
                lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
                completions: [],
            },
        ]);

        const { GET } = await import("@/app/api/student/[code]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body[0].assessmentStatus).toMatchObject({
            available: true,
            attempted: true,
            hasPassed: true,
            rewardEarned: true,
            certificateIssued: true,
            attemptCount: 2,
            latestScore: 1,
        });
    });

    it("summarizes topic assessments at lesson level", async () => {
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([
            {
                lessonId: "lesson-1",
                questionSetId: "set-topic-1",
                assessmentSourceType: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: null,
                certificateIssuedAt: null,
                completedAt: "2026-06-17T12:00:00.000Z",
            },
        ]);
        mockTopicVideoWatchFindMany.mockResolvedValue([
            {
                lessonId: "lesson-1",
                topicId: "topic-1",
                completedAt: "2026-06-17T11:55:00.000Z",
            },
        ]);
        mockLessonAssignmentFindMany.mockResolvedValue([
            {
                id: "lesson-assignment-1",
                lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
                completions: [],
            },
        ]);

        const { GET } = await import("@/app/api/student/[code]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body[0].assessmentStatus).toMatchObject({
            available: true,
            mode: "topic",
            attempted: true,
            hasPassed: false,
            totalAssessments: 2,
            passedAssessments: 1,
            pendingAssessmentIds: ["topic-assessment-2"],
        });
        expect(body[0].progressSummary).toMatchObject({
            totalTopics: 2,
            completedTopics: 1,
            resumeTopicId: "topic-2",
            resumeMode: "ASSESSMENT",
            completedTrackableVideoTopics: 0,
            totalTrackableVideoTopics: 0,
        });
    });

    it("ignores legacy lesson-level assessment when building the student lesson list", async () => {
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([
            {
                lessonId: "lesson-legacy",
                questionSetId: "set-legacy",
                assessmentSourceType: "lesson",
                topicId: null,
                topicAssessmentId: null,
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: "2026-06-17T12:00:00.000Z",
                certificateIssuedAt: "2026-06-17T12:00:00.000Z",
                completedAt: "2026-06-17T12:00:00.000Z",
            },
        ]);
        mockLessonAssignmentFindMany.mockResolvedValue([
            {
                id: "lesson-assignment-legacy",
                lesson: { id: "lesson-legacy", status: "PUBLISHED", title: "Legacy Lesson", content: legacyOnlyLessonContentV2 },
                completions: [],
            },
        ]);

        const { GET } = await import("@/app/api/student/[code]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body[0].assessmentStatus).toMatchObject({
            available: false,
            attempted: false,
            totalAssessments: 0,
        });
        expect(mockLessonAssessmentAttemptFindMany).not.toHaveBeenCalled();
    });

    it("returns one assigned published lesson for the student", async () => {
        mockTopicVideoWatchFindMany.mockResolvedValue([
            {
                topicId: "topic-1",
                completedAt: "2026-06-17T11:55:00.000Z",
            },
        ]);
        const { GET } = await import("@/app/api/student/[code]/lessons/[lessonId]/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(mockLessonAssignmentFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { lessonId_classId: { lessonId: "lesson-1", classId: "class-1" } },
            })
        );
        expect(body.progressSummary).toMatchObject({
            totalTopics: 2,
            completedTopics: 0,
            resumeTopicId: "topic-1",
            resumeMode: "ASSESSMENT",
            completedTrackableVideoTopics: 0,
            totalTrackableVideoTopics: 0,
        });
    });

    it("returns topic assessment certificate only for the matching topic", async () => {
        mockLessonAssignmentFindUnique.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
            completions: [],
        });
        mockLessonCertificateFindMany.mockResolvedValue([
            {
                id: "certificate-topic-2",
                title: "Motion Certificate",
                description: "Awarded for Motion",
                certificateCode: "TPT-SON-1-IC-2-STU-1",
                issuedAt: new Date("2026-06-17T12:10:00.000Z"),
                certificateScope: "topic",
                topicId: "topic-2",
                topicAssessmentId: "topic-assessment-2",
                criteriaSnapshot: {
                    source: { sourceType: "topic", topicId: "topic-2", topicAssessmentId: "topic-assessment-2" },
                },
            },
            {
                id: "certificate-topic-1",
                title: "Force Certificate",
                description: "Awarded for Force",
                certificateCode: "TPT-SON-1-IC-1-STU-1",
                issuedAt: new Date("2026-06-17T12:00:00.000Z"),
                certificateScope: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                criteriaSnapshot: {
                    source: { sourceType: "topic", topicId: "topic-1", topicAssessmentId: "topic-assessment-1" },
                },
            },
        ]);

        const { GET } = await import("@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/assessment/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.certificateStatus).toMatchObject({
            enabled: true,
            issued: true,
            certificate: {
                certificateCode: "TPT-SON-1-IC-1-STU-1",
            },
        });
    });

    it("issues separate topic rewards and certificates for different topics in the same lesson", async () => {
        mockLessonAssignmentFindUnique.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
            completions: [],
        });
        mockLessonAssessmentAttemptCreate.mockResolvedValue({
            id: "attempt-topic",
            score: 1,
            maxScore: 1,
            passed: true,
            attemptNumber: 1,
            rewardGrantedAt: new Date("2026-06-17T12:00:00.000Z"),
            rewardSnapshot: null,
            certificateIssuedAt: null,
            completedAt: new Date("2026-06-17T12:00:00.000Z"),
        });
        mockLessonCertificateCreate.mockImplementation(async ({ data }: { data: { topicAssessmentId?: string | null } }) => ({
            id: `certificate-${data.topicAssessmentId ?? "lesson"}`,
            title: `Certificate ${data.topicAssessmentId ?? "lesson"}`,
            description: null,
            certificateCode: `CODE-${data.topicAssessmentId ?? "lesson"}`,
            issuedAt: new Date("2026-06-17T12:00:00.000Z"),
            certificateScope: "topic",
            topicId: data.topicAssessmentId === "topic-assessment-1" ? "topic-1" : "topic-2",
            topicAssessmentId: data.topicAssessmentId ?? null,
            criteriaSnapshot: {
                source: {
                    sourceType: "topic",
                    topicId: data.topicAssessmentId === "topic-assessment-1" ? "topic-1" : "topic-2",
                    topicAssessmentId: data.topicAssessmentId ?? null,
                },
            },
        }));

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/assessment/attempt/route");

        mockLessonAssessmentAttemptFindMany.mockResolvedValueOnce([]);
        mockLessonCertificateFindMany.mockResolvedValueOnce([]);
        const firstRes = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ answers: [1] }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }),
            }
        );
        const firstBody = await firstRes.json();

        mockLessonAssessmentAttemptFindMany.mockResolvedValueOnce([]);
        mockLessonCertificateFindMany.mockResolvedValueOnce([
            {
                id: "certificate-topic-assessment-1",
                title: "Certificate topic-assessment-1",
                description: null,
                certificateCode: "CODE-topic-assessment-1",
                issuedAt: new Date("2026-06-17T12:00:00.000Z"),
                certificateScope: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                criteriaSnapshot: {
                    source: { sourceType: "topic", topicId: "topic-1", topicAssessmentId: "topic-assessment-1" },
                },
            },
        ]);
        const secondRes = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ answers: [1] }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-2" }),
            }
        );
        const secondBody = await secondRes.json();

        expect(firstRes.status).toBe(200);
        expect(secondRes.status).toBe(200);
        expect(firstBody.firstPassAwarded).toBe(true);
        expect(secondBody.firstPassAwarded).toBe(true);
        expect(firstBody.certificate?.certificateCode).toBe("CODE-topic-assessment-1");
        expect(secondBody.certificate?.certificateCode).toBe("CODE-topic-assessment-2");
        expect(mockLessonCertificateCreate).toHaveBeenCalledTimes(2);
        expect(mockStudentUpdate).toHaveBeenCalledTimes(2);
    });

    it("does not re-award topic reward and certificate twice for the same topic", async () => {
        mockLessonAssignmentFindUnique.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
            completions: [],
        });
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([
            {
                id: "attempt-old-topic",
                questionSetId: "set-topic-1",
                assessmentSourceType: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                passed: true,
                attemptNumber: 1,
            },
        ]);

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/assessment/attempt/route");
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ answers: [1] }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }),
            }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.reward).toBeNull();
        expect(body.certificate).toBeNull();
        expect(body.firstPassAwarded).toBe(false);
        expect(mockLessonCertificateCreate).not.toHaveBeenCalled();
    });

    it("completes a lesson and awards only on first completion", async () => {
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([
            {
                questionSetId: "set-topic-1",
                assessmentSourceType: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: "2026-06-17T12:00:00.000Z",
                certificateIssuedAt: null,
                completedAt: "2026-06-17T12:00:00.000Z",
            },
            {
                questionSetId: "set-topic-2",
                assessmentSourceType: "topic",
                topicId: "topic-2",
                topicAssessmentId: "topic-assessment-2",
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: "2026-06-17T12:00:00.000Z",
                certificateIssuedAt: null,
                completedAt: "2026-06-17T12:00:00.000Z",
            },
        ]);

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/complete/route");
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ quizScore: 90 }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
            }
        );
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.reward).toEqual({ xp: 5, gold: 20 });
        expect(mockLessonCompletionUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ quizScore: null }),
            })
        );
        expect(mockStudentUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "student-1" },
                data: expect.objectContaining({
                    behaviorPoints: { increment: 5 },
                    gold: { increment: 20 },
                }),
            })
        );
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: "student-1",
                link: "/student/abc123",
            })
        );
    });

    it("blocks lesson completion when required topic assessments are still pending", async () => {
        mockLessonAssignmentFindUnique.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { id: "lesson-1", status: "PUBLISHED", title: "Lesson 1", content: topicAssessmentLessonContentV2 },
        });
        mockLessonAssessmentAttemptFindMany.mockResolvedValue([
            {
                questionSetId: "set-topic-1",
                assessmentSourceType: "topic",
                topicId: "topic-1",
                topicAssessmentId: "topic-assessment-1",
                score: 1,
                maxScore: 1,
                passed: true,
                attemptNumber: 1,
                rewardGrantedAt: null,
                certificateIssuedAt: null,
                completedAt: "2026-06-17T12:00:00.000Z",
            },
        ]);

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/complete/route");
        const res = await POST(new Request("http://localhost", { method: "POST" }), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.error.message).toContain("Pass all required topic assessments");
        expect(mockLessonCompletionUpsert).not.toHaveBeenCalled();
    });

    it("does not award again for an existing completion", async () => {
        mockLessonCompletionFindUnique.mockResolvedValue({ id: "completion-1" });

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/complete/route");
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ quizScore: 90 }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
            }
        );
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.reward).toBeNull();
        expect(mockStudentUpdate).not.toHaveBeenCalled();
        expect(mockSendNotification).not.toHaveBeenCalled();
    });
});
