"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { joinClassroom } from "@/app/student/student-actions";
import {
    LEGACY_STUDENT_LOGIN_CODE_LENGTH,
    MAX_STUDENT_LOGIN_CODE_LENGTH,
    STUDENT_LOGIN_CODE_LENGTH,
} from "@/lib/student-login-code";
import { getLocalizedAppErrorMessage } from "@/lib/ui-error-messages";
import { useLanguage } from "@/components/providers/language-provider";
import type { AppErrorCode } from "@/lib/api-error";

const JOIN_CLASS_ERROR_KEYS: Partial<Record<AppErrorCode, string>> = {
    AUTH_REQUIRED: "joinClassErrAuthRequired",
    INVALID_LOGIN_CODE: "joinClassErrInvalidCode",
};

export function JoinClassDialog() {
    const { t } = useLanguage();
    const [code, setCode] = useState("");
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || code.length < 5) return;

        setIsLoading(true);
        try {
            const result = await joinClassroom(code);
            if ("error" in result) {
                toast({
                    title: t("joinClassToastFailTitle"),
                    description: getLocalizedAppErrorMessage(
                        result.error.code,
                        result.error.message,
                        t,
                        JOIN_CLASS_ERROR_KEYS
                    ),
                    variant: "destructive",
                });
            } else {
                toast({
                    title: t("joinClassToastSuccessTitle"),
                    description: t("joinClassToastSuccessDesc", { className: result.className }),
                });
                setOpen(false);
                setCode("");
            }
        } catch {
            toast({
                title: t("joinClassToastGenericTitle"),
                description: t("joinClassToastGenericDesc"),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-md transition-all hover:bg-indigo-700">
                    <Plus className="h-4 w-4" />
                    {t("joinClassTrigger")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <form onSubmit={handleJoin}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800">{t("joinClassTitle")}</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {t("joinClassDescription", {
                                legacyLen: LEGACY_STUDENT_LOGIN_CODE_LENGTH,
                                newLen: STUDENT_LOGIN_CODE_LENGTH,
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Input
                            type="text"
                            placeholder={t("joinClassPlaceholder")}
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="h-12 py-8 text-center font-mono text-xl uppercase tracking-[0.2em] sm:text-2xl"
                            maxLength={MAX_STUDENT_LOGIN_CODE_LENGTH}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="h-12 w-full rounded-2xl bg-indigo-600 text-lg font-black shadow-lg transition-all hover:bg-indigo-700 active:scale-95"
                            disabled={isLoading || code.length < 5}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {t("joinClassSubmitLoading")}
                                </>
                            ) : (
                                t("joinClassSubmit")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
