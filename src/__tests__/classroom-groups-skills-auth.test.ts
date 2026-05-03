import { beforeEach, describe, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentGroupFindMany = vi.fn();
const mockStudentGroupCreate = vi.fn();
const mockStudentGroupFindUnique = vi.fn();
const mockStudentGroupDelete = vi.fn();
const mockStudentGroupUpdate = vi.fn();
const mockStudentFindMany = vi.fn();
const mockSkillFindMany = vi.fn();
const mockSkillCreate = vi.fn();
const mockSkillFindUnique = vi.fn();
const mockSkillDelete = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    studentGroup: {
      findMany: mockStudentGroupFindMany,
      create: mockStudentGroupCreate,
      findUnique: mockStudentGroupFindUnique,
      delete: mockStudentGroupDelete,
      update: mockStudentGroupUpdate,
    },
    student: {
      findMany: mockStudentFindMany,
    },
    skill: {
      findMany: mockSkillFindMany,
      create: mockSkillCreate,
      findUnique: mockSkillFindUnique,
      delete: mockSkillDelete,
    },
  },
}));

describe("classroom groups and skills auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER" },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockStudentGroupFindMany.mockResolvedValue([]);
    mockStudentGroupCreate.mockResolvedValue({
      id: "group-1",
      name: "Group A",
      classId: "class-1",
    });
    mockStudentGroupFindUnique.mockResolvedValue({
      id: "group-1",
      name: "Group A",
      classId: "class-1",
    });
    mockStudentGroupDelete.mockResolvedValue({ id: "group-1" });
    mockStudentGroupUpdate.mockResolvedValue({
      id: "group-1",
      name: "Updated Group",
      classId: "class-1",
    });
    mockStudentFindMany.mockResolvedValue([{ id: "student-1", classId: "class-1" }]);
    mockSkillFindMany.mockResolvedValue([]);
    mockSkillCreate.mockResolvedValue({
      id: "skill-1",
      name: "Participation",
      classId: "class-1",
    });
    mockSkillFindUnique.mockResolvedValue({
      id: "skill-1",
      classId: "class-1",
    });
    mockSkillDelete.mockResolvedValue({ id: "skill-1", classId: "class-1" });
  });

  it("rejects unauthenticated group listing requests", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/classrooms/[id]/groups/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/groups") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects group creation for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/[id]/groups/route");

    const response = await POST(
      makeJsonRequest({ name: "My Groups", groups: [] }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload for malformed group creation requests", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/groups/route");

    const response = await POST(
      makeJsonRequest({ name: "", groups: null }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Missing data",
    });
  });

  it("returns not found when group members are outside the classroom", async () => {
    mockStudentFindMany.mockResolvedValueOnce([{ id: "student-1", classId: "class-2" }]);
    const { POST } = await import("@/app/api/classrooms/[id]/groups/route");

    const response = await POST(
      makeJsonRequest({
        name: "My Groups",
        groups: [{ name: "A", studentIds: ["student-1"] }],
      }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("returns not found when deleting a missing group", async () => {
    mockStudentGroupFindUnique.mockResolvedValueOnce(null);
    const { DELETE } = await import("@/app/api/classrooms/[id]/groups/[groupId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/classrooms/class-1/groups/group-missing", { method: "DELETE" }) as never,
      makeRouteParams({ id: "class-1", groupId: "group-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects unauthenticated skill reads", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/classrooms/[id]/skills/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/skills") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects skill creation for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/[id]/skills/route");

    const response = await POST(
      makeJsonRequest({ name: "Participation", weight: 1, type: "POSITIVE", icon: "star" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload when skill fields are missing", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/skills/route");

    const response = await POST(
      makeJsonRequest({ name: "Participation", weight: 1 }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Missing required fields",
    });
  });

  it("returns not found when deleting a skill outside the classroom", async () => {
    mockSkillFindUnique.mockResolvedValueOnce({ id: "skill-1", classId: "class-2" });
    const { DELETE } = await import("@/app/api/classrooms/[id]/skills/[skillId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/classrooms/class-1/skills/skill-1", { method: "DELETE" }) as never,
      makeRouteParams({ id: "class-1", skillId: "skill-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });
});
