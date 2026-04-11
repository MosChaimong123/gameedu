import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canHostQuestionSetForUser,
  canLoginCodeAccessClassroom,
  canUserAccessClassroom,
  canUserPublishClassroomSocketEvent,
} from "../resource-access";

describe("resource-access", () => {
  const mockUserFindUnique = vi.fn();
  const mockQuestionSetFindUnique = vi.fn();
  const mockClassroomFindUnique = vi.fn();
  const mockStudentFindFirst = vi.fn();

  const prisma = {
    user: { findUnique: mockUserFindUnique },
    questionSet: { findUnique: mockQuestionSetFindUnique },
    classroom: { findUnique: mockClassroomFindUnique },
    student: { findFirst: mockStudentFindFirst },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canHostQuestionSetForUser", () => {
    it("allows ADMIN for any existing set", async () => {
      mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
      mockQuestionSetFindUnique.mockResolvedValue({ creatorId: "other" });

      await expect(
        canHostQuestionSetForUser(prisma, "admin-1", "set-1")
      ).resolves.toBe(true);
    });

    it("allows creator when not admin", async () => {
      mockUserFindUnique.mockResolvedValue({ role: "TEACHER" });
      mockQuestionSetFindUnique.mockResolvedValue({ creatorId: "teacher-1" });

      await expect(
        canHostQuestionSetForUser(prisma, "teacher-1", "set-1")
      ).resolves.toBe(true);
    });

    it("denies non-creator non-admin", async () => {
      mockUserFindUnique.mockResolvedValue({ role: "TEACHER" });
      mockQuestionSetFindUnique.mockResolvedValue({ creatorId: "other" });

      await expect(
        canHostQuestionSetForUser(prisma, "teacher-1", "set-1")
      ).resolves.toBe(false);
    });
  });

  describe("canUserAccessClassroom", () => {
    it("allows teacher", async () => {
      mockClassroomFindUnique.mockResolvedValue({
        teacherId: "t1",
        students: [],
      });

      await expect(canUserAccessClassroom(prisma, "t1", "c1")).resolves.toBe(true);
    });

    it("allows linked student user", async () => {
      mockClassroomFindUnique.mockResolvedValue({
        teacherId: "t1",
        students: [{ id: "s1" }],
      });

      await expect(canUserAccessClassroom(prisma, "u1", "c1")).resolves.toBe(true);
    });

    it("denies outsider", async () => {
      mockClassroomFindUnique.mockResolvedValue({
        teacherId: "t1",
        students: [],
      });

      await expect(canUserAccessClassroom(prisma, "u1", "c1")).resolves.toBe(false);
    });
  });

  describe("canUserPublishClassroomSocketEvent", () => {
    it("POINT_UPDATE only for teacher", async () => {
      mockClassroomFindUnique.mockResolvedValue({
        teacherId: "t1",
        students: [{ id: "s1" }],
      });

      await expect(
        canUserPublishClassroomSocketEvent(prisma, "t1", "c1", "POINT_UPDATE")
      ).resolves.toBe(true);
      await expect(
        canUserPublishClassroomSocketEvent(prisma, "u1", "c1", "POINT_UPDATE")
      ).resolves.toBe(false);
    });

    it("BOARD_UPDATE for teacher or linked student", async () => {
      mockClassroomFindUnique.mockResolvedValue({
        teacherId: "t1",
        students: [{ id: "s1" }],
      });

      await expect(
        canUserPublishClassroomSocketEvent(prisma, "t1", "c1", "BOARD_UPDATE")
      ).resolves.toBe(true);

      mockClassroomFindUnique.mockResolvedValue({
        teacherId: "t1",
        students: [{ id: "s1" }],
      });
      await expect(
        canUserPublishClassroomSocketEvent(prisma, "u1", "c1", "BOARD_UPDATE")
      ).resolves.toBe(true);
    });
  });

  describe("canLoginCodeAccessClassroom", () => {
    it("matches class id", async () => {
      mockStudentFindFirst.mockResolvedValue({ classId: "c1" });
      await expect(
        canLoginCodeAccessClassroom(prisma, "CODE1", "c1")
      ).resolves.toBe(true);
    });

    it("rejects wrong class", async () => {
      mockStudentFindFirst.mockResolvedValue({ classId: "c2" });
      await expect(
        canLoginCodeAccessClassroom(prisma, "CODE1", "c1")
      ).resolves.toBe(false);
    });
  });
});
