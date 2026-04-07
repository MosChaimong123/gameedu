"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Key, Printer } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";

type StudentLoginCard = {
    id: string
    name: string
    loginCode?: string | null
};

export function StudentLoginsDialog({ students, classId, theme }: { students: StudentLoginCard[]; classId: string; theme?: string }) {
    void classId;
    const { t } = useLanguage();
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""}/student`.replace(/^\/{2,}/, "/");

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="secondary" className="hidden h-9 whitespace-nowrap border-0 bg-transparent font-medium text-white shadow-none transition-colors print:hidden md:flex" size="sm">
                    <Key className="h-4 w-4 md:mr-1.5" />
                    <span className="hidden xl:inline">{t("studentLogins")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[min(92dvh,40rem)] w-[min(96vw,42rem)] flex-col overflow-hidden rounded-2xl border-2 border-amber-200/60 bg-[#faf8f5] p-0 shadow-2xl sm:h-[90vh] sm:max-w-3xl sm:rounded-3xl">
                <DialogHeader className="shrink-0 border-b border-amber-100/90 bg-gradient-to-b from-white to-[#faf8f5] px-5 py-5 print:hidden sm:px-6">
                    <DialogTitle className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">{t("studentAccessCodes")}</DialogTitle>
                    <DialogDescription className="mt-2 text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                        {t("accessCodesDesc")}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">
                    <div className="print-area mx-auto grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                        {students.map((student) => (
                            <div key={student.id} className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-sm transition-colors hover:border-indigo-300 print:break-inside-avoid sm:p-5">
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
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex shrink-0 justify-end border-t border-slate-100 bg-white p-4 print:hidden md:p-6">
                    <Button onClick={handlePrint} className={`flex items-center gap-2 rounded-xl border-0 bg-gradient-to-r ${theme || "from-indigo-600 to-indigo-600"} text-white shadow-sm transition-opacity hover:opacity-90`}>
                        <Printer className="h-4 w-4" />
                        {t("printCards")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
