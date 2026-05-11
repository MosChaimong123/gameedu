"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import {
    CheckSquare,
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    Gamepad2,
    LayoutGrid,
    Lock,
    Plus,
    Settings,
    Shuffle,
    Swords,
    TableProperties,
    Timer,
    UserCog,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddStudentDialog } from "./add-student-dialog";
import { StudentLoginsDialog } from "./student-logins-dialog";
import { EventManagerButton } from "./EventManagerButton";
import { ClassroomRankSettingsDialog } from "./classroom-rank-settings-dialog";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";
import { getThemeAccentColor } from "@/lib/classroom-utils";
import { gamificationToolbarButtonClassName } from "./gamification-toolbar-styles";

interface ClassroomDashboardToolbarProps {
    t: (key: string, params?: Record<string, string | number>) => string;
    classroom: ClassroomDashboardViewModel;
    /** Until session is known, avoid flashing “coming soon” for teachers. */
    gamificationToolbarMode: "loading" | "live" | "comingSoon";
    isConnected: boolean;
    viewMode: "grid" | "table" | "negamon";
    mobileToolbarOpen: boolean;
    isSelectMultiple: boolean;
    selectedStudentIds: string[];
    onToggleMobileToolbar: () => void;
    onOpenAddAssignment: () => void;
    onSelectViewMode: (mode: "grid" | "table" | "negamon") => void;
    onOpenTimer: () => void;
    onOpenRandomPicker: () => void;
    onOpenGroupMaker: () => void;
    onStudentsAdded: (students: ClassroomDashboardViewModel["students"]) => void;
    onOpenStudentManager: () => void;
    onRankSettingsSaved: (classroom: unknown) => void;
    onOpenNegamonSettings: () => void;
    onEnterAttendanceMode: () => void;
    onToggleSelectMultiple: () => void;
    onOpenSettings: () => void;
}

