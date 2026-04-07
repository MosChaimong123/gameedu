import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown> | Array<Record<string, unknown>>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockAssignmentFindMany = vi.fn();
const mockAssignmentUpdate = vi.fn();
const mockQuestionSetFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockAssignmentSubmissionUpsert = vi.fn();
const mockStudentGroupFindUnique = vi.fn();
const mockStudentGroupUpdate = vi.fn();
const mockStudentGroupCreate = vi.fn();
const mockSendNotification = vi.fn();

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
      findMany: mockAssignmentFindMany,
      update: mockAssignmentUpdate,
    },
    questionSet: {
      findUnique: mockQuestionSetFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
      findMany: mockStudentFindMany,
    },
    assignmentSubmission: {
      upsert: mockAssignmentSubmissionUpsert,
    },
    studentGroup: {
      findUnique: mockStudentGroupFindUnique,
      update: mockStudentGroupUpdate,
      create: mockStudentGroupCreate,
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  sendNotification: mockSendNotification,
}));

describe("classroom assignment and group authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1", assignments: [], students: [] });
  });

  it("rejects manual scores for a student outside the classroom", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      id: "assignment-1",
      classId: "class-1",
      type: "score",
      maxScore: 100,
      checklists: [],
    });
    mockStudentFindUnique.mockResolvedValue({ id: "student-2", classId: "class-2" });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores/route");
    const response = await POST(
      makeJsonRequest({ studentId: "student-2", score: 10 }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );

    expect(response.status).toBe(404);
    expect(mockAssignmentSubmissionUpsert).not.toHaveBeenCalled();
  });

  it("rejects updating an assignment outside the classroom", async () => {
    mockAssignmentFindUnique.mockResolvedValue({ id: "assignment-2", classId: "class-2" });

    const { PATCH } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/route");
    const response = await PATCH(
      makeJsonRequest({ name: "Updated assignment" }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-2" }) }
    );

    expect(response.status).toBe(404);
    expect(mockAssignmentUpdate).not.toHaveBeenCalled();
  });

  it("rejects assignment reordering when any assignment is outside the classroom", async () => {
    mockAssignmentFindMany.mockResolvedValue([
      { id: "assignment-1", classId: "class-1" },
      { id: "assignment-2", classId: "class-2" },
    ]);

    const { PATCH } = await import("@/app/api/classrooms/[id]/assignments/route");
    const response = await PATCH(
      makeJsonRequest([
        { id: "assignment-1", order: 0 },
        { id: "assignment-2", order: 1 },
      ]),
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(404);
    expect(mockAssignmentUpdate).not.toHaveBeenCalled();
  });

  it("rejects creating quiz assignments from another teacher's question set", async () => {
    mockQuestionSetFindUnique.mockResolvedValue({ questions: [], creatorId: "teacher-2" });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/route");
    const response = await POST(
      makeJsonRequest({
        name: "Quiz 1",
        type: "quiz",
        quizSetId: "foreign-set",
      }),
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(404);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("rejects updating a group with students outside the classroom", async () => {
    mockStudentGroupFindUnique.mockResolvedValue({ id: "group-1", classId: "class-1" });
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", classId: "class-1" },
      { id: "student-2", classId: "class-2" },
    ]);

    const { PATCH } = await import("@/app/api/classrooms/[id]/groups/[groupId]/route");
    const response = await PATCH(
      makeJsonRequest({ studentIds: ["student-1", "student-2"] }),
      { params: Promise.resolve({ id: "class-1", groupId: "group-1" }) }
    );

    expect(response.status).toBe(404);
    expect(mockStudentGroupUpdate).not.toHaveBeenCalled();
  });

  it("rejects creating groups with students outside the classroom", async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", classId: "class-1" },
      { id: "student-2", classId: "class-2" },
    ]);

    const { POST } = await import("@/app/api/classrooms/[id]/groups/route");
    const response = await POST(
      makeJsonRequest({
        name: "Group Set",
        groups: [{ name: "A", studentIds: ["student-1", "student-2"] }],
      }),
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(404);
    expect(mockStudentGroupCreate).not.toHaveBeenCalled();
  });
});
