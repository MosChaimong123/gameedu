/** Keys for dashboard Quick Actions hero + menu tiles (swap `src` to `/assets/dashboard/*.webp` when art is ready). */
export type DashboardMenuAssetKey =
    | "heroTeacher"
    | "heroStudent"
    | "viewReports"
    | "activeClasses"
    | "omrScanner"
    | "mySets"
    | "profile"
    | "history"
    | "settings"
    | "upgrade";

export type DashboardMenuImage = {
    src: string;
    alt: string;
};

const DASHBOARD_MENU_IMAGE_ALTS: Record<DashboardMenuAssetKey, string> = {
    heroTeacher: "Teacher hosting a classroom game",
    heroStudent: "Student joining a live game",
    viewReports: "Classroom reports and progress",
    activeClasses: "Active classes and students",
    omrScanner: "OMR answer sheet scanner",
    mySets: "Question sets library",
    profile: "Student profile and avatar",
    history: "Game and activity history",
    settings: "Account and app settings",
    upgrade: "TeachPlayEdu Plus upgrade",
};

/** Placeholder art from game/Negamon assets when no custom file is listed in `DASHBOARD_MENU_CUSTOM_SRC`. */
const DASHBOARD_MENU_FALLBACK_SRC: Record<DashboardMenuAssetKey, string> = {
    heroTeacher: "/assets/gold-quest-v2.png",
    heroStudent: "/assets/fishing-frenzy-v2.png",
    viewReports: "/assets/crypto-hack-v2.png",
    activeClasses: "/assets/cafe.png",
    omrScanner: "/assets/factory.png",
    mySets: "/assets/tower-defense.png",
    profile: "/assets/negamon/hanuman_rank0.png",
    history: "/assets/racing.png",
    settings: "/assets/negamon/kinnaree_rank0.png",
    upgrade: "/assets/negamon/garuda_rank0.png",
};

/** Custom art in `public/assets/dashboard/` — add `{key}.png` / `.webp` / `.jpg` and map here (or rely on fallback). */
const DASHBOARD_MENU_CUSTOM_SRC: Partial<Record<DashboardMenuAssetKey, string>> = {
    heroTeacher: "/assets/dashboard/heroTeacher.png",
    heroStudent: "/assets/dashboard/heroStudent.png",
    viewReports: "/assets/dashboard/viewReports.png",
    activeClasses: "/assets/dashboard/activeClasses.png",
    omrScanner: "/assets/dashboard/omrScanner.png",
    mySets: "/assets/dashboard/mySets.png",
};

export function getDashboardMenuImage(key: DashboardMenuAssetKey): DashboardMenuImage {
    return {
        src: DASHBOARD_MENU_CUSTOM_SRC[key] ?? DASHBOARD_MENU_FALLBACK_SRC[key],
        alt: DASHBOARD_MENU_IMAGE_ALTS[key],
    };
}
