"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Accessibility, BookOpen, Swords } from "lucide-react";
import { PageBackLink } from "@/components/ui/page-back-link";
import { SyncAccountButton } from "./sync-account-button";
import type {
    ClassroomRecord,
    DashboardStudent,
    StudentDashboardMode,
    StudentDashboardTranslateFn,
} from "./StudentDashboardClient";

interface StudentDashboardHeaderProps {
    t: StudentDashboardTranslateFn;
    classroom: ClassroomRecord;
    student: DashboardStudent;
    code: string;
    currentUserId?: string;
    mode: StudentDashboardMode;
    showAccessibility: boolean;
    classIcon: string | null;
    isImageIcon: boolean;
    themeClass: string;
    themeStyle: React.CSSProperties;
    notificationTray: React.ReactNode;
    onToggleMode: () => void;
    onToggleAccessibility: () => void;
}

export function StudentDashboardHeader({
    t,
    classroom,
    student,
    code,
    currentUserId,
    mode,
    showAccessibility,
    classIcon,
    isImageIcon,
    themeClass,
    themeStyle,
    notificationTray,
    onToggleMode,
    onToggleAccessibility,
}: StudentDashboardHeaderProps) {
    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6"
            >
                <PageBackLink
                    href="/student/home"
                    label={t("studentDashBackHome")}
                    className="rounded-xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-md hover:bg-white/60 [&>span]:text-xs [&>span]:font-black"
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative mb-8 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] border border-white/40 p-8 text-white shadow-2xl sm:flex-row sm:items-center ${themeClass}`}
                style={themeStyle}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />

                <div className="relative z-10 flex items-center gap-6">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/20 text-4xl shadow-xl backdrop-blur-md"
                    >
                        {isImageIcon ? (
                            <Image
                                src={classIcon!}
                                alt="icon"
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span>{classIcon || "🏫"}</span>
                        )}
                    </motion.div>
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                {t("studentDashClassroomLabel")}
                            </p>
                            <div className="h-px w-8 bg-white/30" />
                        </div>
                        <h2 className="text-3xl font-black leading-tight text-white drop-shadow-sm">
                            {classroom.name}
                        </h2>
                        <p className="mt-1 text-sm font-medium italic text-white/70">
                            {t("studentDashTeacherPrefix")}{" "}
                            {classroom.teacher.name || t("studentDashTeacherNA")}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-white/10 bg-black/10 px-4 py-3 backdrop-blur-md">
                    {currentUserId && !student.userId && <SyncAccountButton loginCode={code} />}
                    {notificationTray}
                    <button
                        onClick={onToggleMode}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition-all ${
                            mode === "learn"
                                ? "border-white/30 bg-white/20 text-white hover:bg-white/30"
                                : "border-amber-300/50 bg-amber-400/30 text-amber-100 hover:bg-amber-400/40"
                        }`}
                        title={
                            mode === "learn"
                                ? t("studentDashSwitchToGameTitle")
                                : t("studentDashSwitchToLearnTitle")
                        }
                    >
                        {mode === "learn" ? (
                            <>
                                <BookOpen className="h-3.5 w-3.5" /> {t("studentDashModeLearnShort")}
                            </>
                        ) : (
                            <>
                                <Swords className="h-3.5 w-3.5" /> {t("studentDashModeGameShort")}
                            </>
                        )}
                    </button>
                    <button
                        onClick={onToggleAccessibility}
                        title={t("studentDashAccessibilityTitle")}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                            showAccessibility
                                ? "border-white/40 bg-white/25"
                                : "border-white/20 bg-white/10 hover:bg-white/20"
                        }`}
                    >
                        <Accessibility className="h-4 w-4 text-white" />
                    </button>
                    <div className="hidden h-10 w-px bg-white/10 sm:block" />
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                                {t("studentDashStatus")}
                            </p>
                            <div className="mt-0.5 flex items-center justify-end gap-1.5">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                <span className="text-xs font-black text-white">
                                    {t("studentDashOnline")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
