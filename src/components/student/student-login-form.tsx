"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Backpack, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

export function StudentLoginForm({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { t } = useLanguage();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        
        setIsLoading(true);
        const cleanCode = code.trim().toUpperCase();
        router.push(`/student/${cleanCode}`);
    };

    return (
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl animate-in zoom-in-95 duration-500">
            <div className="absolute right-4 top-4 z-20">
                <LanguageToggle />
            </div>
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                    <Backpack className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t("studentPortalTitle")}</h1>
                    <p className="text-slate-500">{t("studentPortalSubtitle")}</p>
                </div>

                {isLoggedIn && (
                    <Link href="/student/home" 
                        className="w-full py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100 transition-all mb-2">
                        <LayoutDashboard className="w-5 h-5" />
                        {t("studentPortalGoDashboard")}
                    </Link>
                )}

                <form onSubmit={handleLogin} className="w-full space-y-4 pt-4">
                    <div className="space-y-2">
                        <Input 
                            type="text" 
                            placeholder={t("studentPortalCodePlaceholder")}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="text-center text-2xl tracking-widest font-mono py-6 uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-sm"
                            maxLength={6}
                            required
                        />
                    </div>
                    <Button 
                        type="submit" 
                        className="w-full py-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all rounded-2xl"
                        disabled={isLoading || code.length < 5}
                    >
                        {isLoading ? t("studentPortalSubmitLoading") : t("studentPortalSubmit")}
                    </Button>
                </form>

                <div className="pt-6 border-t border-slate-100 w-full text-xs text-slate-400">
                    <p>{t("studentPortalGmailHint")}</p>
                </div>
            </div>
        </div>
    );
}
