"use client";

import { TabsContent } from "@/components/ui/tabs";
import { DailyQuestPanel } from "@/components/student/DailyQuestPanel";
import { GameHistoryTab } from "@/components/student/GameHistoryTab";
import { BattleTab } from "@/components/negamon/BattleArena";

interface StudentDashboardGameTabsProps {
    classId: string;
    studentId: string;
    loginCode: string;
    questGold?: number;
    currentGold: number;
    inventory: string[];
    battleLoadout: string[];
    myMonster:
        | {
              formIcon: string;
              formName: string;
              rankIndex: number;
          }
        | null;
    history: Array<{ timestamp: string; value: number; reason: string }>;
    onGoldChange: (value: number | undefined) => void;
    onBattleConsumablesSpent?: (consumedItemIds: string[]) => void;
    onBattleLoadoutSaved?: (battleLoadout: string[]) => void;
}

export function StudentDashboardGameTabs({
    classId,
    studentId,
    loginCode,
    questGold,
    currentGold,
    inventory,
    battleLoadout,
    myMonster,
    history,
    onGoldChange,
    onBattleConsumablesSpent,
    onBattleLoadoutSaved,
}: StudentDashboardGameTabsProps) {
    return (
        <>
            <TabsContent value="quests" className="mt-0 border-none p-0 outline-hidden">
                <DailyQuestPanel loginCode={loginCode} onGoldChange={onGoldChange} />
            </TabsContent>

            <TabsContent value="battle" className="mt-0 border-none p-0 outline-hidden">
                <BattleTab
                    classId={classId}
                    myStudentId={studentId}
                    myStudentCode={loginCode}
                    myMonster={myMonster}
                    currentGold={questGold ?? currentGold}
                    inventory={inventory}
                    battleLoadout={battleLoadout}
                    onGoldChange={onGoldChange}
                    onBattleConsumablesSpent={onBattleConsumablesSpent}
                    onBattleLoadoutSaved={onBattleLoadoutSaved}
                />
            </TabsContent>

            <TabsContent value="gamehistory" className="mt-0 border-none p-0 outline-hidden">
                <GameHistoryTab history={history} />
            </TabsContent>
        </>
    );
}
