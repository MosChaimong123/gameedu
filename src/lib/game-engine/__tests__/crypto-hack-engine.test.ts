import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { CryptoHackEngine } from "../crypto-hack-engine";

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

describe("CryptoHackEngine", () => {
  let io: ReturnType<typeof createMockIo>;
  let engine: CryptoHackEngine;

  beforeEach(() => {
    io = createMockIo();
    engine = new CryptoHackEngine(
      "PIN1",
      "host-1",
      "set-1",
      { winCondition: "TIME", timeLimitMinutes: 10, allowLateJoin: true },
      questions,
      io as unknown as Server
    );
  });

  it("starts hacking when all connected players selected and a waiting player disconnects", () => {
    const alice = mockSocket("alice-socket");
    const bob = mockSocket("bob-socket");

    engine.addPlayer({ name: "Alice", avatar: "" }, alice);
    engine.addPlayer({ name: "Bob", avatar: "" }, bob);
    engine.startGame();

    engine.handleEvent("select-password", { password: "Bitcoin" }, alice);
    expect(io.roomEmit).not.toHaveBeenCalledWith("game-phase-change", { phase: "HACKING" });

    engine.handleDisconnect("bob-socket");

    expect(io.roomEmit).toHaveBeenCalledWith("game-phase-change", { phase: "HACKING" });
  });
});
