"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";
import { joinClassroom } from "@/app/student/student-actions";
import { useToast } from "@/components/ui/use-toast";
import { getLocalizedAppErrorMessage } from "@/lib/ui-error-messages";
import { useLanguage } from "@/components/providers/language-provider";
import type { AppErrorCode } from "@/lib/api-error";

interface SyncAccountButtonProps {
    loginCode: string;
    className?: string;
}

const SYNC_ACCOUNT_ERROR_KEYS: Partial<Record<AppErrorCode, string>> = {
    AUTH_REQUIRED: "syncAccountErrAuthRequired",
    INVALID_LOGIN_CODE: "syncAccountErrInvalidCode",
};

export function SyncAccountButton({ loginCode, className }: SyncAccountButtonProps) {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSync = async () => {
        setIsLoading(true);
        try {
            const result = await joinClassroom(loginCode);
            if ("error" in result) {
                toast({
                    title: t("syncAccountToastFailTitle"),
                    description: getLocalizedAppErrorMessage(
                        result.error.code,
                        result.error.message,
                        t,
                        SYNC_ACCOUNT_ERROR_KEYS
                    ),
                    variant: "destructive",
                });
            } else {
                toast({
                    title: t("syncAccountToastSuccessTitle"),
                    description: t("syncAccountToastSuccessDesc", { className: result.className }),
                });
            }
        } catch {
            toast({
                title: t("syncAccountToastGenericTitle"),
                description: t("syncAccountToastGenericDesc"),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleSync}
            disabled={isLoading}
            variant="outline"
            className={`group flex h-10 cursor-pointer items-center gap-2.5 rounded-2xl border-white/30 bg-white/10 px-5 text-xs font-black text-white shadow-lg shadow-black/10 backdrop-blur-md transition-all active:scale-95 hover:bg-white/20 ${className}`}
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4 transition-transform group-hover:rotate-12" />}
            {isLoading ? t("syncAccountButtonLinking") : t("syncAccountButtonLabel")}
        </Button>
    );
}
