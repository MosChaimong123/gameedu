"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { getThemeBgStyle, getThemeHorizontalBgClass } from "@/lib/classroom-utils";
import { CheckSquare, Users } from "lucide-react";
import type { SavedGroupSummary } from "./toolkit/group-maker";

type AttendanceBannerProps = {
    theme: string;
    hasChanges: boolean;
    loading: boolean;
    onCancel: () => void;
    onSave: () => void;
};

export function ClassroomAttendanceBanner({
    theme,
    hasChanges,
    loading,
    onCancel,
    onSave,
}: AttendanceBannerProps) {
    const { t } = useLanguage();

    return (
        <div
            className={cn(
                "mb-6 flex items-center justify-between rounded-xl p-4 text-white shadow-md animate-in slide-in-from-top-2",
                getThemeHorizontalBgClass(theme)
            )}
            style={getThemeBgStyle(theme)}
        >
            <div className="flex items-center gap-4">
                <div className="rounded-lg bg-white/18 p-2 ring-1 ring-white/20 backdrop-blur-sm">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold italic tracking-tight uppercase text-white">
                        {t("attendanceMode")}
                    </h2>
                    <p className="text-xs font-medium text-white/85">
                        {t("attendanceDesc")}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-white/15 bg-black/10 px-3 py-1 text-xs font-bold text-white/95 md:block">
                    {hasChanges ? t("unsavedChanges") : t("ready")}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="border border-white/15 bg-white/10 text-white hover:bg-white/20"
                    onClick={onCancel}
                >
                    {t("cancel")}
                </Button>
                <Button
                    size="sm"
                    className="border-0 bg-white/95 px-6 font-black text-slate-900 shadow-lg shadow-slate-950/15 hover:bg-white"
                    onClick={onSave}
                    disabled={loading}
                >
                    {t("saveAttendance")}
                </Button>
            </div>
        </div>
    );
}

type SelectionBannerProps = {
    theme: string;
    selectedStudentIds: string[];
    savedGroups: SavedGroupSummary[];
    groupFilter: string;
    loading: boolean;
    visibleStudentIds: string[];
    onSelectAll: () => void;
    onClearSelection: () => void;
    onGroupFilterChange: (value: string) => void;
    onCancel: () => void;
    onOpenFeedback: () => void;
};

export function ClassroomSelectionBanner({
    theme,
    selectedStudentIds,
    savedGroups,
    groupFilter,
    loading,
    visibleStudentIds,
    onSelectAll,
    onClearSelection,
    onGroupFilterChange,
    onCancel,
    onOpenFeedback,
}: SelectionBannerProps) {
    const { t } = useLanguage();
    void visibleStudentIds;

    return (
        <div
            className={cn(
                "mb-6 rounded-xl text-white shadow-md animate-in slide-in-from-top-2",
                getThemeHorizontalBgClass(theme)
            )}
            style={getThemeBgStyle(theme)}
        >
            <div className="flex items-center justify-between p-4 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <div className="shrink-0 rounded-lg bg-white/18 p-2 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
                        <CheckSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black italic tracking-tight uppercase text-white">
                            {t("selectionMode")}
                        </h2>
                        <p className="text-xs font-medium text-white/85">
                            {t("selectedCount", { count: selectedStudentIds.length })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/20"
                        onClick={onSelectAll}
                    >
                        {t("selectAllStudents")}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 border border-white/10 bg-black/10 px-3 text-xs font-bold text-white/90 hover:bg-black/15"
                        onClick={onClearSelection}
                    >
                        {t("clearSelection")}
                    </Button>

                    {savedGroups.length > 0 && (
                        <select
                            value={groupFilter}
                            onChange={(event) => onGroupFilterChange(event.target.value)}
                            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                        >
                            <option value="all" className="text-slate-800">{t("filterAllStudents")}</option>
                            {savedGroups.map((group) => (
                                <option key={group.id} value={group.id} className="text-slate-800">
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="h-6 w-px bg-white/20" />

                    <Button
                        variant="ghost"
                        size="sm"
                        className="border border-white/10 bg-black/10 text-white/90 hover:bg-black/15"
                        onClick={onCancel}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        size="sm"
                        className="border-0 bg-white/95 px-6 font-black text-slate-900 shadow-lg shadow-slate-950/15 hover:bg-white disabled:bg-white/60"
                        onClick={onOpenFeedback}
                        disabled={loading || selectedStudentIds.length === 0}
                    >
                        {t("giveFeedback")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
