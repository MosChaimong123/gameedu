import { afterEach, describe, expect, it, vi } from "vitest";

import {
    DASHBOARD_NAV_ITEMS,
    getDashboardTiles,
    getSidebarNavItems,
    isNavItemLocked,
} from "@/lib/navigation/dashboard-nav";
import { getTranslationText } from "@/lib/translation-lookup";

/** Items reachable from the header instead of a dashboard tile. */
const HEADER_ONLY_KEYS = new Set(["dashboard", "profile", "upgradeToPlus"]);

const hasThaiGlyph = (text: string) => /[฀-๿]/.test(text);

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("dashboard navigation config", () => {
    it("gives every sidebar work item a matching dashboard tile", () => {
        vi.stubEnv("NEXT_PUBLIC_COURSES_UI_ENABLED", "true");

        const sidebarKeys = getSidebarNavItems()
            .filter((item) => !HEADER_ONLY_KEYS.has(item.key))
            .map((item) => item.key);
        const tileKeys = getDashboardTiles("TEACHER").map((item) => item.key);

        expect(tileKeys).toEqual(sidebarKeys);
    });

    it("keeps tiles in sidebar order", () => {
        vi.stubEnv("NEXT_PUBLIC_COURSES_UI_ENABLED", "true");

        const sidebarOrder = getSidebarNavItems().map((item) => item.key);
        const tileOrder = getDashboardTiles("TEACHER").map((item) => item.key);
        const positions = tileOrder.map((key) => sidebarOrder.indexOf(key));

        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it("hides the courses entry from both surfaces when the flag is off", () => {
        vi.stubEnv("NEXT_PUBLIC_COURSES_UI_ENABLED", "");

        expect(getSidebarNavItems().some((item) => item.key === "courses")).toBe(false);
        expect(getDashboardTiles("TEACHER").some((item) => item.key === "courses")).toBe(false);
    });

    it("shows the courses entry on both surfaces when the flag is on", () => {
        vi.stubEnv("NEXT_PUBLIC_COURSES_UI_ENABLED", "true");

        expect(getSidebarNavItems().some((item) => item.key === "courses")).toBe(true);
        expect(getDashboardTiles("TEACHER").some((item) => item.key === "courses")).toBe(true);
    });

    it("locks OMR while its flag is off and keeps it visible", () => {
        vi.stubEnv("NEXT_PUBLIC_OMR_DASHBOARD_ENABLED", "");

        const omr = DASHBOARD_NAV_ITEMS.find((item) => item.key === "omrScanner");
        expect(omr).toBeDefined();
        expect(isNavItemLocked(omr!)).toBe(true);
        expect(getDashboardTiles("TEACHER").some((item) => item.key === "omrScanner")).toBe(true);

        vi.stubEnv("NEXT_PUBLIC_OMR_DASHBOARD_ENABLED", "true");
        expect(isNavItemLocked(omr!)).toBe(false);
    });

    it("leaves the student tile set unchanged", () => {
        expect(getDashboardTiles("STUDENT").map((item) => item.key)).toEqual([
            "profile",
            "history",
            "settings",
            "upgradeToPlus",
        ]);
    });

    it("resolves every tile label and description in English and Thai", () => {
        vi.stubEnv("NEXT_PUBLIC_COURSES_UI_ENABLED", "true");

        const tiles = [...getDashboardTiles("TEACHER"), ...getDashboardTiles("STUDENT")];

        for (const tile of tiles) {
            for (const key of [tile.labelKey, tile.descKey]) {
                const english = getTranslationText("en", key);
                const thai = getTranslationText("th", key);

                expect(english, `${key} should resolve in English`).not.toBe(key);
                expect(thai, `${key} should resolve in Thai`).not.toBe(key);
                expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
            }
        }
    });

    it("gives every lockable item translated coming-soon copy", () => {
        vi.stubEnv("NEXT_PUBLIC_OMR_DASHBOARD_ENABLED", "");

        const lockable = DASHBOARD_NAV_ITEMS.filter((item) => item.comingSoonBodyKey);
        expect(lockable.length).toBeGreaterThan(0);

        for (const item of lockable) {
            const key = item.comingSoonBodyKey!;
            const english = getTranslationText("en", key);
            const thai = getTranslationText("th", key);

            expect(english, `${key} should resolve in English`).not.toBe(key);
            expect(thai, `${key} should resolve in Thai`).not.toBe(key);
            expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
        }
    });

    it("keeps nav keys and hrefs unique", () => {
        const keys = DASHBOARD_NAV_ITEMS.map((item) => item.key);
        const hrefs = DASHBOARD_NAV_ITEMS.map((item) => item.href);

        expect(new Set(keys).size).toBe(keys.length);
        expect(new Set(hrefs).size).toBe(hrefs.length);
    });
});
