/**
 * Phase 9: Operations And Observability
 * Tests for:
 *   D — billing audit category
 *   C — LINE bot audit events in handlers
 *   A — enhanced /api/ready checks
 *   B — /api/admin/ops/metrics endpoint
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── shared mocks (hoisted) ──────────────────────────────────────────────────

const mockValidateServerEnv = vi.fn();
const mockPingOperationalDb = vi.fn();
const mockDbConnect = vi.fn();
const mockIsLineBotConfigured = vi.fn();
const mockIsR2Configured = vi.fn();

const mockUserCount = vi.fn();
const mockClassroomCount = vi.fn();
const mockStudentCount = vi.fn();
const mockLineBotGroupCount = vi.fn();
const mockLineStudentAccountLinkCount = vi.fn();
const mockAssignmentSubmissionCount = vi.fn();

vi.mock("@/lib/env", () => ({
    validateServerEnv: mockValidateServerEnv,
    resolveRateLimitStore: vi.fn().mockReturnValue("memory"),
    resolveAuditLogSink: vi.fn().mockReturnValue("console"),
}));

vi.mock("@/lib/ops/mongo-admin", () => ({
    pingOperationalDb: mockPingOperationalDb,
}));

vi.mock("@/lib/db", () => ({
    db: {
        $connect: mockDbConnect,
        user: { count: mockUserCount },
        classroom: { count: mockClassroomCount },
        student: { count: mockStudentCount },
        lineBotGroup: { count: mockLineBotGroupCount },
        lineStudentAccountLink: { count: mockLineStudentAccountLinkCount },
        assignmentSubmission: { count: mockAssignmentSubmissionCount },
    },
}));

vi.mock("@/lib/line-bot/config", () => ({
    isLineBotConfigured: mockIsLineBotConfigured,
}));

vi.mock("@/lib/storage/r2-env", () => ({
    isR2Configured: mockIsR2Configured,
}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

// ─────────────────────────────────────────────
// D: Billing audit category
// ─────────────────────────────────────────────

describe("D: billing audit category", () => {
    it("maps billing.* actions to billing category", async () => {
        const { buildAuditLogQuery } = await import("@/lib/security/audit-log");
        const q = buildAuditLogQuery({ category: "billing" });
        expect(JSON.stringify(q)).toContain("billing");
    });

    it("other category excludes billing.* prefix via $not regex", async () => {
        const { buildAuditLogQuery } = await import("@/lib/security/audit-log");
        const q = buildAuditLogQuery({ category: "other" }) as {
            action?: { $not?: RegExp };
        };
        // The $not regex source should include billing
        const notRegex = q.action?.$not;
        expect(notRegex).toBeInstanceOf(RegExp);
        expect(notRegex?.source).toContain("billing");
    });

    it("AuditLogEvent accepts billing as a category", async () => {
        const { logAuditEvent } = await import("@/lib/security/audit-log");
        // Should not throw TypeScript error — just verifying type is accepted at runtime
        expect(() =>
            logAuditEvent({
                action: "billing.stripe.subscription_sync",
                category: "billing",
                status: "success",
                targetType: "User",
                targetId: "user-1",
            })
        ).not.toThrow();
    });
});

// ─────────────────────────────────────────────
// A: Enhanced /api/ready
// ─────────────────────────────────────────────

describe("A: enhanced /api/ready", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateServerEnv.mockReturnValue({
            HEALTHCHECK_DB_TIMEOUT_MS: 1000,
            STRIPE_SECRET_KEY: "sk_test_123",
        });
        mockPingOperationalDb.mockResolvedValue({ ok: 1 });
        mockDbConnect.mockResolvedValue(undefined);
        mockIsLineBotConfigured.mockReturnValue(true);
        mockIsR2Configured.mockReturnValue(false);
    });

    it("returns 200 with structured checks when all critical checks pass", async () => {
        const { GET } = await import("@/app/api/ready/route");
        const res = await GET();
        const body = await res.json() as Record<string, unknown>;

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.status).toBe("ready");
        expect(body.checks).toMatchObject({
            mongodb: "ok",
            prisma: "ok",
            lineBot: "configured",
            r2Storage: "not_configured",
            stripe: "configured",
        });
    });

    it("returns 503 and marks mongodb error when ping fails", async () => {
        mockPingOperationalDb.mockRejectedValue(new Error("timeout"));
        const { GET } = await import("@/app/api/ready/route");
        const res = await GET();
        const body = await res.json() as Record<string, unknown>;

        expect(res.status).toBe(503);
        expect(body.ok).toBe(false);
        expect((body.checks as Record<string, string>).mongodb).toBe("error");
        expect((body.errors as string[])[0]).toContain("mongodb");
    });

    it("returns 503 and marks prisma error when Prisma connect fails", async () => {
        mockDbConnect.mockRejectedValue(new Error("connection refused"));
        const { GET } = await import("@/app/api/ready/route");
        const res = await GET();
        const body = await res.json() as Record<string, unknown>;

        expect(res.status).toBe(503);
        expect(body.ok).toBe(false);
        expect((body.checks as Record<string, string>).prisma).toBe("error");
    });

    it("reports stripe not_configured when STRIPE_SECRET_KEY is absent", async () => {
        mockValidateServerEnv.mockReturnValue({
            HEALTHCHECK_DB_TIMEOUT_MS: 1000,
            STRIPE_SECRET_KEY: undefined,
        });
        const { GET } = await import("@/app/api/ready/route");
        const res = await GET();
        const body = await res.json() as Record<string, unknown>;

        expect(res.status).toBe(200);
        expect((body.checks as Record<string, string>).stripe).toBe("not_configured");
    });

    it("reports lineBot not_configured when LINE is not set up", async () => {
        mockIsLineBotConfigured.mockReturnValue(false);
        const { GET } = await import("@/app/api/ready/route");
        const res = await GET();
        const body = await res.json() as Record<string, unknown>;

        expect(res.status).toBe(200);
        expect((body.checks as Record<string, string>).lineBot).toBe("not_configured");
    });
});

// ─────────────────────────────────────────────
// B: /api/admin/ops/metrics
// ─────────────────────────────────────────────

function setupMetricsMocks() {
    // plan counts
    mockUserCount
        .mockResolvedValueOnce(100)   // FREE
        .mockResolvedValueOnce(30)    // PLUS
        .mockResolvedValueOnce(5)     // PRO
        .mockResolvedValueOnce(135);  // total
    // classroom counts
    mockClassroomCount
        .mockResolvedValueOnce(80)    // total
        .mockResolvedValueOnce(12);   // with LINE group
    // student counts
    mockStudentCount.mockResolvedValue(900);
    mockLineBotGroupCount.mockResolvedValue(12);
    mockLineStudentAccountLinkCount.mockResolvedValue(222);
    mockAssignmentSubmissionCount.mockResolvedValue(47);
}

describe("B: GET /api/admin/ops/metrics", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
        mockIsLineBotConfigured.mockReturnValue(true);
        mockIsR2Configured.mockReturnValue(true);
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);
        const { GET } = await import("@/app/api/admin/ops/metrics/route");
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it("rejects non-admin users", async () => {
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        const { GET } = await import("@/app/api/admin/ops/metrics/route");
        const res = await GET();
        expect(res.status).toBe(403);
    });

    it("returns plan distribution, classroom, student, and LINE stats", async () => {
        setupMetricsMocks();
        const { GET } = await import("@/app/api/admin/ops/metrics/route");
        const res = await GET();
        const body = await res.json() as Record<string, unknown>;

        expect(res.status).toBe(200);
        expect(body.plans).toMatchObject({ FREE: 100, PLUS: 30, PRO: 5, total: 135 });
        expect(body.classrooms).toMatchObject({ total: 80, withLineGroup: 12 });
        expect(body.students).toMatchObject({ total: 900 });
        expect(body.line).toMatchObject({ activeGroups: 12, linkedStudents: 222, submissionsThisMonth: 47 });
        expect(body.system).toMatchObject({ lineBotConfigured: true, r2Configured: true });
        expect(typeof body.generatedAt).toBe("string");
    });

    it("includes upgradeRate as a percentage", async () => {
        setupMetricsMocks();
        const { GET } = await import("@/app/api/admin/ops/metrics/route");
        const res = await GET();
        const body = await res.json() as { plans: { upgradeRate: number } };
        // (30 + 5) / 135 * 100 ≈ 25.93
        expect(body.plans.upgradeRate).toBeCloseTo(25.93, 1);
    });

    it("returns uptimeSeconds as a number in system info", async () => {
        setupMetricsMocks();
        const { GET } = await import("@/app/api/admin/ops/metrics/route");
        const res = await GET();
        const body = await res.json() as { system: { uptimeSeconds: unknown } };
        expect(typeof body.system.uptimeSeconds).toBe("number");
    });
});
