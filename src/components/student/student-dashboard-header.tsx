"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { PageBackLink } from "@/components/ui/page-back-link";
import { LanguageToggle } from "@/components/language-toggle";
import { SyncAccountButton } from "./sync-account-button";
import { StudentLineLinkDialog } from "./student-line-link-dialog";
import type {
    ClassroomRecord,
    DashboardStudent,
    StudentDashboardTranslateFn,
} from "@/lib/services/student-dashboard/student-dashboard.types";

interface StudentDashboardHeaderProps {
    t: StudentDashboardTranslateFn;
    classroom: ClassroomRecord;
    student: DashboardStudent;
    code: string;
    currentUserId?: string;
    classIcon: string | null;
    isImageIcon: boolean;
    themeClass: string;
    themeStyle: React.CSSProperties;
    notificationTray: React.ReactNode;
}

export function StudentDashboardHeader({
    t,
    classroom,
    student,
    code,
    currentUserId,
    classIcon,
    isImageIcon,
    themeClass,
    themeStyle,
    notificationTray,
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
                                alt={t("classroomIconAlt")}
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
                    {currentUserId && student.userId === currentUserId ? (
                        <StudentLineLinkDialog loginCode={code} />
                    ) : null}
                    {notificationTray}
                    <LanguageToggle className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
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
