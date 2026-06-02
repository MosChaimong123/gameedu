import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeJsonRequest, makeRouteParams } from "@/__tests__/utils/route-test-helpers";

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();
const mockLoadWorksheetTakeContext = vi.fn();
const mockGradeWorksheetSubmission = vi.fn();
const mockNotifyNegamonRankUpIfNeeded = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
      update: mockStudentUpdate,
    },
    assignmentSubmission: {
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/worksheet-take-context", () => ({
  loadWorksheetTakeContext: mockLoadWorksheetTakeContext,
  WORKSHEET_ERR_BAD_REQUEST: "Bad Request",
}));

vi.mock("@/lib/grade-worksheet-submission", () => ({
  gradeWorksheetSubmission: mockGradeWorksheetSubmission,
}));

vi.mock("@/lib/negamon/negamon-rank-notify", () => ({
  notifyNegamonRankUpIfNeeded: mockNotifyNegamonRankUpIfNeeded,
}));

describe("worksheet submit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGradeWorksheetSubmission.mockReturnValue({
      score: 4,
      maxScore: 5,
      itemResults: [{ itemId: "item-1", score: 4, maxScore: 5, correct: false }],
    });
    mockClassroomFindUnique.mockResolvedValue({
      levelConfig: null,
      gamifiedSettings: { negamon: { enabled: false } },
    });
    mockStudentFindUnique.mockResolvedValue({ behaviorPoints: 10, loginCode: "ABC123" });
    mockStudentUpdate.mockResolvedValue({ behaviorPoints: 14, loginCode: "ABC123" });
    mockNotifyNegamonRankUpIfNeeded.mockResolvedValue(undefined);
  });

  it("creates a new submission on first submit", async () => {
    mockLoadWorksheetTakeContext.mockResolvedValue({
      kind: "ok",
      studentId: "student-1",
      studentCode: "ABC123",
      assignmentName: "Worksheet 1",
      maxScore: 5,
      worksheet: { settings: { showScoreToStudent: true } },
      showScoreToStudent: true,
      allowResubmit: false,
      hasPreviousSubmission: false,
    });
    mockCreate.mockResolvedValue({ id: "submission-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route");
    const response = await POST(
      makeJsonRequest({
        studentCode: "ABC123",
        answers: { "item-1": "answer" },
      }),
      makeRouteParams({ id: "class-1", assignmentId: "assignment-1" })
    );

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body).toMatchObject({
      score: 4,
      maxScore: 5,
      submissionId: "submission-1",
      showScoreToStudent: true,
      replacedPreviousSubmission: false,
      expBonus: 0,
    });
  });

  it("replaces the previous submission when resubmission is allowed", async () => {
    mockLoadWorksheetTakeContext.mockResolvedValue({
      kind: "ok",
      studentId: "student-1",
      studentCode: "ABC123",
      assignmentName: "Worksheet 1",
      maxScore: 5,
      worksheet: { settings: { showScoreToStudent: false } },
      showScoreToStudent: false,
      allowResubmit: true,
      hasPreviousSubmission: true,
    });
    mockUpdate.mockResolvedValue({ id: "submission-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route");
    const response = await POST(
      makeJsonRequest({
        studentCode: "ABC123",
        answers: { "item-1": "new answer" },
      }),
      makeRouteParams({ id: "class-1", assignmentId: "assignment-1" })
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0]?.[0]).toMatchObject({
      where: {
        studentId_assignmentId: {
          studentId: "student-1",
          assignmentId: "assignment-1",
        },
      },
      data: expect.objectContaining({
        score: 4,
        content: expect.stringContaining("\"mode\":\"worksheet\""),
      }),
    });

    const body = await response.json();
    expect(body).toMatchObject({
      score: 4,
      maxScore: 5,
      submissionId: "submission-1",
      showScoreToStudent: false,
      replacedPreviousSubmission: true,
      expBonus: 0,
    });
  });

  it("awards worksheet EXP for first auto-graded submission when Negamon is enabled", async () => {
    mockLoadWorksheetTakeContext.mockResolvedValue({
      kind: "ok",
      studentId: "student-1",
      studentCode: "ABC123",
      assignmentName: "Worksheet 1",
      maxScore: 5,
      worksheet: { settings: { showScoreToStudent: true } },
      showScoreToStudent: true,
      allowResubmit: false,
      hasPreviousSubmission: false,
    });
    mockGradeWorksheetSubmission.mockReturnValue({
      score: 5,
      maxScore: 5,
      itemResults: [{ itemId: "item-1", score: 5, maxScore: 5, correct: true, needsReview: false }],
    });
    mockClassroomFindUnique.mockResolvedValue({
      levelConfig: { ranks: [] },
      gamifiedSettings: { negamon: { enabled: true, expPerPoint: 6 } },
    });
    mockCreate.mockResolvedValue({ id: "submission-1" });
    mockStudentFindUnique.mockResolvedValue({ behaviorPoints: 10, loginCode: "ABC123" });
    mockStudentUpdate.mockResolvedValue({ behaviorPoints: 16, loginCode: "ABC123" });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route");
    const response = await POST(
      makeJsonRequest({
        studentCode: "ABC123",
        answers: { "item-1": "answer" },
      }),
      makeRouteParams({ id: "class-1", assignmentId: "assignment-1" })
    );

    expect(response.status).toBe(200);
    expect(mockStudentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
        data: expect.objectContaining({
          behaviorPoints: { increment: 6 },
          history: {
            create: expect.objectContaining({
              value: 6,
              reason: "Negamon Worksheet: Worksheet 1 (100%)",
            }),
          },
        }),
      })
    );
    expect(mockNotifyNegamonRankUpIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        oldPoints: 10,
        newPoints: 16,
      })
    );

    const body = await response.json();
    expect(body).toMatchObject({ expBonus: 6 });
  });

  it("does not award worksheet EXP when manual review items are pending", async () => {
    mockLoadWorksheetTakeContext.mockResolvedValue({
      kind: "ok",
      studentId: "student-1",
      studentCode: "ABC123",
      assignmentName: "Worksheet 1",
      maxScore: 5,
      worksheet: { settings: { showScoreToStudent: true } },
      showScoreToStudent: true,
      allowResubmit: false,
      hasPreviousSubmission: false,
    });
    mockGradeWorksheetSubmission.mockReturnValue({
      score: 0,
      maxScore: 5,
      itemResults: [{ itemId: "item-1", score: 0, maxScore: 5, correct: null, needsReview: true }],
    });
    mockCreate.mockResolvedValue({ id: "submission-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route");
    const response = await POST(
      makeJsonRequest({
        studentCode: "ABC123",
        answers: { "item-1": "answer" },
      }),
      makeRouteParams({ id: "class-1", assignmentId: "assignment-1" })
    );

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body).toMatchObject({ expBonus: 0 });
  });
});