export function ClassroomDashboardToolbar({
    t,
    classroom,
    gamificationToolbarMode,
    isConnected,
    viewMode,
    mobileToolbarOpen,
    isSelectMultiple,
    selectedStudentIds,
    onToggleMobileToolbar,
    onOpenAddAssignment,
    onSelectViewMode,
    onOpenTimer,
    onOpenRandomPicker,
    onOpenGroupMaker,
    onStudentsAdded,
    onOpenStudentManager,
    onRankSettingsSaved,
    onOpenNegamonSettings,
    onEnterAttendanceMode,
    onToggleSelectMultiple,
    onOpenSettings,
}: ClassroomDashboardToolbarProps) {
    const gamificationLive = gamificationToolbarMode === "live";
    const toolbarAccent = getThemeAccentColor(classroom.theme);
    const toolbarChromeStyle = {
        "--toolbar-accent": toolbarAccent,
    } as CSSProperties;

    return (
        <div
            className="mb-6 flex flex-col overflow-hidden rounded-[22px] border border-[#d9d9dd] bg-white shadow-sm"
            style={toolbarChromeStyle}
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f2f2f2] bg-[#fafafa] px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white p-2 text-2xl md:p-2.5">
                        {classroom.emoji?.startsWith("data:image") || classroom.emoji?.startsWith("http") ? (
                            <Image
                                src={classroom.emoji}
                                alt={t("classroomIconAlt")}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <span>{classroom.emoji || classroom.image || "🏫"}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-normal uppercase tracking-[0.28px] text-[#93939f]">
                            {t("classroomHeaderLabel")}
                        </p>
                        <p className="text-xl font-medium leading-tight text-[#000000] md:text-2xl">
                            {classroom.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-[#93939f]" />
                            <span className="text-sm text-[#93939f]">
                                {t("studentsCount", { count: classroom.students.length })}
                            </span>
                            <div
                                className={`ml-1 h-2 w-2 rounded-full ${
                                    isConnected ? "bg-green-400" : "bg-red-400"
                                }`}
                                title={isConnected ? t("connected") : t("disconnected")}
                            />
                        </div>
                    </div>
                </div>

                <div className="shrink-0 rounded-full border border-[#e5e7eb] bg-white p-1">
                    <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-0.5">
                        <Button
                            type="button"
                            size="sm"
                            title={t("assignmentManageTooltip")}
                            className="h-9 min-h-[44px] min-w-[44px] rounded-full border border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:hidden"
                            onClick={onOpenAddAssignment}
                        >
                            <Plus className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">{t("assignmentShortLabel")}</span>
                        </Button>
                        <Button
                            size="sm"
                            className={`h-9 min-h-[44px] rounded-full px-4 text-sm font-medium transition-all touch-manipulation ${
                                viewMode === "grid"
                                    ? "bg-[#000000] text-white shadow-none hover:opacity-85"
                                    : "bg-transparent text-[#212121] shadow-none hover:text-[color:var(--toolbar-accent)]"
                            }`}
                            onClick={() => onSelectViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4 md:mr-2" />
                            <span className="hidden sm:inline">{t("grid")}</span>
                        </Button>
                        <Button
                            size="sm"
                            className={`h-9 min-h-[44px] rounded-full px-4 text-sm font-medium transition-all touch-manipulation ${
                                viewMode === "table"
                                    ? "bg-[#000000] text-white shadow-none hover:opacity-85"
                                    : "bg-transparent text-[#212121] shadow-none hover:text-[color:var(--toolbar-accent)]"
                            }`}
                            onClick={() => onSelectViewMode("table")}
                        >
                            <TableProperties className="h-4 w-4 md:mr-2" />
                            <span className="hidden sm:inline">{t("table")}</span>
                        </Button>
                        {gamificationLive ? (
                            <Button
                                size="sm"
                                className={`h-9 min-h-[44px] rounded-full px-4 text-sm font-medium transition-all touch-manipulation ${
                                    viewMode === "negamon"
                                        ? "bg-[#000000] text-white shadow-none hover:opacity-85"
                                        : "bg-transparent text-[#212121] shadow-none hover:text-[color:var(--toolbar-accent)]"
                                }`}
                                onClick={() => onSelectViewMode("negamon")}
                                title={t("negamonCardTitle")}
                            >
                                <Swords className="h-4 w-4 md:mr-2" />
                                <span className="hidden sm:inline">{t("negamonCardTitle")}</span>
                            </Button>
                        ) : null}
                        {viewMode === "table" && (
                            <Button
                                size="sm"
                                className="hidden h-9 min-h-[44px] rounded-full bg-[#000000] px-4 text-sm font-medium text-white shadow-none hover:opacity-85 touch-manipulation lg:inline-flex"
                                onClick={onOpenAddAssignment}
                            >
                                <Plus className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">{t("assignmentDialogTitle")}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile toggle */}
            <button
                type="button"
                onClick={onToggleMobileToolbar}
                className="flex w-full items-center justify-center gap-2 border-b border-[#f2f2f2] bg-white py-3 text-sm font-medium text-[#93939f] transition-colors hover:text-[color:var(--toolbar-accent)] active:bg-[#fafafa] touch-manipulation lg:hidden"
                aria-expanded={mobileToolbarOpen}
            >
                {mobileToolbarOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                )}
                {t("toolbarMobileSummary")}
            </button>

            {/* Toolbar sections */}
            <div className={`w-full flex-wrap bg-white ${mobileToolbarOpen ? "flex" : "max-lg:hidden"}`}>
                <div className="flex flex-grow flex-col justify-center border-r border-b border-[#f2f2f2] px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2.5 text-xs font-normal uppercase tracking-[0.28px] text-[#93939f]">
                        {t("toolbarSectionTools")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:h-8 lg:min-h-0"
                            onClick={onOpenTimer}
                        >
                            <Timer className="mr-1.5 h-4 w-4" />
                            {t("timer")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:h-8 lg:min-h-0"
                            onClick={onOpenRandomPicker}
                        >
                            <Shuffle className="mr-1.5 h-4 w-4" />
                            {t("random")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:h-8 lg:min-h-0"
                            onClick={onOpenGroupMaker}
                        >
                            <Users className="mr-1.5 h-4 w-4" />
                            {t("groups")}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-grow flex-col justify-center border-r border-b border-[#f2f2f2] px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2.5 text-xs font-normal uppercase tracking-[0.28px] text-[#93939f]">
                        {t("toolbarSectionStudents")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="touch-manipulation [&_button]:min-h-[44px] lg:[&_button]:min-h-0">
                            <AddStudentDialog
                                classId={classroom.id}
                                theme={classroom.theme || ""}
                                onStudentAdded={(students) =>
                                    onStudentsAdded(students as never)
                                }
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:h-8 lg:min-h-0"
                            onClick={onOpenStudentManager}
                        >
                            <UserCog className="mr-1.5 h-4 w-4" />
                            {t("classroomManageStudents")}
                        </Button>
                        <StudentLoginsDialog
                            students={classroom.students}
                            classId={classroom.id}
                            theme={classroom.theme || ""}
                        />
                    </div>
                </div>

                <div className="relative flex flex-grow flex-col justify-center border-r border-b border-[#f2f2f2] px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2.5 flex items-center gap-2 text-xs font-normal uppercase tracking-[0.28px] text-[#93939f]">
                        <Gamepad2 className="h-3.5 w-3.5 text-[color:var(--toolbar-accent)]" aria-hidden />
                        {t("toolbarSectionGamification")}
                    </p>
                    {gamificationToolbarMode === "loading" ? (
                        <div className="flex min-h-[36px] items-center">
                            <div className="h-9 w-full max-w-[200px] animate-pulse rounded-full bg-[#f2f2f2]" />
                        </div>
                    ) : gamificationLive ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <ClassroomRankSettingsDialog classroom={classroom} onSaved={onRankSettingsSaved} />
                            <EventManagerButton classId={classroom.id} theme={classroom.theme || ""} />
                            <Button
                                variant="default"
                                size="sm"
                                type="button"
                                className={gamificationToolbarButtonClassName}
                                onClick={onOpenNegamonSettings}
                            >
                                <Swords className="mr-1.5 h-4 w-4 shrink-0 opacity-95" />
                                {t("negamonCardTitle")}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex min-h-[44px] items-center rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fafafa] px-4 py-2">
                            <span className="inline-flex items-center gap-2 text-sm font-bold text-[#93939f]">
                                <Lock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                {t("hostComingSoon")}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-grow flex-col justify-center border-b border-[#f2f2f2] px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2.5 text-xs font-normal uppercase tracking-[0.28px] text-[#93939f]">
                        {t("toolbarSectionActions")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:h-8 lg:min-h-0"
                            onClick={onEnterAttendanceMode}
                        >
                            <ClipboardCheck className="mr-1.5 h-4 w-4" />
                            {t("takeAttendance")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-9 min-h-[44px] rounded-full px-3 text-sm font-medium leading-snug shadow-none touch-manipulation lg:h-8 lg:min-h-0 ${
                                isSelectMultiple
                                    ? "border-[color:var(--toolbar-accent)] bg-[color:var(--toolbar-accent)] text-white hover:opacity-85"
                                    : "border-[#d9d9dd] bg-white text-[#212121] hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)]"
                            }`}
                            onClick={onToggleSelectMultiple}
                        >
                            <CheckSquare className="mr-1.5 h-4 w-4" />
                            {t("selectMultipleStudents")}
                            {isSelectMultiple ? ` (${selectedStudentIds.length})` : ""}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white px-3 text-sm font-medium leading-snug text-[#212121] shadow-none hover:border-[color:var(--toolbar-accent)] hover:text-[color:var(--toolbar-accent)] touch-manipulation lg:h-8 lg:min-h-0"
                            onClick={onOpenSettings}
                        >
                            <Settings className="mr-1.5 h-4 w-4" />
                            {t("openSettings")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
