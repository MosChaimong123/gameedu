"use client";

import { TabsContent } from "@/components/ui/tabs";
import { DailyQuestPanel } from "@/components/student/DailyQuestPanel";
import { GameHistoryTab } from "@/components/student/GameHistoryTab";
import { BattleTab } from "@/components/negamon/BattleArena";
import type { BattleFinalRewardPayload } from "@/components/negamon/battle-tab.types";

export interface StudentGameTabsProps {
    classId: string;
    studentId: string;
    loginCode: string;
    questGold?: number;
    currentGold: number;
    inventory: string[];
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
    onBattleFinalized?: (final: BattleFinalRewardPayload) => void;
}

export function StudentGameTabs({
    classId,
    studentId,
    loginCode,
    questGold,
    currentGold,
    inventory,
    myMonster,
    history,
    onGoldChange,
    onBattleConsumablesSpent,
    onBattleFinalized,
}: StudentGameTabsProps) {
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
                    onGoldChange={onGoldChange}
                    onBattleConsumablesSpent={onBattleConsumablesSpent}
                    onBattleFinalized={onBattleFinalized}
                />
            </TabsContent>

            <TabsContent value="gamehistory" className="mt-0 border-none p-0 outline-hidden">
                <GameHistoryTab history={history} />
            </TabsContent>
        </>
    );
}
