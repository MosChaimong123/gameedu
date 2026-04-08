"use client";

import { useMemo } from "react";
import type { Student } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NegamonBattleLauncher } from "./NegamonBattleLauncher";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    getNegamonSettings,
    getNegamonTableProgress,
    getStudentMonsterState,
    type LevelConfigInput,
    type NegamonTableProgressHint,
} from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

function formatNegamonProgressHint(
    t: (key: string, params?: Record<string, string | number>) => string,
    hint: NegamonTableProgressHint
): string | null {
    if (!hint) return null;
    if (hint.kind === "threshold") {
        return t("negamonProgressThreshold", { rank: hint.rankName });
    }
    return t("negamonProgressPointsToNext", {
        need: String(hint.need),
        nextRank: hint.nextRankName,
    });
}

type NegamonClassroomOverviewProps = {
    classroomId: string;
    students: Student[];
    levelConfig: LevelConfigInput;
    gamifiedSettings: Prisma.JsonValue;
    onOpenSettings: () => void;
};

export function NegamonClassroomOverview({
    classroomId,
    students,
    levelConfig,
    gamifiedSettings,
    onOpenSettings,
}: NegamonClassroomOverviewProps) {
    const { t } = useLanguage();
    const negamon = useMemo(() => getNegamonSettings(gamifiedSettings), [gamifiedSettings]);

    const sorted = useMemo(
        () => [...students].sort((a, b) => a.name.localeCompare(b.name, "th")),
        [students]
    );

    if (!negamon?.enabled) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-gradient-to-b from-violet-50/80 to-white p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-inner">
                    <Swords className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-800">{t("negamonClassroomRpgTitle")}</h3>
                <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                    {t("negamonOverviewDisabledBody")}
                </p>
                <Button
                    type="button"
                    className="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 font-bold shadow-md"
                    onClick={onOpenSettings}
                >
                    {t("negamonOverviewOpenNegamonSettings")}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-black text-slate-800">{t("negamonOverviewTitle")}</h3>
                    <p className="text-xs font-medium text-slate-500">
                        {t("negamonOverviewSubtitle")}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        {t("negamonOverviewJoinHint")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <NegamonBattleLauncher classroomId={classroomId} />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-violet-200 font-bold text-violet-700 hover:bg-violet-50"
                        onClick={onOpenSettings}
                    >
                        {t("settings")}
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-100 bg-slate-50/90 hover:bg-slate-50/90">
                            <TableHead className="w-[min(28%,220px)] font-black text-slate-600">
                                {t("analyticsTableNameHeader")}
                            </TableHead>
                            <TableHead className="min-w-[200px] font-black text-slate-600">
                                {t("negamonTableMonsterColumn")}
                            </TableHead>
                            <TableHead className="w-[100px] font-black text-slate-600">{t("negamonTableRankColumn")}</TableHead>
                            <TableHead className="min-w-[140px] font-black text-slate-600">
                                {t("studentDashProgressLabel")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="py-12 text-center text-sm font-medium text-slate-400"
                                >
                                    {t("noStudentsYet")}
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {sorted.map((student) => {
                            const monster = getStudentMonsterState(
                                student.id,
                                student.behaviorPoints,
                                levelConfig,
                                negamon
                            );
                            const tier = getNegamonTableProgress(student.behaviorPoints, levelConfig);

                            return (
                                <TableRow key={student.id} className="border-slate-100">
                                    <TableCell className="align-middle font-bold text-slate-800">
                                        {student.name}
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        {monster ? (
                                            <div className="flex items-center gap-3">
                                                <NegamonFormIcon
                                                    icon={monster.form.icon}
                                                    label={monster.form.name}
                                                    className="h-9 w-9 shrink-0"
                                                    emojiClassName="text-2xl"
                                                    width={36}
                                                    height={36}
                                                    imageClassName="h-full w-full"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-slate-800">
                                                        {monster.form.name}
                                                        <span className="ml-1.5 text-xs font-bold text-violet-600">
                                                            {t("negamonMonsterLevelShort", {
                                                                level: monster.rankIndex + 1,
                                                            })}
                                                        </span>
                                                    </p>
                                                    <p className="truncate text-xs font-semibold text-slate-500">
                                                        {monster.speciesName}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-medium text-amber-700/90">
                                                {t("negamonNoMonsterAssignedRow")}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                                            {tier.rankName}
                                        </span>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-mono text-sm font-black text-slate-800">
                                                {tier.progressText}
                                            </span>
                                            {tier.progressHint ? (
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    {formatNegamonProgressHint(t, tier.progressHint)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
