import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockListFailures = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/line-bot/webhook-inbox", () => ({
    listLineWebhookFailures: mockListFailures,
}));

describe("GET /api/admin/ops/line-events", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListFailures.mockResolvedValue([]);
    });

    it("requires authentication", async () => {
        mockAuth.mockResolvedValue(null);
        const { GET } = await import("@/app/api/admin/ops/line-events/route");
        const response = await GET(new Request("http://localhost/api/admin/ops/line-events"));
        expect(response.status).toBe(401);
    });

    it("requires the ADMIN role", async () => {
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        const { GET } = await import("@/app/api/admin/ops/line-events/route");
        const response = await GET(new Request("http://localhost/api/admin/ops/line-events"));
        expect(response.status).toBe(403);
    });

    it("returns redacted failure metadata to an admin", async () => {
        mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
        mockListFailures.mockResolvedValue([{ id: "event-1", status: "dead" }]);
        const { GET } = await import("@/app/api/admin/ops/line-events/route");
        const response = await GET(
            new Request("http://localhost/api/admin/ops/line-events?status=dead&take=10")
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ count: 1 });
        expect(mockListFailures).toHaveBeenCalledWith({ status: "dead", take: 10 });
    });
});
