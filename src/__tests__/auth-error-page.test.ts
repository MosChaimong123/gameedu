import { describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
    redirect: mockRedirect,
}));

describe("auth error page", () => {
    it("redirects Configuration to friendly login error", async () => {
        mockRedirect.mockClear();
        const { default: AuthErrorPage } = await import("@/app/auth/error/page");
        await AuthErrorPage({ searchParams: Promise.resolve({ error: "Configuration" }) });
        expect(mockRedirect).toHaveBeenCalledWith("/login?error=oauth_not_configured");
    });
});
