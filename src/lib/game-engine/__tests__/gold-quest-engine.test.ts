import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server } from "socket.io";
import type { Socket } from "socket.io";
import { GoldQuestEngine } from "../gold-quest-engine";
import {
  SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS,
  SOCKET_ERROR_GOLD_QUEST_CHEST_NOT_READY,
  SOCKET_ERROR_GOLD_QUEST_CHEST_PENDING,
  SOCKET_ERROR_PLAY_NOT_IN_GAME,
} from "@/lib/socket-error-messages";

const questions = [
  {
    id: "q1",
    question: "2+2?",
    options: ["3", "4"],
    correctAnswer: 1,
  },
];

function createMockIo() {
  const roomEmit = vi.fn();
  return {
    to: vi.fn(() => ({ emit: roomEmit })),
    roomEmit,
  };
}

function mockSocket(id: string): Socket {
  return { id, emit: vi.fn() } as unknown as Socket;
}

describe("GoldQuestEngine", () => {
  let io: ReturnType<typeof createMockIo>;
  let engine: GoldQuestEngine;

  beforeEach(() => {
    io = createMockIo();
    engine = new GoldQuestEngine("PIN1", "host-1", "set-1", { winCondition: "TIME", timeLimitMinutes: 10, goldGoal: 999, allowLateJoin: true }, questions, io as unknown as Server);
    engine.setIO(io as unknown as Server);
    engine.status = "PLAYING";
  });

  it("sets pendingChest on correct submit-answer and clears on open-chest", () => {
    const sock = mockSocket("sock-a");
    engine.addPlayer(
      {
        id: sock.id,
        name: "P1",
        isConnected: true,
        score: 0,
        gold: 0,
        multiplier: 1,
        streak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      sock
    );

    engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, sock);
    expect(engine.getPlayer("sock-a")?.pendingChest).toBe(true);

    engine.handleEvent("open-chest", { chestIndex: 0 }, sock);
    expect(engine.getPlayer("sock-a")?.pendingChest).toBe(false);
    expect(sock.emit).toHaveBeenCalledWith(
      "chest-result",
      expect.objectContaining({ reward: expect.any(Object), newTotal: expect.any(Number) })
    );
  });

  it("rejects open-chest when pendingChest is false", () => {
    const sock = mockSocket("sock-b");
    engine.addPlayer(
      {
        id: sock.id,
        name: "P2",
        isConnected: true,
        score: 0,
        gold: 0,
        multiplier: 1,
        streak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      sock
    );

    engine.handleEvent("open-chest", { chestIndex: 1 }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_GOLD_QUEST_CHEST_NOT_READY });
  });

  it("rejects request-question while pendingChest", () => {
    const sock = mockSocket("sock-c");
    engine.addPlayer(
      {
        id: sock.id,
        name: "P3",
        isConnected: true,
        score: 0,
        gold: 0,
        multiplier: 1,
        streak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      sock
    );

    engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, sock);
    engine.handleEvent("request-question", {}, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_GOLD_QUEST_CHEST_PENDING });
  });

  it("emits error for unknown question on submit-answer", () => {
    const sock = mockSocket("sock-d");
    engine.addPlayer(
      {
        id: sock.id,
        name: "P4",
        isConnected: true,
        score: 0,
        gold: 0,
        multiplier: 1,
        streak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      sock
    );

    engine.handleEvent("submit-answer", { questionId: "nope", answerIndex: 0 }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS });
  });

  it("emits error when submit-answer from unknown socket", () => {
    const sock = mockSocket("ghost");
    engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_PLAY_NOT_IN_GAME });
  });

  it("open-chest reward is deterministic for same pin, player, and chestIndex", () => {
    const sock = mockSocket("sock-e");
    engine.addPlayer(
      {
        id: sock.id,
        name: "P5",
        isConnected: true,
        score: 0,
        gold: 0,
        multiplier: 1,
        streak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      sock
    );
    engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, sock);
    engine.handleEvent("open-chest", { chestIndex: 1 }, sock);
    const first = (sock.emit as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "chest-result")?.[1]?.reward;

    engine.handleEvent("submit-answer", { questionId: "q1", answerIndex: 1 }, sock);
    engine.handleEvent("open-chest", { chestIndex: 1 }, sock);
    const second = (sock.emit as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === "chest-result").pop()?.[1]
      ?.reward;

    expect(first).toEqual(second);
  });
});
