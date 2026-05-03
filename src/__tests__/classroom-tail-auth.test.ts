import { beforeEach, describe, it, vi, expect } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockAttendanceRecordFindUnique = vi.fn();
const mockAttendanceRecordUpdate = vi.fn();
const mockStudentUpdate = vi.fn();
const mockClassroomCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
      create: mockClassroomCreate,
    },
    attendanceRecord: {
      findUnique: mockAttendanceRecordFindUnique,
      update: mockAttendanceRecordUpdate,
    },
    student: {
      update: mockStudentUpdate,
    },
  },
}));

describe("classroom tail auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      name: "Math Class",
      emoji: null,
      theme: null,
      grade: null,
      gamifiedSettings: null,
      levelConfig: null,
      quizReviewMode: null,
      skills: [],
      assignments: [],
    });
    mockAttendanceRecordFindUnique.mockResolvedValue({
      id: "record-1",
      classId: "class-1",
      studentId: "student-1",
    });
    mockAttendanceRecordUpdate.mockResolvedValue({
      id: "record-1",
      classId: "class-1",
      studentId: "student-1",
      status: "PRESENT",
    });
    mockStudentUpdate.mockResolvedValue({ id: "student-1" });
    mockClassroomCreate.mockResolvedValue({
      id: "class-copy-1",
      name: "Math Class (Copy)",
      skills: [],
      assignments: [],
    });
  });

  it("rejects unauthenticated attendance history edits", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { PATCH } = await import("@/app/api/classrooms/[id]/attendance/history/[recordId]/route");

    const response = await PATCH(
      makeJsonRequest({ status: "PRESENT" }),
      makeRouteParams({ id: "class-1", recordId: "record-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("returns invalid payload for attendance history edits without status", async () => {
    const { PATCH } = await import("@/app/api/classrooms/[id]/attendance/history/[recordId]/route");

    const response = await PATCH(
      makeJsonRequest({}),
      makeRouteParams({ id: "class-1", recordId: "record-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Status is required",
    });
  });

  it("returns not found when the attendance record is outside the classroom", async () => {
    mockAttendanceRecordFindUnique.mockResolvedValueOnce({ id: "record-1", classId: "class-2", studentId: "student-1" });
    const { PATCH } = await import("@/app/api/classrooms/[id]/attendance/history/[recordId]/route");

    const response = await PATCH(
      makeJsonRequest({ status: "PRESENT" }),
      makeRouteParams({ id: "class-1", recordId: "record-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects classroom duplication for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/[id]/duplicate/route");

    const response = await POST({} as never, makeRouteParams({ id: "class-1" }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns not found when duplicating a classroom outside the current account", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/classrooms/[id]/duplicate/route");

    const response = await POST({} as never, makeRouteParams({ id: "class-missing" }));

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("still logs successful classroom duplication", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/duplicate/route");
    const response = await POST({} as never, makeRouteParams({ id: "class-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.duplicated",
        targetId: "class-copy-1",
      })
    );
  });
});
