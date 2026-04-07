import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

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
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
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
    const { PATCH } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await PATCH(
      makeJsonRequest({ gamifiedSettings: "bad" }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "gamifiedSettings must be an object",
    });
    expect(mockClassroomUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid negamon structure", async () => {
    const { PATCH } = await import("@/app/api/classrooms/[id]/gamification-settings/route");
    const response = await PATCH(
      makeJsonRequest({ gamifiedSettings: { negamon: { enabled: "yes" } } }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "gamifiedSettings has an invalid structure",
    });
    expect(mockClassroomUpdate).not.toHaveBeenCalled();
  });

  it("updates gamified settings for the owning teacher", async () => {
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
        teacherId: "teacher-1",
      },
      data: {
        gamifiedSettings: { negamon: { enabled: true } },
      },
      select: {
        gamifiedSettings: true,
      },
    });
  });
});
