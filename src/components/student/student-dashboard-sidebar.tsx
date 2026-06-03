"use client";

import { Coins, ShieldAlert } from "lucide-react";
import { StudentAvatarSection } from "./student-avatar-section";
import type {
    DashboardStudent,
    StudentDashboardMode,
} from "@/lib/services/student-dashboard/student-dashboard.types";
import type { RankEntry, LevelConfigInput } from "@/lib/classroom-utils";
import type { BattleFinalRewardPayload } from "@/components/negamon/battle-tab.types";

interface GameProfileMonster {
    icon: string;
    color: string;
    formName: string;
}

export interface StudentBattleRewardNotice {
    tone: "blocked" | "success";
    title: string;
    detail: string;
}

export function createStudentBattleRewardNotice(
    final: BattleFinalRewardPayload | null | undefined
): StudentBattleRewardNotice | null {
    if (!final) return null;
    if (final.rewardBlockedReason === "pair_cooldown") {
        return {
            tone: "blocked",
            title: "ทองรอบนี้ยังไม่เข้า",
            detail: `ชนะแล้ว แต่คู่นี้ยังอยู่ในช่วงพักรางวัล จึงได้ทอง ${final.goldReward}G จากที่ควรได้ ${final.requestedGoldReward}G`,
        };
    }
    if (final.rewardBlockedReason === "daily_cap") {
        return {
            tone: "blocked",
            title: "ทองวันนี้ถึงโควตาแล้ว",
            detail: `ชนะแล้ว แต่ระบบหยุดจ่ายทองเพิ่มชั่วคราว รอบนี้ได้ ${final.goldReward}G จากที่ควรได้ ${final.requestedGoldReward}G`,
        };
    }
    if (final.goldReward > 0) {
        return {
            tone: "success",
            title: `ได้รับทอง ${final.goldReward}G`,
            detail: "รางวัลจากการต่อสู้ถูกบันทึกเข้ากระเป๋าเรียบร้อยแล้ว",
        };
    }
    return null;
}

interface StudentDashboardSidebarProps {
    student: DashboardStudent;
    classId: string;
    academicTotal: number;
    totalGoldRate: number;
    rankEntry: RankEntry;
    totalPositive: number;
    totalNegative: number;
    themeClass: string;
    themeStyle: React.CSSProperties;
    levelConfigResolved: LevelConfigInput;
    mode: StudentDashboardMode;
    questGold?: number;
    onGoldChange?: (value: number) => void;
    /** โหมดเกม: แสดงมอน Negamon ในการ์ดโปรไฟล์แทนอวาตาร์ */
    gameProfileMonster?: GameProfileMonster | null;
    battleRewardNotice?: StudentBattleRewardNotice | null;
    onOpenBattleHistory?: () => void;
    onReturnToBattle?: () => void;
}

export function StudentDashboardSidebar({
    student,
    classId,
    academicTotal,
    totalGoldRate,
    rankEntry,
    totalPositive,
    totalNegative,
    themeClass,
    themeStyle,
    levelConfigResolved,
    mode,
    questGold,
    onGoldChange,
    gameProfileMonster,
    battleRewardNotice,
    onOpenBattleHistory,
    onReturnToBattle,
}: StudentDashboardSidebarProps) {
    return (
        <div className="md:col-span-1 space-y-4">
            <StudentAvatarSection
                studentId={student.id}
                classId={classId}
                loginCode={student.loginCode}
                initialAvatar={student.avatar || student.id}
                name={student.name}
                nickname={student.nickname}
                points={academicTotal}
                behaviorPoints={student.behaviorPoints}
                initialGold={student.gold}
                goldRate={totalGoldRate}
                rankEntry={rankEntry}
                totalPositive={totalPositive}
                totalNegative={totalNegative}
                themeClass={themeClass}
                themeStyle={themeStyle}
                levelConfig={levelConfigResolved}
                initialInventory={student.inventory}
                initialEquippedFrame={student.equippedFrame}
                initialStreak={student.streak}
                lastCheckIn={student.lastCheckIn}
                mode={mode}
                externalGold={questGold}
                onGoldChange={onGoldChange}
                gameProfileMonster={gameProfileMonster}
            />
            {battleRewardNotice ? (
                <div
                    className={[
                        "rounded-2xl border px-4 py-3 shadow-sm",
                        battleRewardNotice.tone === "blocked"
                            ? "border-amber-200 bg-amber-50 text-amber-950"
                            : "border-emerald-200 bg-emerald-50 text-emerald-950",
                    ].join(" ")}
                >
                    <div className="flex items-start gap-2">
                        {battleRewardNotice.tone === "blocked" ? (
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        ) : (
                            <Coins className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-black">{battleRewardNotice.title}</p>
                            <p className="mt-1 text-xs font-medium leading-5 opacity-80">
                                {battleRewardNotice.detail}
                            </p>
                            {onOpenBattleHistory || onReturnToBattle ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {onOpenBattleHistory ? (
                                        <button
                                            type="button"
                                            onClick={onOpenBattleHistory}
                                            className={[
                                                "inline-flex items-center rounded-xl px-3 py-2 text-xs font-black transition",
                                                battleRewardNotice.tone === "blocked"
                                                    ? "bg-amber-200/70 text-amber-950 hover:bg-amber-200"
                                                    : "bg-emerald-200/70 text-emerald-950 hover:bg-emerald-200",
                                            ].join(" ")}
                                        >
                                            ดูประวัติการต่อสู้
                                        </button>
                                    ) : null}
                                    {onReturnToBattle ? (
                                        <button
                                            type="button"
                                            onClick={onReturnToBattle}
                                            className="inline-flex items-center rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-white"
                                        >
                                            กลับไปหน้าต่อสู้
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
