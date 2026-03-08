"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Key, Printer } from "lucide-react";
import { Student } from "@prisma/client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";

export function StudentLoginsDialog({ students, classId, theme }: { students: any[], classId: string, theme?: string }) {
    const { t } = useLanguage();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (!isMounted) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="secondary" className="h-9 bg-transparent text-white border-0 font-medium shadow-none transition-colors whitespace-nowrap hidden print:hidden md:flex" size="sm">
                    <Key className="w-4 h-4 md:mr-1.5" />
                    <span className="hidden xl:inline">{t("studentLogins")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="p-6 pb-4 border-b border-slate-100 print:hidden shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl md:text-2xl">{t("studentAccessCodes")}</DialogTitle>
                        <DialogDescription className="text-sm md:text-base mt-1.5 leading-relaxed">
                            {t("accessCodesDesc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                
                {/* Printable Area */}
                <div className="overflow-y-auto p-4 md:p-6 flex-1 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 print-area w-full mx-auto">
                        {students.map((student) => (
                            <div key={student.id} className="border border-slate-200 p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center bg-white shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                                {/* Decorative top border */}
                                <div 
                                    className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${getThemeBgClass(theme)} opacity-70 group-hover:opacity-100 transition-opacity`}
                                    style={getThemeBgStyle(theme)}
                                ></div>
                                
                                <h3 className="font-bold text-lg md:text-xl text-slate-800 mb-4 w-full px-2 truncate">{student.name}</h3>
                                
                                <div className="bg-slate-50 py-4 px-2 shrink-0 rounded-xl w-full mb-4 border border-slate-100 flex flex-col items-center justify-center min-h-[100px] overflow-hidden">
                                    <span className={`text-[11px] md:text-xs font-bold block mb-2 uppercase whitespace-nowrap bg-gradient-to-r ${theme || 'from-indigo-500 to-purple-500'} bg-clip-text text-transparent`}>{t("accessCode")}</span>
                                    <span className={`font-mono text-2xl tracking-[0.2em] font-black select-all w-full text-center bg-gradient-to-r ${theme || 'from-indigo-500 to-purple-500'} bg-clip-text text-transparent`}>
                                        {student.loginCode || 'N/A'}
                                    </span>
                                </div>
                                
                                <div className="text-[10px] md:text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-full border border-slate-100 w-full truncate font-medium">
                                    {t("joinAt", { url: "http://localhost:3000/student" })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-100 bg-white print:hidden shrink-0 flex justify-end">
                    <Button onClick={handlePrint} className={`flex items-center gap-2 bg-gradient-to-r ${theme || 'from-indigo-600 to-indigo-600'} text-white shadow-sm rounded-xl hover:opacity-90 transition-opacity border-0`}>
                        <Printer className="w-4 h-4" />
                        {t("printCards")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
