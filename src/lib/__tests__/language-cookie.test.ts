import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, resolveLanguageFromCookie } from "@/lib/language-cookie";

describe("resolveLanguageFromCookie", () => {
    it("defaults to Thai", () => {
        expect(DEFAULT_LANGUAGE).toBe("th");
        expect(resolveLanguageFromCookie()).toBe("th");
        expect(resolveLanguageFromCookie(undefined)).toBe("th");
        expect(resolveLanguageFromCookie(null)).toBe("th");
    });

    it("returns Thai for explicit th or unknown values", () => {
        expect(resolveLanguageFromCookie("th")).toBe("th");
        expect(resolveLanguageFromCookie("")).toBe("th");
        expect(resolveLanguageFromCookie("fr")).toBe("th");
    });

    it("returns English only when cookie is explicitly en", () => {
        expect(resolveLanguageFromCookie("en")).toBe("en");
    });
});
