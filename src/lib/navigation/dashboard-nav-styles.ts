import type { DashboardNavGroup } from "@/lib/navigation/dashboard-nav";

/**
 * One hue per kind of work, so a menu keeps the same colour wherever it appears.
 * Values come from the `--color-nav-*` tokens in `src/app/globals.css`.
 */

export type NavGroupTileStyle = {
    /** Tile background. Titles on top are white. */
    panelClass: string;
    /** Tile body copy. */
    textClass: string;
};

export const NAV_GROUP_TILE_STYLES: Record<DashboardNavGroup, NavGroupTileStyle> = {
    create: { panelClass: "bg-nav-create", textClass: "text-nav-create-soft" },
    teach: { panelClass: "bg-nav-teach", textClass: "text-nav-teach-soft" },
    measure: { panelClass: "bg-nav-measure", textClass: "text-nav-measure-soft" },
    system: { panelClass: "bg-nav-system", textClass: "text-nav-system-soft" },
    premium: { panelClass: "bg-nav-premium", textClass: "text-nav-premium-soft" },
};

/** Sidebar icon colour — lighter stops, because the sidebar surface is dark. */
export const NAV_GROUP_ICON_CLASSES: Record<DashboardNavGroup, string> = {
    create: "text-nav-create-icon",
    teach: "text-nav-teach-icon",
    measure: "text-nav-measure-icon",
    system: "text-nav-system-icon",
    premium: "text-nav-premium-icon",
};
