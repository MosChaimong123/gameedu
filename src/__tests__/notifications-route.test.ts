import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectAppErrorResponse } from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockNotificationFindMany = vi.fn();
const mockNotificationFindFirst = vi.fn();
const mockNotificationUpdateMany = vi.fn();
const mockNotificationDeleteMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      findMany: mockNotificationFindMany,
      findFirst: mockNotificationFindFirst,
      updateMany: mockNotificationUpdateMany,
      deleteMany: mockNotificationDeleteMany,
    },
  },
}));

describe("notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated notification reads", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/notifications/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockNotificationFindMany).not.toHaveBeenCalled();
  });

  it("rejects invalid patch payloads", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const { PATCH } = await import("@/app/api/notifications/route");

    const response = await PATCH({
      json: async () => ({ id: 123, isRead: "yes" }),
    } as Request);

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid payload",
    });
    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when updating a notification outside the current account", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockNotificationUpdateMany.mockResolvedValue({ count: 0 });
    const { PATCH } = await import("@/app/api/notifications/route");

    const response = await PATCH({
      json: async () => ({ id: "notification-1", isRead: true }),
    } as Request);

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("returns only the safe notification subset for the current account", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockNotificationFindMany.mockResolvedValue([
      {
        id: "notification-1",
        title: "Title",
        message: "Message",
        titleKey: null,
        messageKey: null,
        i18nParams: null,
        type: "INFO",
        isRead: false,
        link: "/dashboard",
        createdAt: new Date("2026-04-02T10:00:00.000Z"),
      },
    ]);
    const { GET } = await import("@/app/api/notifications/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      {
        id: "notification-1",
        title: "Title",
        message: "Message",
        titleKey: null,
        messageKey: null,
        i18nParams: null,
        type: "INFO",
        isRead: false,
        link: "/dashboard",
        createdAt: "2026-04-02T10:00:00.000Z",
      },
    ]);
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          title: true,
          message: true,
          titleKey: true,
          messageKey: true,
          i18nParams: true,
          type: true,
          isRead: true,
          link: true,
          createdAt: true,
        }),
      })
    );
  });

  it("returns 404 when deleting a notification outside the current account", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockNotificationDeleteMany.mockResolvedValue({ count: 0 });
    const { DELETE } = await import("@/app/api/notifications/route");

    const response = await DELETE(
      new Request("http://localhost/api/notifications?id=notification-1", {
        method: "DELETE",
      })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });
});
