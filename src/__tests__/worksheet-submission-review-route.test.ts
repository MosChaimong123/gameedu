import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockSubmissionFindUnique = vi.fn();
const mockSubmissionUpdate = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    assignment: {
      findUnique: mockAssignmentFindUnique,
    },
    assignmentSubmission: {
      findUnique: mockSubmissionFindUnique,
      update: mockSubmissionUpdate,
    },
  },
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

describe("worksheet submission review patch route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "teacher-1",
        role: "TEACHER",
      },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockAssignmentFindUnique.mockResolvedValue({
      id: "assignment-1",
      classId: "class-1",
      type: "worksheet",
      quizData: {
        version: 1,
        source: {
          type: "image",
          url: "/uploads/background.png",
        },
        pages: [
          {
            id: "page-1",
            pageNumber: 1,
            backgroundUrl: "/uploads/background.png",
            width: 1200,
            height: 1600,
            items: [
              {
                id: "file-1",
                type: "file_upload",
                prompt: "Upload image evidence",
                allowedType: "image",
                x: 10,
                y: 10,
                width: 20,
                height: 10,
                points: 4,
              },
              {
                id: "speaking-1",
                type: "speaking",
                prompt: "Record your answer",
                x: 20,
                y: 20,
                width: 20,
                height: 10,
                points: 3,
              },
            ],
          },
        ],
        settings: {
          showScoreToStudent: true,
          allowResubmit: false,
          shuffleItems: false,
        },
      },
    });
    mockSubmissionFindUnique.mockResolvedValue({
      id: "submission-1",
      assignmentId: "assignment-1",
      score: 0,
      content: JSON.stringify({
        mode: "worksheet",
        answers: {
          "file-1": "/uploads/worksheet-submissions/work-1.png",
          "speaking-1": "/uploads/worksheet-submissions/work-1.webm",
        },
        itemResults: [
          {
            itemId: "file-1",
            correct: null,
            score: 0,
            maxScore: 4,
            needsReview: true,
          },
          {
            itemId: "speaking-1",
            correct: null,
            score: 0,
            maxScore: 3,
            needsReview: true,
          },
        ],
      }),
    });
    mockSubmissionUpdate.mockImplementation(async ({ data }) => ({
      id: "submission-1",
      score: data.score,
      content: data.content,
      updatedAt: new Date("2026-05-19T13:00:00.000Z"),
    }));
  });

  it("allows teachers to score file upload and speaking review items", async () => {
    const { PATCH } = await import(
      "@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submissions/[submissionId]/route"
    );

    const response = await PATCH(
      new Request("http://localhost/api/classrooms/class-1/assignments/assignment-1/worksheet/submissions/submission-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemScores: {
            "file-1": 4,
            "speaking-1": 2,
          },
        }),
      }),
      {
        params: Promise.resolve({
          id: "class-1",
          assignmentId: "assignment-1",
          submissionId: "submission-1",
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(mockSubmissionUpdate).toHaveBeenCalledTimes(1);
    expect(mockSubmissionUpdate.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "submission-1" },
      data: {
        score: 6,
        content: expect.any(String),
      },
    });

    const body = await response.json();
    expect(body.score).toBe(6);

    const updatedContent = JSON.parse(body.content) as {
      itemResults: Array<{
        itemId: string;
        score: number;
        correct: boolean | null;
        needsReview: boolean;
      }>;
    };

    expect(updatedContent.itemResults).toEqual([
      expect.objectContaining({
        itemId: "file-1",
        score: 4,
        correct: true,
        needsReview: false,
      }),
      expect.objectContaining({
        itemId: "speaking-1",
        score: 2,
        correct: null,
        needsReview: false,
      }),
    ]);
  });
});
