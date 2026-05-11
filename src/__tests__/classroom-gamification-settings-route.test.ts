import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";
import { FORBIDDEN_MESSAGE } from "@/lib/api-error";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockClassroomUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
      update: mockClassroomUpdate,
    },
  },
}));

vi.mock("@/lib/prisma-json", () => ({
  toPrismaJson: (value: unknown) => value,
}));

describe("classroom gamification settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
  });

  it("returns normalized gamified settings for the owning teacher", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      gamifiedSettings: { negamon: { enabled: true } },
    });

    const { GET } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await GET({} as Request, makeRouteParams({ id: "class-1" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      gamifiedSettings: { negamon: { enabled: true } },
    });
  });

  it("rejects non-object payloads", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const { PATCH } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await PATCH(
      makeJsonRequest({ gamifiedSettings: "bad" }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid gamification settings",
    });
    expect(mockClassroomUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid negamon structure", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const { PATCH } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await PATCH(
      makeJsonRequest({ gamifiedSettings: { negamon: { enabled: "yes" } } }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid gamification settings",
    });
    expect(mockClassroomUpdate).not.toHaveBeenCalled();
  });

  it("updates gamified settings when caller is platform admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockClassroomUpdate.mockResolvedValue({
      gamifiedSettings: { negamon: { enabled: true } },
    });

    const { PATCH } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await PATCH(
      makeJsonRequest({ gamifiedSettings: { negamon: { enabled: true } } }) as never,
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      gamifiedSettings: { negamon: { enabled: true } },
    });
    expect(mockClassroomUpdate).toHaveBeenCalledWith({
      where: {
        id: "class-1",
      },
      data: {
        gamifiedSettings: { negamon: { enabled: true } },
      },
      select: {
        gamifiedSettings: true,
      },
    });
  });

  it("rejects PATCH for non-admin teachers", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const { PATCH } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await PATCH(
      makeJsonRequest({ gamifiedSettings: { negamon: { enabled: true } } }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: FORBIDDEN_MESSAGE,
    });
    expect(mockClassroomUpdate).not.toHaveBeenCalled();
  });
});
