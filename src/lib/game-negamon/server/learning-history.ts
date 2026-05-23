import type { GameHistoryEvent } from "@/lib/game-core";
import type { NegamonLearningRewardSource } from "@/lib/game-negamon/core/learning-rewards";

export function createPointHistoryRowsFromLearningRewardEvents(input: {
    studentId: string;
    source: NegamonLearningRewardSource;
    sourceId: string;
    behaviorPointDelta: number;
    historyEvents: GameHistoryEvent[];
}) {
    return input.historyEvents.map((event) => {
        if (event.kind === "reward_granted") {
            return {
                studentId: input.studentId,
                value: input.behaviorPointDelta,
                reason:
                    input.source === "attendance"
                        ? `negamon_attendance_reward:${input.sourceId}`
                        : `negamon_quest_reward:${input.sourceId}`,
            };
        }
        if (event.kind === "level_up") {
            const level = event.reward?.levelUps[0]?.toLevel;
            return {
                studentId: input.studentId,
                value: 0,
                reason: level ? `negamon_level_up:${level}` : "negamon_level_up",
            };
        }
        if (event.kind === "skill_unlocked") {
            const skillId = event.reward?.unlockedSkillIds[0];
            return {
                studentId: input.studentId,
                value: 0,
                reason: skillId ? `negamon_skill_unlocked:${skillId}` : "negamon_skill_unlocked",
            };
        }
        return {
            studentId: input.studentId,
            value: 0,
            reason: `negamon_${event.kind}`,
        };
    });
}
