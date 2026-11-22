"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban, FileSpreadsheet, Key, Printer, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { downloadStudentLoginCodesExcel } from "@/lib/export/student-login-codes-spreadsheet";
import { printStudentLoginCards } from "@/lib/print/print-student-login-cards";
import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import {
    STUDENT_LOGIN_CODE_LENGTH,
} from "@/lib/student-login-code";

type StudentLoginCard = {
    id: string
    name: string
    loginCode?: string | null
};

export function StudentLoginsDialog({ students, classId, theme }: { students: StudentLoginCard[]; classId: string; theme?: string }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [codeOverrides, setCodeOverrides] = useState<Record<string, string>>({});
    const [securityState, setSecurityState] = useState<Record<string, { linked: boolean; disabled: boolean; lastUsedAt: string | null }>>({});
    const visibleStudents = useMemo(() => students.map((student) => ({
        ...student,
        loginCode: codeOverrides[student.id] ?? student.loginCode,
    })), [codeOverrides, students]);
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""}/student`.replace(/^\/{2,}/, "/");

    const handlePrint = () => {
        const printRows = visibleStudents
            .map((student) => ({
                name: student.name.trim(),
                loginCode: (student.loginCode ?? "").trim(),
            }))
            .filter((row) => row.name.length > 0 && row.loginCode.length > 0);

        printStudentLoginCards({
            students: printRows,
            labels: {
                documentTitle: t("studentAccessCodes"),
                accessCode: t("accessCode"),
                joinLine: t("joinAt", { url: joinUrl || "/student" }),
            },
        });
    };

    const handleExportExcel = () => {
        const exportRows = visibleStudents
            .map((student) => ({
                name: student.name.trim(),
                loginCode: (student.loginCode ?? "").trim().toUpperCase(),
            }))
            .filter((row) => row.name.length > 0 && row.loginCode.length > 0);

        if (exportRows.length === 0) {
            return;
        }

        const dateStamp = new Date().toLocaleDateString("th-TH").replace(/\//g, "-");
        downloadStudentLoginCodesExcel(
            exportRows,
            {
                name: t("studentName"),
                code: t("accessCode"),
            },
            `student-login-codes-${dateStamp}`
        );
    };

    useEffect(() => {
        if (!open) return;
        void fetch(`/api/classrooms/${classId}/student-codes`, { cache: "no-store" })
            .then((response) => response.ok ? response.json() : [])
            .then((rows: Array<{ id: string; linked: boolean; disabled: boolean; lastUsedAt: string | null }>) => {
                setSecurityState(Object.fromEntries(rows.map((row) => [row.id, row])));
            });
    }, [classId, open]);

    const changeCodeState = async (studentId: string, action: "rotate" | "revoke") => {
        setBusyId(studentId);
        try {
            const response = await fetch(`/api/classrooms/${classId}/student-codes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, studentId }),
            });
            if (!response.ok) return;
            const payload = await response.json() as { rotatedCodes?: Array<{ studentId: string; loginCode: string }> };
            const rotated = payload.rotatedCodes?.find((item) => item.studentId === studentId);
            if (rotated) setCodeOverrides((current) => ({ ...current, [studentId]: rotated.loginCode }));
            setSecurityState((current) => ({
                ...current,
                [studentId]: {
                    linked: current[studentId]?.linked ?? false,
                    disabled: action === "revoke",
                    lastUsedAt: current[studentId]?.lastUsedAt ?? null,
                },
            }));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="hidden h-9 whitespace-nowrap rounded-full border-[#d9d9dd] bg-white font-medium text-[#212121] shadow-none transition-colors hover:border-[#1863dc] hover:text-[#1863dc] print:hidden md:flex" size="sm">
                    <Key className="h-4 w-4 md:mr-1.5" />
                    <span className="hidden xl:inline">{t("studentLogins")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[min(92dvh,40rem)] w-[min(96vw,42rem)] flex-col overflow-hidden rounded-2xl border-2 border-amber-200/60 bg-[#faf8f5] p-0 shadow-2xl sm:h-[90vh] sm:max-w-3xl sm:rounded-3xl">
                <DialogHeader className="shrink-0 border-b border-amber-100/90 bg-gradient-to-b from-white to-[#faf8f5] px-5 py-5 print:hidden sm:px-6">
                    <DialogTitle className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">{t("studentAccessCodes")}</DialogTitle>
                    <DialogDescription className="mt-2 text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                        {t("accessCodesDesc", {
                            newLen: STUDENT_LOGIN_CODE_LENGTH,
                        })}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">
                    <div className="mx-auto grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                        {visibleStudents.map((student) => (
                            <div
                                key={student.id}
                                className="student-logins-print-card group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-sm transition-colors hover:border-indigo-300 print:break-inside-avoid sm:p-5"
                            >
                                <div
                                    className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${getThemeBgClass(theme)} opacity-70 transition-opacity group-hover:opacity-100`}
                                    style={getThemeBgStyle(theme)}
                                />

                                <h3 className="mb-3 w-full px-1 text-base font-bold text-slate-900 sm:text-lg">{student.name}</h3>

                                <div className="mb-3 flex min-h-[5.5rem] w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50/90 px-2 py-3 sm:min-h-[6rem]">
                                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-indigo-700 sm:text-xs">{t("accessCode")}</span>
                                    <span className="w-full break-all select-all text-center font-mono text-base font-black leading-tight tracking-[0.08em] text-indigo-900 sm:text-lg sm:tracking-[0.1em]">
                                        {student.loginCode?.toUpperCase() || "N/A"}
                                    </span>
                                </div>

                                <div className="w-full rounded-xl border border-slate-200/80 bg-amber-50/40 px-3 py-2.5 text-left text-[11px] font-medium leading-snug text-slate-800 sm:text-xs">
                                    <p className="break-all">{t("joinAt", { url: joinUrl || "/student" })}</p>
                                    <p className="mt-1 text-slate-500">
                                        {securityState[student.id]?.linked ? t("studentCodeLinked") : t("studentCodeNotLinked")} · {securityState[student.id]?.lastUsedAt ? new Date(securityState[student.id].lastUsedAt!).toLocaleString() : t("studentCodeNeverUsed")}
                                    </p>
                                </div>
                                <div className="mt-3 flex w-full gap-2 print:hidden">
                                    <Button type="button" size="sm" variant="outline" className="flex-1 gap-1" disabled={busyId === student.id} onClick={() => void changeCodeState(student.id, "rotate")}>
                                        <RotateCcw className="h-3.5 w-3.5" /> {t("studentCodeRotate")}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="flex-1 gap-1 text-red-700" disabled={busyId === student.id || securityState[student.id]?.disabled} onClick={() => void changeCodeState(student.id, "revoke")}>
                                        <Ban className="h-3.5 w-3.5" /> {t("studentCodeRevoke")}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-white p-4 print:hidden md:p-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={visibleStudents.length === 0}
                        className="gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        {t("studentLoginsExportExcel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handlePrint}
                        className={`flex items-center gap-2 rounded-xl border-0 bg-gradient-to-r ${theme || "from-indigo-600 to-indigo-600"} font-semibold text-white shadow-sm transition-opacity hover:opacity-90`}
                    >
                        <Printer className="h-4 w-4" />
                        {t("printCards")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
