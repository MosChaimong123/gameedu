import { describe, expect, it } from "vitest";
import {
  findCurrentPlayer,
  getPlayerLiveRank,
  sortPlayersForStandings,
  type PlayerState,
} from "@/app/play/game/play-game-types";

const players: PlayerState[] = [
  {
    id: "socket-b",
    name: "B",
    gold: 20,
    multiplier: 1,
    streak: 0,
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    pendingChest: false,
  },
  {
    id: "socket-a",
    name: "A",
    gold: 20,
    multiplier: 1,
    streak: 0,
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    pendingChest: false,
  },
  {
    id: "socket-c",
    name: "C",
    gold: 5,
    multiplier: 1,
    streak: 0,
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    pendingChest: false,
  },
];

describe("play game ranking helpers", () => {
  it("keeps tied live ranks stable by counting only higher scores", () => {
    expect(getPlayerLiveRank(players, players[0], "GOLD_QUEST")).toBe(1);
    expect(getPlayerLiveRank(players, players[1], "GOLD_QUEST")).toBe(1);
    expect(getPlayerLiveRank(players, players[2], "GOLD_QUEST")).toBe(3);
  });

  it("sorts tied standings by name for deterministic display", () => {
    expect(sortPlayersForStandings(players, "GOLD_QUEST").map((p) => p.name)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("finds the current player by socket id before falling back to name", () => {
    expect(findCurrentPlayer(players, "socket-c", "A")?.name).toBe("C");
    expect(findCurrentPlayer(players, undefined, "A")?.name).toBe("A");
  });
});
