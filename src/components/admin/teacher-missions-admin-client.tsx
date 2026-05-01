"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import {
    createTeacherMission,
    deleteTeacherMission,
    updateTeacherMission,
} from "@/app/admin/admin-actions";
import type { PlanId } from "@/constants/pricing";
import { Loader2, Trash2 } from "lucide-react";

export type TeacherMissionAdminRow = {
    id: string;
    title: string;
    reward: number;
    completedDemo: boolean;
    mascot: string | null;
    sortOrder: number;
    isActive: boolean;
    audiencePlans: string[];
};

const PLANS: PlanId[] = ["FREE", "PLUS", "PRO"];

export function TeacherMissionsAdminClient({ initialItems }: { initialItems: TeacherMissionAdminRow[] }) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);

    const [title, setTitle] = React.useState("");
    const [reward, setReward] = React.useState(0);
    const [completedDemo, setCompletedDemo] = React.useState(false);
    const [mascot, setMascot] = React.useState("");
    const [sortOrder, setSortOrder] = React.useState(0);
    const [isActive, setIsActive] = React.useState(true);
    const [audience, setAudience] = React.useState<Record<PlanId, boolean>>({
        FREE: true,
        PLUS: false,
        PRO: false,
    });

    const audienceList = React.useCallback((): PlanId[] => PLANS.filter((p) => audience[p]), [audience]);

    const resetForm = () => {
        setEditingId(null);
        setTitle("");
        setReward(0);
        setCompletedDemo(false);
        setMascot("");
        setSortOrder(0);
        setIsActive(true);
        setAudience({ FREE: true, PLUS: false, PRO: false });
    };

    const loadRow = (row: TeacherMissionAdminRow) => {
        setEditingId(row.id);
        setTitle(row.title);
        setReward(row.reward);
        setCompletedDemo(row.completedDemo);
        setMascot(row.mascot ?? "");
        setSortOrder(row.sortOrder);
        setIsActive(row.isActive);
        setAudience({
            FREE: row.audiencePlans.includes("FREE"),
            PLUS: row.audiencePlans.includes("PLUS"),
            PRO: row.audiencePlans.includes("PRO"),
        });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const plans = audienceList();
        if (plans.length === 0) {
            toast({
                title: t("adminAudiencePlansRequiredTitle"),
                description: t("adminAudiencePlansRequiredDesc"),
                variant: "destructive",
            });
            return;
        }
        setPending(true);
        const payload = {
            title,
            reward,
            completedDemo,
            mascot: mascot || null,
            sortOrder,
            isActive,
            audiencePlans: plans,
            ...(editingId ? { id: editingId } : {}),
        };
        const result = editingId ? await updateTeacherMission(payload) : await createTeacherMission(payload);
        setPending(false);
        if (result.success) {
            toast({ title: t("adminSaveSuccessTitle") });
            resetForm();
            router.refresh();
            return;
        }
        toast({ title: t("adminSaveFailTitle"), description: result.error, variant: "destructive" });
    };

    const onDelete = async (id: string) => {
        setPending(true);
        const result = await deleteTeacherMission(id);
        setPending(false);
        if (result.success) {
            toast({ title: t("adminDeleteSuccessTitle") });
            if (editingId === id) resetForm();
            router.refresh();
            return;
        }
        toast({ title: t("adminDeleteFailTitle"), variant: "destructive" });
    };

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-black text-slate-800">
                    {editingId ? t("adminTeacherMissionEditTitle") : t("adminTeacherMissionCreateTitle")}
                </h2>
                <div className="space-y-2">
                    <Label>{t("adminMissionTitleLabel")}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>{t("adminMissionRewardLabel")}</Label>
                        <Input
                            type="number"
                            value={reward}
                            onChange={(e) => setReward(Number(e.target.value))}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("adminSortOrderLabel")}</Label>
                        <Input
                            type="number"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(Number(e.target.value))}
                            className="rounded-xl"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>{t("adminNewsMascotLabel")}</Label>
                    <Input value={mascot} onChange={(e) => setMascot(e.target.value)} className="rounded-xl" />
                </div>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        {t("adminIsActiveLabel")}
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={completedDemo}
                            onChange={(e) => setCompletedDemo(e.target.checked)}
                        />
                        {t("adminMissionCompletedDemoLabel")}
                    </label>
                </div>
                <div className="space-y-2">
                    <Label>{t("adminAudiencePlansLabel")}</Label>
                    <div className="flex flex-wrap gap-4">
                        {PLANS.map((p) => (
                            <label key={p} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300"
                                    checked={audience[p]}
                                    onChange={(e) => setAudience((a) => ({ ...a, [p]: e.target.checked }))}
                                />
                                {p}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="submit" disabled={pending} className="rounded-xl font-bold">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminSaveButton")}
                    </Button>
                    {editingId && (
                        <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl font-bold">
                            {t("adminCancelEditButton")}
                        </Button>
                    )}
                </div>
            </form>

            <div className="space-y-3">
                <h2 className="text-lg font-black text-slate-800">{t("adminTeacherMissionListTitle")}</h2>
                <ul className="space-y-2">
                    {initialItems.map((row) => (
                        <li
                            key={row.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap gap-1 text-[10px] font-black uppercase text-slate-400">
                                    {row.audiencePlans.map((p) => (
                                        <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                                <p className="font-bold text-slate-900">{row.title}</p>
                                <p className="text-xs text-amber-600 font-black">
                                    +{row.reward} {t("tokenLabel")}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => loadRow(row)}>
                                    {t("adminEditButton")}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600"
                                    disabled={pending}
                                    onClick={() => void onDelete(row.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
