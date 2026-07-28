import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockDeliveryFindUnique = vi.fn();
const mockRetryDelivery = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({
    db: { classroom: { findUnique: mockClassroomFindUnique } },
    getOptionalDbModel: () => ({
        findUnique: mockDeliveryFindUnique,
    }),
}));
vi.mock("@/lib/line-bot/reminder-retry", () => ({
    retryLineReminderDelivery: mockRetryDelivery,
}));

describe("POST classroom LINE reminder retry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ teacherId: "teacher-1" });
        mockDeliveryFindUnique.mockResolvedValue({ classroomId: "class-1" });
        mockRetryDelivery.mockResolvedValue({ ok: true, status: "sent" });
    });

    async function call() {
        const { POST } = await import(
            "@/app/api/classrooms/[id]/line-reminder-deliveries/[deliveryId]/retry/route"
        );
        return POST(new Request("http://localhost", { method: "POST" }), {
            params: Promise.resolve({ id: "class-1", deliveryId: "delivery-1" }),
        });
    }

    it("rejects a teacher who does not own the classroom", async () => {
        mockClassroomFindUnique.mockResolvedValue({ teacherId: "teacher-2" });
        expect((await call()).status).toBe(403);
        expect(mockRetryDelivery).not.toHaveBeenCalled();
    });

    it("does not allow retrying a delivery from another classroom", async () => {
        mockDeliveryFindUnique.mockResolvedValue({ classroomId: "class-2" });
        expect((await call()).status).toBe(404);
        expect(mockRetryDelivery).not.toHaveBeenCalled();
    });

    it("allows the owner to retry a failed delivery", async () => {
        const response = await call();
        expect(response.status).toBe(200);
        expect(mockRetryDelivery).toHaveBeenCalledWith("delivery-1");
    });
});
