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
};

export type QuestProgressSnapshot = {
    daily: QuestStatus[];
    weekly: QuestStatus[];
    challenge: QuestStatus[];
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
    };
}
