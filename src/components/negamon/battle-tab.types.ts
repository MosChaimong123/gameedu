export interface Opponent {
    id: string;
    name: string;
    formIcon: string;
    formName: string;
    rankIndex: number;
}

export interface BattleSessionEntry {
    id: string;
    challengerId: string;
    defenderId: string;
    winnerId: string;
    goldReward: number;
    createdAt: string;
}

export interface BattleTabProps {
    classId: string;
    myStudentId: string;
    myStudentCode: string;
    myMonster: { formIcon: string; formName: string; rankIndex: number } | null;
    currentGold?: number;
    onGoldChange?: (newGold: number) => void;
}
