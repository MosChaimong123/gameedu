import {
    BarChart3,
    BookMarked,
    BookOpen,
    Camera,
    GraduationCap,
    History,
    LayoutDashboard,
    Library,
    Settings,
    Sparkles,
    UserCircle,
    Users,
    type LucideIcon,
} from "lucide-react";

import type { DashboardMenuAssetKey } from "@/lib/dashboard-menu-assets";
import { isCoursesUiEnabled } from "@/lib/courses-ui-enabled";
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled";

/**
 * Single source of truth for teacher navigation: the sidebar, the mobile sheet
 * (which renders the same sidebar), and the dashboard menu tiles all read from
 * here so a menu can never exist in one surface and be missing from the other.
 */

/** Work category — drives the shared colour system across sidebar and tiles. */
export type DashboardNavGroup = "create" | "teach" | "measure" | "system" | "premium";

export type DashboardNavItem = {
    key: string;
    labelKey: string;
    href: string;
    icon: LucideIcon;
    group: DashboardNavGroup;
    /** Present when the item can be rendered as a menu tile. */
    descKey?: string;
    /** Present when the item has tile artwork. */
    assetKey?: DashboardMenuAssetKey;
    /** Longer copy shown when a locked item is opened. Falls back to `descKey`. */
    comingSoonBodyKey?: string;
    /** Tile shown on the teacher dashboard. */
    showOnDashboard: boolean;
};

/** A nav item that carries everything a menu tile needs to render. */
export type DashboardTileItem = DashboardNavItem &
    Required<Pick<DashboardNavItem, "descKey" | "assetKey">>;

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
    {
        key: "dashboard",
        labelKey: "dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        group: "system",
        showOnDashboard: false,
    },
    {
        key: "mySets",
        labelKey: "mySets",
        href: "/dashboard/my-sets",
        icon: BookOpen,
        group: "create",
        descKey: "manageSetsDesc",
        assetKey: "mySets",
        showOnDashboard: true,
    },
    {
        key: "mediaLibrary",
        labelKey: "mediaLibrary",
        href: "/dashboard/media-library",
        icon: Library,
        group: "create",
        descKey: "mediaLibraryDesc",
        assetKey: "mediaLibrary",
        showOnDashboard: true,
    },
    {
        key: "activeClasses",
        labelKey: "activeClasses",
        href: "/dashboard/classrooms",
        icon: Users,
        group: "teach",
        descKey: "manageStudents",
        assetKey: "activeClasses",
        showOnDashboard: true,
    },
    {
        key: "lessons",
        labelKey: "lessons",
        href: "/dashboard/lessons",
        icon: GraduationCap,
        group: "create",
        descKey: "lessonsDesc",
        assetKey: "lessons",
        showOnDashboard: true,
    },
    {
        key: "courses",
        labelKey: "courses",
        href: "/dashboard/courses",
        icon: BookMarked,
        group: "create",
        descKey: "coursesDesc",
        assetKey: "courses",
        showOnDashboard: true,
    },
    {
        key: "viewReports",
        labelKey: "viewReports",
        href: "/dashboard/reports",
        icon: BarChart3,
        group: "measure",
        descKey: "checkProgress",
        assetKey: "viewReports",
        showOnDashboard: true,
    },
    {
        key: "omrScanner",
        labelKey: "omrScanner",
        href: "/dashboard/omr",
        icon: Camera,
        group: "measure",
        descKey: "scanAnswers",
        assetKey: "omrScanner",
        comingSoonBodyKey: "omrComingSoonBody",
        showOnDashboard: true,
    },
    {
        key: "history",
        labelKey: "history",
        href: "/dashboard/history",
        icon: History,
        group: "measure",
        descKey: "pastGames",
        assetKey: "history",
        showOnDashboard: true,
    },
    {
        key: "settings",
        labelKey: "settings",
        href: "/dashboard/settings",
        icon: Settings,
        group: "system",
        descKey: "preferences",
        assetKey: "settings",
        showOnDashboard: true,
    },
    {
        key: "profile",
        labelKey: "profile",
        href: "/dashboard/profile",
        icon: UserCircle,
        group: "system",
        descKey: "profileQuickDesc",
        assetKey: "profile",
        // Reachable from the header avatar.
        showOnDashboard: false,
    },
    {
        key: "upgradeToPlus",
        labelKey: "upgradeToPlus",
        href: "/dashboard/upgrade",
        icon: Sparkles,
        group: "premium",
        descKey: "getMoreTokens",
        assetKey: "upgrade",
        // Reachable from the header PLUS button.
        showOnDashboard: false,
    },
];

/** Student dashboard tiles, in display order. */
const STUDENT_TILE_KEYS = ["profile", "history", "settings", "upgradeToPlus"] as const;

function hasTileFields(item: DashboardNavItem): item is DashboardTileItem {
    return Boolean(item.descKey && item.assetKey);
}

/** Items hidden behind a feature flag rather than removed. */
function isNavItemAvailable(item: DashboardNavItem): boolean {
    if (item.key === "courses") return isCoursesUiEnabled();
    return true;
}

/** Visible but not yet usable — rendered as a locked entry with a "coming soon" badge. */
export function isNavItemLocked(item: DashboardNavItem): boolean {
    return item.key === "omrScanner" && !isOmrDashboardEnabled();
}

/** Every nav entry the sidebar should render, feature flags applied. */
export function getSidebarNavItems(): DashboardNavItem[] {
    return DASHBOARD_NAV_ITEMS.filter(isNavItemAvailable);
}

/** Menu tiles for the dashboard, matching the sidebar one-to-one. */
export function getDashboardTiles(role?: string): DashboardTileItem[] {
    const isStudent = role === "STUDENT";

    if (isStudent) {
        return STUDENT_TILE_KEYS.map((key) => {
            const item = DASHBOARD_NAV_ITEMS.find((navItem) => navItem.key === key);
            if (!item || !hasTileFields(item)) {
                throw new Error(`Student tile "${key}" is missing descKey or assetKey`);
            }
            return item;
        });
    }

    return DASHBOARD_NAV_ITEMS.filter(
        (item) => item.showOnDashboard && isNavItemAvailable(item) && hasTileFields(item)
    ) as DashboardTileItem[];
}
