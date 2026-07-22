import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { ArQuestEngine } from "../ar-quest-engine";
import { SOCKET_ERROR_PLAY_NOT_IN_GAME } from "@/lib/socket-error-messages";

const questions = [
  {
    id: "q1",
    question: "Which shape has 4 sides?",
    options: ["Triangle", "Square"],
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

describe("ArQuestEngine", () => {
  let io: ReturnType<typeof createMockIo>;
  let engine: ArQuestEngine;

  beforeEach(() => {
    io = createMockIo();
    engine = new ArQuestEngine(
      "PIN1",
      "host-1",
      "set-1",
      { winCondition: "TIME", timeLimitMinutes: 7, goldGoal: 999, allowLateJoin: true },
      questions,
      io as unknown as Server
    );
    engine.setIO(io as unknown as Server);
    engine.status = "PLAYING";
  });

  it("serves a question and scores a correct AR answer", () => {
    const sock = mockSocket("sock-a");
    engine.addPlayer(
      {
        id: sock.id,
        name: "P1",
        isConnected: true,
        score: 0,
        arScore: 0,
        streak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      sock
    );

    engine.handleEvent("request-question", { pin: "PIN1" }, sock);
    expect(sock.emit).toHaveBeenCalledWith("next-question", expect.objectContaining({ id: "q1" }));

    engine.handleEvent("submit-ar-answer", { questionId: "q1", answerIndex: 1 }, sock);

    expect(engine.getPlayer(sock.id)?.arScore).toBe(100);
    expect(engine.getPlayer(sock.id)?.streak).toBe(1);
    expect(sock.emit).toHaveBeenCalledWith(
      "ar-answer-result",
      expect.objectContaining({ correct: true, score: 100, streak: 1 })
    );
  });

  it("rejects request-question from a socket outside the game", () => {
    const sock = mockSocket("ghost");
    engine.handleEvent("request-question", { pin: "PIN1" }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_PLAY_NOT_IN_GAME });
  });
});
