"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { CheckCircle2, Copy, ExternalLink, Link2, Loader2, MessageCircleMore, RefreshCw } from "lucide-react";

type StudentLineLinkSnapshot =
    | {
          linked: true;
          studentName: string;
          classroomName: string;
          linkedAt: string;
          openChatUrl: string | null;
      }
    | {
          linked: false;
          studentName: string;
          classroomName: string;
          code: string;
          commandText: string;
          expiresAt: string;
          openChatUrl: string | null;
      };

interface StudentLineLinkDialogProps {
    loginCode: string;
    className?: string;
}

const POLL_INTERVAL_MS = 8000;

export function StudentLineLinkDialog({
    loginCode,
    className,
}: StudentLineLinkDialogProps) {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [snapshot, setSnapshot] = useState<StudentLineLinkSnapshot | null>(null);

    const fetchSnapshot = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/student/${encodeURIComponent(loginCode)}/line-link`, {
                method: "GET",
                cache: "no-store",
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error?.message ?? "request_failed");
            }
            setSnapshot(payload as StudentLineLinkSnapshot);
        } catch {
            toast({
                title: t("studentLineLinkLoadFailTitle"),
                description: t("studentLineLinkLoadFailDesc"),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [loginCode, t, toast]);

    useEffect(() => {
        if (!open) return;
        void fetchSnapshot();
    }, [fetchSnapshot, open]);

    useEffect(() => {
        if (!open || !snapshot || snapshot.linked) return;
        const interval = window.setInterval(() => {
            void fetchSnapshot();
        }, POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [fetchSnapshot, open, snapshot]);

    const expiresAtLabel = useMemo(() => {
        if (!snapshot || snapshot.linked) return null;
        const date = new Date(snapshot.expiresAt);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Bangkok",
        });
    }, [language, snapshot]);

    const linkedAtLabel = useMemo(() => {
        if (!snapshot || !snapshot.linked) return null;
        const date = new Date(snapshot.linkedAt);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleString(language === "th" ? "th-TH" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Bangkok",
        });
    }, [language, snapshot]);

    const handleCopy = async (text: string, titleKey: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: t(titleKey),
                description: text,
            });
        } catch {
            toast({
                title: t("studentLineLinkCopyFailTitle"),
                description: t("studentLineLinkCopyFailDesc"),
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={`group flex h-10 cursor-pointer items-center gap-2.5 rounded-2xl border-white/30 bg-white/10 px-5 text-xs font-black text-white shadow-lg shadow-black/10 backdrop-blur-md transition-all active:scale-95 hover:bg-white/20 ${className}`}
                >
                    <MessageCircleMore className="h-4 w-4 transition-transform group-hover:-rotate-6" />
                    {t("studentLineLinkButton")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-3xl border-0 bg-white p-0 shadow-2xl">
                <DialogHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                            <Link2 className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">
                                {t("studentLineLinkDialogTitle")}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-white/80">
                                {t("studentLineLinkDialogDesc")}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-5 px-6 py-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                {snapshot?.classroomName ?? t("studentLineLinkStatusLoading")}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-600">
                                {snapshot?.studentName ?? t("studentLineLinkStatusLoading")}
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className={
                                snapshot?.linked
                                    ? "border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 px-3 py-1 text-amber-700"
                            }
                        >
                            {snapshot?.linked
                                ? t("studentLineLinkStatusConnected")
                                : t("studentLineLinkStatusPending")}
                        </Badge>
                    </div>

                    {isLoading && !snapshot ? (
                        <div className="flex min-h-44 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("studentLineLinkLoading")}
                        </div>
                    ) : snapshot?.linked ? (
                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                                <div className="space-y-2">
                                    <p className="font-black text-emerald-900">
                                        {t("studentLineLinkConnectedTitle")}
                                    </p>
                                    <p className="text-sm leading-relaxed text-emerald-800">
                                        {t("studentLineLinkConnectedBody")}
                                    </p>
                                    {linkedAtLabel ? (
                                        <p className="text-xs font-semibold text-emerald-700">
                                            {t("studentLineLinkConnectedAt", { date: linkedAtLabel })}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : snapshot ? (
                        <>
                            <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                                    {t("studentLineLinkCodeLabel")}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <code className="rounded-2xl bg-white px-4 py-3 text-3xl font-black tracking-[0.35em] text-slate-900 shadow-sm">
                                        {snapshot.code}
                                    </code>
                                    <Button
                                        variant="outline"
                                        onClick={() => void handleCopy(snapshot.commandText, "studentLineLinkCopyCommandSuccess")}
                                        className="rounded-2xl"
                                    >
                                        <Copy className="h-4 w-4" />
                                        {t("studentLineLinkCopyCommand")}
                                    </Button>
                                </div>
                                {expiresAtLabel ? (
                                    <p className="mt-3 text-xs font-semibold text-cyan-700">
                                        {t("studentLineLinkExpiresAt", { time: expiresAtLabel })}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-sm font-black text-slate-900">
                                    {t("studentLineLinkStepsTitle")}
                                </p>
                                <ol className="space-y-2 text-sm leading-relaxed text-slate-600">
                                    <li>1. {t("studentLineLinkStep1")}</li>
                                    <li>2. {t("studentLineLinkStep2")}</li>
                                    <li>3. {t("studentLineLinkStep3")}</li>
                                </ol>
                                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                                    {snapshot.commandText}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {snapshot.openChatUrl ? (
                                    <Button
                                        asChild
                                        className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                        <a
                                            href={snapshot.openChatUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            {t("studentLineLinkOpenChat")}
                                        </a>
                                    </Button>
                                ) : null}
                                <Button
                                    variant="outline"
                                    onClick={() => void handleCopy(snapshot.code, "studentLineLinkCopyCodeSuccess")}
                                    className="rounded-2xl"
                                >
                                    <Copy className="h-4 w-4" />
                                    {t("studentLineLinkCopyCode")}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => void fetchSnapshot()}
                                    className="rounded-2xl"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    {t("studentLineLinkRefresh")}
                                </Button>
                            </div>
                        </>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
