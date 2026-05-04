import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockSaveClassroomAttendance = vi.fn();
const mockAwardSingleClassroomPoint = vi.fn();
const mockAwardBatchClassroomPoints = vi.fn();
const mockResetClassroomPoints = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/services/classroom-attendance/save-classroom-attendance", () => ({
  CLASSROOM_ATTENDANCE_INVALID_DATA: "classroomAttendanceInvalidData",
  saveClassroomAttendance: mockSaveClassroomAttendance,
}));

vi.mock("@/lib/services/classroom-points/award-classroom-points", () => ({
  CLASSROOM_POINTS_MISSING_DATA: "classroomPointsMissingData",
  awardSingleClassroomPoint: mockAwardSingleClassroomPoint,
  awardBatchClassroomPoints: mockAwardBatchClassroomPoints,
}));

vi.mock("@/lib/services/classroom-points/reset-classroom-points", () => ({
  resetClassroomPoints: mockResetClassroomPoints,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

describe("classroom points and attendance contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER" },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockSaveClassroomAttendance.mockResolvedValue({
      ok: true,
      classroomId: "class-1",
      savedCount: 1,
    });
    mockAwardSingleClassroomPoint.mockResolvedValue({
      ok: true,
      classroomId: "class-1",
      skillId: "skill-1",
      skillName: "Helping",
      skillWeight: 1,
      updatedStudents: [],
    });
    mockAwardBatchClassroomPoints.mockResolvedValue({
      ok: true,
      classroomId: "class-1",
      skillId: "skill-1",
      skillName: "Helping",
      skillWeight: 1,
      updatedStudents: [],
    });
    mockResetClassroomPoints.mockResolvedValue({
      ok: true,
      classroomId: "class-1",
      studentsResetCount: 1,
      activitiesDeletedCount: 1,
    });
  });

  it("rejects attendance saves for non-teacher users before invoking the service", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/[id]/attendance/route");

    const response = await POST(
      makeJsonRequest({ updates: [{ studentId: "student-1", status: "PRESENT" }] }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockSaveClassroomAttendance).not.toHaveBeenCalled();
  });

  it("maps attendance ownership failures to forbidden", async () => {
    mockSaveClassroomAttendance.mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: "Forbidden",
    });
    const { POST } = await import("@/app/api/classrooms/[id]/attendance/route");

    const response = await POST(
      makeJsonRequest({ updates: [{ studentId: "student-1", status: "PRESENT" }] }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("rejects single-point awards for non-teacher users before invoking the service", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/[id]/points/route");

    const response = await POST(
      makeJsonRequest({ studentId: "student-1", skillId: "skill-1" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockAwardSingleClassroomPoint).not.toHaveBeenCalled();
  });

  it("maps batch point ownership failures to forbidden", async () => {
    mockAwardBatchClassroomPoints.mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: "Forbidden",
    });
    const { POST } = await import("@/app/api/classrooms/[id]/points/batch/route");

    const response = await POST(
      makeJsonRequest({ studentIds: ["student-1"], skillId: "skill-1" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("rejects points reset for non-teacher users before invoking the service", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/[id]/points/reset/route");

    const response = await POST({} as never, makeRouteParams({ id: "class-1" }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockResetClassroomPoints).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it("logs audit metadata for single-student point awards", async () => {
    mockAwardSingleClassroomPoint.mockResolvedValueOnce({
      ok: true,
      classroomId: "class-1",
      skillId: "skill-1",
      skillName: "Helping",
      skillWeight: 5,
      updatedStudents: [{ id: "student-1", behaviorPoints: 15, loginCode: "ABC123" }],
    });
    const { POST } = await import("@/app/api/classrooms/[id]/points/route");

    const response = await POST(
      makeJsonRequest({ studentId: "student-1", skillId: "skill-1" }),
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "teacher-1",
      action: "classroom.points.awarded",
      targetType: "student",
      targetId: "student-1",
      metadata: {
        classroomId: "class-1",
        skillId: "skill-1",
        skillName: "Helping",
        skillWeight: 5,
        awardedCount: 1,
      },
    });
  });

  it("logs audit metadata for batch point awards", async () => {
    mockAwardBatchClassroomPoints.mockResolvedValueOnce({
      ok: true,
      classroomId: "class-1",
      skillId: "skill-1",
      skillName: "Helping",
      skillWeight: 3,
      updatedStudents: [
        { id: "student-1", behaviorPoints: 11, loginCode: "ABC123" },
        { id: "student-2", behaviorPoints: 9, loginCode: "XYZ789" },
      ],
    });
    const { POST } = await import("@/app/api/classrooms/[id]/points/batch/route");

    const response = await POST(
      makeJsonRequest({ studentIds: ["student-1", "student-2"], skillId: "skill-1" }),
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "teacher-1",
      action: "classroom.points.batch_awarded",
      targetType: "classroom",
      targetId: "class-1",
      metadata: {
        classroomId: "class-1",
        skillId: "skill-1",
        skillName: "Helping",
        skillWeight: 3,
        awardedCount: 2,
        studentIds: ["student-1", "student-2"],
      },
    });
  });

  it("maps points reset ownership failures to forbidden without logging audit noise", async () => {
    mockResetClassroomPoints.mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: "Forbidden",
    });
    const { POST } = await import("@/app/api/classrooms/[id]/points/reset/route");

    const response = await POST({} as never, makeRouteParams({ id: "class-1" }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });
});
