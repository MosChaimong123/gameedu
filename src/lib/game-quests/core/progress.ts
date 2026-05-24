import {
    buildQuestStatuses,
    getClaimedToday,
    type QuestStatus,
} from "@/lib/daily-quests";
import {
    buildChallengeQuestStatuses,
    buildWeeklyQuestStatuses,
    getChallengeClaimedAll,
    getWeeklyClaimedThisWeek,
    type ChallengeCheckInput,
    type WeeklyCheckInput,
} from "@/lib/quest-system";
import {
    createQuestChainProgressSnapshot,
    getChainClaimedAll,
    type GameQuestChainDefinition,
} from "./quest-chains";

export type QuestProgressSnapshotInput = {
    daily: {
        streak: number;
        lastCheckIn: string | Date | null;
        hasSubmitToday: boolean;
        claimedRaw: unknown;
    };
    weekly: WeeklyCheckInput & {
        claimedRaw: unknown;
    };
    challenge: ChallengeCheckInput & {
        claimedRaw: unknown;
    };
    chain?: {
        dailyClaimedIds: string[];
        weeklyClaimedIds: string[];
        challengeClaimedIds: string[];
        chainClaimedRaw: unknown;
        streak: number;
        submissionsThisWeek: number;
        totalSubmissions: number;
        inventoryCount: number;
        chains?: GameQuestChainDefinition[];
    };
};

export type QuestProgressSnapshot = {
    daily: QuestStatus[];
    weekly: QuestStatus[];
    challenge: QuestStatus[];
    chain: QuestStatus[];
};

export function createQuestProgressSnapshot(input: QuestProgressSnapshotInput): QuestProgressSnapshot {
    return {
        daily: buildQuestStatuses(
            {
                streak: input.daily.streak,
                lastCheckIn: input.daily.lastCheckIn,
                hasSubmitToday: input.daily.hasSubmitToday,
            },
            getClaimedToday(input.daily.claimedRaw)
        ),
        weekly: buildWeeklyQuestStatuses(
            {
                streak: input.weekly.streak,
                submissionsThisWeek: input.weekly.submissionsThisWeek,
                allDailyClaimedToday: input.weekly.allDailyClaimedToday,
            },
            getWeeklyClaimedThisWeek(input.weekly.claimedRaw)
        ),
        challenge: buildChallengeQuestStatuses(
            {
                streak: input.challenge.streak,
                totalSubmissions: input.challenge.totalSubmissions,
                hasItem: input.challenge.hasItem,
            },
            getChallengeClaimedAll(input.challenge.claimedRaw)
        ),
        chain: input.chain
            ? createQuestChainProgressSnapshot({
                  chains: input.chain.chains,
                  progress: {
                      dailyClaimedIds: input.chain.dailyClaimedIds,
                      weeklyClaimedIds: input.chain.weeklyClaimedIds,
                      challengeClaimedIds: input.chain.challengeClaimedIds,
                      chainClaimedIds: getChainClaimedAll(input.chain.chainClaimedRaw),
                      streak: input.chain.streak,
                      submissionsThisWeek: input.chain.submissionsThisWeek,
                      totalSubmissions: input.chain.totalSubmissions,
                      inventoryCount: input.chain.inventoryCount,
                  },
              })
            : [],
    };
}
