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

  it("starts hacking as soon as two connected players have selected passwords", () => {
    const alice = mockSocket("alice-socket");
    const bob = mockSocket("bob-socket");
    const charlie = mockSocket("charlie-socket");

    engine.addPlayer({ name: "Alice", avatar: "" }, alice);
    engine.addPlayer({ name: "Bob", avatar: "" }, bob);
    engine.addPlayer({ name: "Charlie", avatar: "" }, charlie);
    engine.startGame();

    engine.handleEvent("select-password", { password: "Bitcoin" }, alice);
    expect(io.roomEmit).not.toHaveBeenCalledWith("game-phase-change", { phase: "HACKING" });

    engine.handleEvent("select-password", { password: "Ethereum" }, bob);

    expect(io.roomEmit).toHaveBeenCalledWith("game-phase-change", { phase: "HACKING" });
  });

  it("allows a late joiner to choose a remaining password after hacking has started", () => {
    const alice = mockSocket("alice-socket");
    const bob = mockSocket("bob-socket");
    const charlie = mockSocket("charlie-socket");

    engine.addPlayer({ name: "Alice", avatar: "" }, alice);
    engine.addPlayer({ name: "Bob", avatar: "" }, bob);
    engine.startGame();

    engine.handleEvent("select-password", { password: "Bitcoin" }, alice);
    engine.handleEvent("select-password", { password: "Ethereum" }, bob);

    engine.addPlayer({ name: "Charlie", avatar: "" }, charlie);
    expect(charlie.emit).toHaveBeenCalledWith(
      "choose-password",
      expect.objectContaining({ options: expect.any(Array) })
    );

    engine.handleEvent("select-password", { password: "Dogecoin" }, charlie);

    const player = engine.players.find((entry) => entry.name === "Charlie");
    expect(player?.password).toBe("Dogecoin");
  });
});
