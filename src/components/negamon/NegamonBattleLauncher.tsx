"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords, BookOpen, Loader2, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

type QuestionSet = {
    id: string;
    title: string;
    createdAt: string;
    questions?: unknown[];
};

interface NegamonBattleLauncherProps {
    classroomId: string;
}

export function NegamonBattleLauncher({ classroomId }: NegamonBattleLauncherProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [sets, setSets] = useState<QuestionSet[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch("/api/sets")
            .then((r) => r.json())
            .then((data: QuestionSet[]) => setSets(Array.isArray(data) ? data : []))
            .catch(() => setSets([]))
            .finally(() => setLoading(false));
    }, [open]);

    const handleLaunch = () => {
        if (!selected) return;
        const params = new URLSearchParams({
            classroomId,
            mode: "NEGAMON_BATTLE",
        });
        router.push(`/host/${selected}?${params.toString()}`);
    };

    return (
        <>
            <Button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 font-bold shadow-md hover:from-violet-700 hover:to-indigo-700"
            >
                <Swords className="mr-2 h-4 w-4" />
                {t("negamonBattleLauncherCta")}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-black">
                            <Swords className="h-5 w-5 text-violet-600" />
                            {t("negamonBattleLauncherDialogTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            {t("negamonBattleLauncherDialogDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-10 text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : sets.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                                <BookOpen className="h-8 w-8 text-slate-200" />
                                <p className="font-bold">{t("negamonBattleLauncherNoSetsTitle")}</p>
                                <p className="text-xs">
                                    {t("negamonBattleLauncherNoSetsHint", { setsPage: t("mySets") })}
                                </p>
                            </div>
                        ) : (
                            sets.map((set) => (
                                <button
                                    key={set.id}
                                    onClick={() => setSelected(set.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                                        selected === set.id
                                            ? "border-violet-300 bg-violet-50 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={cn(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
                                                selected === set.id
                                                    ? "bg-violet-100 text-violet-700"
                                                    : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                                            <BookOpen className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className={cn("truncate text-sm font-black", selected === set.id ? "text-violet-900" : "text-slate-800")}>
                                                {set.title}
                                            </p>
                                            {Array.isArray(set.questions) && (
                                                <p className="text-xs font-medium text-slate-400">
                                                    {t("negamonBattleLauncherQuestionCount", {
                                                        count: set.questions.length,
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {selected === set.id && (
                                        <ChevronRight className="h-4 w-4 shrink-0 text-violet-500" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleLaunch}
                            disabled={!selected}
                            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-bold shadow-md disabled:opacity-50"
                        >
                            <Play className="mr-1.5 h-4 w-4" />
                            {t("negamonBattleLauncherOpenLobby")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
