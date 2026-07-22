import { describe, expect, it, vi } from "vitest";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import {
  shouldStartArQuestClassroomRewardSync,
  triggerArQuestClassroomRewardSync,
} from "../ar-quest-reward-sync-runner";

function makeEndedArQuestGame(): AbstractGameEngine {
  return {
    gameMode: "AR_QUEST",
    status: "ENDED",
    pin: "654321",
    hostId: "teacher-1",
    setId: "set-1",
    settings: { arQuestRewardClassroomId: "class-1" },
    arQuestClassroomRewardsSynced: false,
    arQuestClassroomRewardsSyncInProgress: false,
    arQuestClassroomRewardsLastAttemptAt: 0,
    arQuestClassroomRewardsLastError: null,
  } as unknown as AbstractGameEngine;
}

describe("AR Quest classroom reward sync runner", () => {
  it("starts only for ended AR Quest games with a reward classroom", () => {
    const game = makeEndedArQuestGame();
    expect(shouldStartArQuestClassroomRewardSync(game)).toBe(true);

    game.status = "PLAYING";
    expect(shouldStartArQuestClassroomRewardSync(game)).toBe(false);
  });

  it("guards concurrent reward sync attempts", () => {
    const game = makeEndedArQuestGame();
    const syncFn = vi.fn(async () => undefined);

    expect(triggerArQuestClassroomRewardSync(game, { now: 1_000, syncFn })).toBe(true);
    expect(triggerArQuestClassroomRewardSync(game, { now: 2_000, syncFn })).toBe(false);
    expect(syncFn).toHaveBeenCalledTimes(1);
  });
});
