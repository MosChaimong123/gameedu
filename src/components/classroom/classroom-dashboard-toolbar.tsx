"use client";

import Image from "next/image";
import {
    CheckSquare,
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    LayoutGrid,
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
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";

interface ClassroomDashboardToolbarProps {
    t: (key: string, params?: Record<string, string | number>) => string;
    classroom: ClassroomDashboardViewModel;
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
    onRankSettingsSaved: (classroom: ClassroomDashboardViewModel) => void;
    onOpenNegamonSettings: () => void;
    onEnterAttendanceMode: () => void;
    onToggleSelectMultiple: () => void;
    onOpenSettings: () => void;
}

export function ClassroomDashboardToolbar({
    t,
    classroom,
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
    return (
        <div className="mb-6 flex flex-col overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-800/95 shadow-lg backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-600/70 bg-slate-900/40 px-5 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/35 bg-white/18 p-2 text-2xl shadow-inner backdrop-blur-sm md:p-2.5">
                        {classroom.emoji?.startsWith("data:image") || classroom.emoji?.startsWith("http") ? (
                            <Image
                                src={classroom.emoji}
                                alt="Class Icon"
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
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200">
                            {t("classroomHeaderLabel")}
                        </p>
                        <p className="text-xl font-extrabold leading-tight text-white drop-shadow-sm md:text-2xl">
                            {classroom.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-200" />
                            <span className="text-sm font-semibold text-slate-100">
                                {t("studentsCount", { count: classroom.students.length })}
                            </span>
                            <div
                                className={`ml-1 h-2 w-2 rounded-full ${
                                    isConnected ? "bg-green-400" : "bg-red-400"
                                }`}
                                title={isConnected ? "Connected" : "Disconnected"}
                            />
                        </div>
                    </div>
                </div>

                <div className="shrink-0 rounded-xl border border-white/12 bg-white/12 p-1 shadow-inner">
                    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-1">
                        <Button
                            type="button"
                            size="sm"
                            title={t("assignmentManageTooltip")}
                            className="h-10 min-h-[44px] min-w-[44px] rounded-lg bg-emerald-500 px-3 text-sm font-bold text-white shadow-md hover:bg-emerald-400 touch-manipulation lg:hidden"
                            onClick={onOpenAddAssignment}
                        >
                            <Plus className="h-5 w-5 sm:mr-1" />
                            <span className="hidden sm:inline">{t("assignmentShortLabel")}</span>
                        </Button>
                        <Button
                            size="sm"
                            className={`h-10 min-h-[44px] rounded-lg px-3 text-sm font-bold transition-all touch-manipulation sm:px-4 ${
                                viewMode === "grid"
                                    ? "bg-white text-indigo-700 shadow-md"
                                    : "text-slate-100 hover:bg-white/20"
                            }`}
                            onClick={() => onSelectViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4 md:mr-2" />
                            <span className="hidden sm:inline">{t("grid")}</span>
                        </Button>
                        <Button
                            size="sm"
                            className={`h-10 min-h-[44px] rounded-lg px-3 text-sm font-bold transition-all touch-manipulation sm:px-4 ${
                                viewMode === "table"
                                    ? "bg-white text-indigo-700 shadow-md"
                                    : "text-slate-100 hover:bg-white/20"
                            }`}
                            onClick={() => onSelectViewMode("table")}
                        >
                            <TableProperties className="h-4 w-4 md:mr-2" />
                            <span className="hidden sm:inline">{t("table")}</span>
                        </Button>
                        <Button
                            size="sm"
                            className={`h-10 min-h-[44px] rounded-lg px-3 text-sm font-bold transition-all touch-manipulation sm:px-4 ${
                                viewMode === "negamon"
                                    ? "bg-white text-violet-700 shadow-md"
                                    : "text-slate-100 hover:bg-white/20"
                            }`}
                            onClick={() => onSelectViewMode("negamon")}
                            title={t("negamonCardTitle")}
                        >
                            <Swords className="h-4 w-4 md:mr-2" />
                            <span className="hidden sm:inline">{t("negamonCardTitle")}</span>
                        </Button>
                        {viewMode === "table" && (
                            <Button
                                size="sm"
                                className="hidden h-10 min-h-[44px] rounded-lg bg-emerald-500 px-4 text-sm font-bold text-white shadow-md hover:bg-emerald-400 touch-manipulation lg:inline-flex"
                                onClick={onOpenAddAssignment}
                            >
                                <Plus className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">{t("assignmentDialogTitle")}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={onToggleMobileToolbar}
                className="flex w-full items-center justify-center gap-2 border-b border-slate-600/70 bg-slate-900/30 py-3 text-sm font-bold text-slate-100 active:bg-black/25 touch-manipulation lg:hidden"
                aria-expanded={mobileToolbarOpen}
            >
                {mobileToolbarOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 opacity-80" />
                ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                )}
                {t("toolbarMobileSummary")}
            </button>

            <div className={`w-full flex-wrap bg-black/5 ${mobileToolbarOpen ? "flex" : "max-lg:hidden"}`}>
                <div className="flex flex-grow flex-col justify-center border-r border-b border-slate-700/50 px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-300">
                        {t("toolbarSectionTools")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onOpenTimer}
                        >
                            <Timer className="mr-1.5 h-4 w-4 text-orange-300" />
                            {t("timer")}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onOpenRandomPicker}
                        >
                            <Shuffle className="mr-1.5 h-4 w-4 text-green-300" />
                            {t("random")}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onOpenGroupMaker}
                        >
                            <Users className="mr-1.5 h-4 w-4 text-blue-300" />
                            {t("groups")}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-grow flex-col justify-center border-r border-b border-slate-700/50 px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-300">
                        {t("toolbarSectionStudents")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="touch-manipulation [&_button]:min-h-[44px] lg:[&_button]:min-h-0">
                            <AddStudentDialog
                                classId={classroom.id}
                                theme={classroom.theme || ""}
                                onStudentAdded={(students) =>
                                    onStudentsAdded(students as ClassroomDashboardViewModel["students"])
                                }
                            />
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onOpenStudentManager}
                        >
                            <UserCog className="mr-1.5 h-4 w-4 text-indigo-300" />
                            {t("classroomManageStudents")}
                        </Button>
                        <div className="rounded-lg bg-white/15 shadow backdrop-blur-sm transition-colors hover:bg-white/25">
                            <StudentLoginsDialog
                                students={classroom.students}
                                classId={classroom.id}
                                theme={classroom.theme || ""}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-grow flex-col justify-center border-r border-b border-slate-700/50 px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-300">
                        {t("toolbarSectionGamification")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <ClassroomRankSettingsDialog classroom={classroom} onSaved={onRankSettingsSaved} />
                        <EventManagerButton classId={classroom.id} />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onOpenNegamonSettings}
                        >
                            <Swords className="mr-1.5 h-4 w-4 text-violet-300" />
                            {t("negamonCardTitle")}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-grow flex-col justify-center border-b border-slate-700/50 px-5 py-4 sm:flex-grow-0">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-300">
                        {t("toolbarSectionActions")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onEnterAttendanceMode}
                        >
                            <ClipboardCheck className="mr-1.5 h-4 w-4 text-emerald-300" />
                            {t("takeAttendance")}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className={`h-10 min-h-[44px] border-0 px-3 font-semibold shadow backdrop-blur-sm touch-manipulation lg:h-9 lg:min-h-0 ${
                                isSelectMultiple
                                    ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                    : "bg-white/15 text-white hover:bg-white/25"
                            }`}
                            onClick={onToggleSelectMultiple}
                        >
                            <CheckSquare className="mr-1.5 h-4 w-4" />
                            {t("selectMultipleStudents")}
                            {isSelectMultiple ? ` (${selectedStudentIds.length})` : ""}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 min-h-[44px] border-0 bg-white/15 px-3 font-semibold text-white shadow backdrop-blur-sm hover:bg-white/25 touch-manipulation lg:h-9 lg:min-h-0"
                            onClick={onOpenSettings}
                        >
                            <Settings className="mr-1.5 h-4 w-4 text-slate-300" />
                            {t("openSettings")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
