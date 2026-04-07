"use client";

import { useState } from "react";

export function useClassroomDashboardUiState(args?: {
    initialViewMode?: "grid" | "table" | "negamon";
}) {
    const initialViewMode = args?.initialViewMode ?? "grid";
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table" | "negamon">(initialViewMode);
    const [showTimer, setShowTimer] = useState(false);
    const [showRandomPicker, setShowRandomPicker] = useState(false);
    const [showGroupMaker, setShowGroupMaker] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showAddAssignment, setShowAddAssignment] = useState(false);
    const [showStudentManager, setShowStudentManager] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
    const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
    const [showNegamonSettings, setShowNegamonSettings] = useState(false);

    return {
        menuOpen,
        setMenuOpen,
        loading,
        setLoading,
        viewMode,
        setViewMode,
        showTimer,
        setShowTimer,
        showRandomPicker,
        setShowRandomPicker,
        showGroupMaker,
        setShowGroupMaker,
        showResetConfirm,
        setShowResetConfirm,
        showAddAssignment,
        setShowAddAssignment,
        showStudentManager,
        setShowStudentManager,
        showSettings,
        setShowSettings,
        historyStudentId,
        setHistoryStudentId,
        mobileToolbarOpen,
        setMobileToolbarOpen,
        showNegamonSettings,
        setShowNegamonSettings,
    };
}
