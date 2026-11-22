import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
    NAV_GROUP_ICON_CLASSES,
    NAV_GROUP_TILE_STYLES,
} from "@/lib/navigation/dashboard-nav-styles";

/**
 * The nav group palette is only useful if it stays readable. White titles and
 * the `soft` body copy both sit on the `solid` tile background, and the `icon`
 * stop sits on the dark sidebar surface.
 */

const GLOBALS_CSS = readFileSync(
    path.join(process.cwd(), "src", "app", "globals.css"),
    "utf8"
);

/** `--sidebar` is oklch(0.22 …) — a lightness of 0.22 lands near this luminance. */
const SIDEBAR_LUMINANCE = 0.0107;
const WCAG_AA_NORMAL_TEXT = 4.5;

function readToken(name: string): string {
    const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(GLOBALS_CSS);
    if (!match) throw new Error(`Token --color-${name} not found in globals.css`);
    return match[1];
}

function relativeLuminance(hex: string): number {
    const channels = [1, 3, 5].map((offset) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: number, b: number): number {
    const [lighter, darker] = a > b ? [a, b] : [b, a];
    return (lighter + 0.05) / (darker + 0.05);
}

const groups = Object.keys(NAV_GROUP_TILE_STYLES) as Array<
    keyof typeof NAV_GROUP_TILE_STYLES
>;

describe("dashboard nav colour system", () => {
    it("covers every group with tile and icon styles", () => {
        expect(Object.keys(NAV_GROUP_ICON_CLASSES).sort()).toEqual([...groups].sort());
    });

    it("keeps white tile titles readable on every group background", () => {
        for (const group of groups) {
            const solid = relativeLuminance(readToken(`nav-${group}`));
            const ratio = contrastRatio(1, solid);

            expect(ratio, `white on nav-${group} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
                WCAG_AA_NORMAL_TEXT
            );
        }
    });

    it("keeps tile body copy readable on its own group background", () => {
        for (const group of groups) {
            const solid = relativeLuminance(readToken(`nav-${group}`));
            const soft = relativeLuminance(readToken(`nav-${group}-soft`));
            const ratio = contrastRatio(soft, solid);

            expect(
                ratio,
                `nav-${group}-soft on nav-${group} is ${ratio.toFixed(2)}:1`
            ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        }
    });

    it("keeps sidebar icons readable on the dark sidebar surface", () => {
        for (const group of groups) {
            const icon = relativeLuminance(readToken(`nav-${group}-icon`));
            const ratio = contrastRatio(icon, SIDEBAR_LUMINANCE);

            expect(
                ratio,
                `nav-${group}-icon on the sidebar is ${ratio.toFixed(2)}:1`
            ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        }
    });

    it("drops the old per-item tile colours", () => {
        const quickActions = readFileSync(
            path.join(process.cwd(), "src", "components", "dashboard", "quick-actions.tsx"),
            "utf8"
        );

        for (const stale of ["bg-amber-600", "bg-emerald-600", "bg-sky-600", "bg-lime-600"]) {
            expect(quickActions, `${stale} should come from a nav group token`).not.toContain(stale);
        }
    });
});
