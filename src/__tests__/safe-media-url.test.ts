import { describe, expect, it } from "vitest";
import {
    assertSafeHttpUrl,
    assertSafeUploadedMediaUrl,
    BOARD_ERR_INVALID_MEDIA,
    isUploadMediaPath,
} from "@/lib/safe-media-url";

describe("safe-media-url", () => {
    it("accepts upload paths under /uploads/", () => {
        expect(() => assertSafeUploadedMediaUrl("/uploads/a1b2c3.pdf")).not.toThrow();
        expect(isUploadMediaPath("/uploads/a1b2c3.pdf")).toBe(true);
    });

    it("accepts absolute https URLs for uploaded media", () => {
        expect(() =>
            assertSafeUploadedMediaUrl("https://example.com/uploads/file.pdf")
        ).not.toThrow();
    });

    it("rejects javascript and path traversal in upload media urls", () => {
        for (const value of [
            "javascript:alert(1)",
            "/uploads/../secret.pdf",
            "//evil.com/x.pdf",
            "/etc/passwd",
        ]) {
            expect(() => assertSafeUploadedMediaUrl(value)).toThrow(BOARD_ERR_INVALID_MEDIA);
        }
    });

    it("rejects non-http protocols for external links", () => {
        expect(() => assertSafeHttpUrl("javascript:alert(1)")).toThrow(BOARD_ERR_INVALID_MEDIA);
        expect(() => assertSafeHttpUrl("/uploads/file.pdf")).toThrow(BOARD_ERR_INVALID_MEDIA);
    });

    it("allows http and https for external links", () => {
        expect(() => assertSafeHttpUrl("https://example.com")).not.toThrow();
        expect(() => assertSafeHttpUrl("http://example.com")).not.toThrow();
    });
});
