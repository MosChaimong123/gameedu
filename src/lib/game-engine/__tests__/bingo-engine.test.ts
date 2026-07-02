import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server, Socket } from "socket.io";
import type { GameQuestion } from "../abstract-game";
import type { BingoPlayer } from "../../types/game";
import { BingoEngine } from "../bingo-engine";
import {
  SOCKET_ERROR_BINGO_ALREADY_ANSWERED,
  SOCKET_ERROR_BINGO_INVALID_CELL,
  SOCKET_ERROR_BINGO_NO_ACTIVE_QUESTION,
  SOCKET_ERROR_BINGO_NOT_ENOUGH_ANSWERS,
  SOCKET_ERROR_TOO_MANY_SUBMISSIONS,
} from "@/lib/socket-error-messages";

type Emit = { target: string; event: string; payload: unknown };

function createMockIo() {
  const emits: Emit[] = [];
  const io = {
    to: (target: string) => ({
      emit: (event: string, payload: unknown) => {
        emits.push({ target, event, payload });
      },
    }),
    emits,
  };
  return io;
}

function mockSocket(id: string): Socket {
  return { id, emit: vi.fn() } as unknown as Socket;
}

/** 9 คำถาม เฉลยไม่ซ้ำกัน A0..A8 — พอสำหรับการ์ด 3x3 */
const nineQuestions: GameQuestion[] = Array.from({ length: 9 }, (_, i) => ({
  id: `q${i}`,
  question: `Q${i}`,
  options: [`A${i}`, "wrong"],
  correctAnswer: 0,
}));

function makePlayer(id: string, name: string): BingoPlayer {
  return {
    id,
    name,
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    card: [],
    marked: [],
    completedLines: 0,
    answeredCurrentIndex: -1,
    answeredQuestionId: null,
  };
}

function lastEmit(io: ReturnType<typeof createMockIo>, event: string): Emit | undefined {
  return [...io.emits].reverse().find((e) => e.event === event);
}

function makeEngine(io: ReturnType<typeof createMockIo>, settings = {}) {
  const engine = new BingoEngine(
    "PIN1",
    "host-1",
    "set-1",
    { winCondition: "TIME", timeLimitMinutes: 10, goldGoal: 0, cardSize: 3, ...settings },
    nineQuestions,
    io as unknown as Server
  );
  engine.registerHostConnection("host-sock", "tok");
  return engine;
}

function makeEngineWithQuestions(
  io: ReturnType<typeof createMockIo>,
  questions: GameQuestion[],
  settings = {}
) {
  const engine = new BingoEngine(
    "PIN1",
    "host-1",
    "set-1",
    { winCondition: "TIME", timeLimitMinutes: 10, goldGoal: 0, cardSize: 3, ...settings },
    questions,
    io as unknown as Server
  );
  engine.registerHostConnection("host-sock", "tok");
  return engine;
}

/** มาร์คช่องบนการ์ดผู้เล่นที่ตรงกับเฉลยของข้อที่ครูเพิ่งถาม */
function markCurrentQuestion(
  engine: BingoEngine,
  io: ReturnType<typeof createMockIo>,
  socket: Socket
) {
  const question = lastEmit(io, "bingo-question")!.payload as { id: string };
  const q = nineQuestions.find((x) => x.id === question.id)!;
  const answer = q.options[q.correctAnswer];
  const player = engine.getPlayer(socket.id)!;
  const cellIndex = player.card.findIndex((c) => c === answer);
  engine.handleEvent("mark-cell", { cellIndex }, socket);
  return cellIndex;
}

describe("BingoEngine", () => {
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    io = createMockIo();
  });

  it("startGame deals a card to each player and starts the game", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);

    engine.startGame();

    expect(engine.status).toBe("PLAYING");
    const player = engine.getPlayer("s1")!;
    expect(player.card).toHaveLength(9);
    expect(new Set(player.card).size).toBe(9);
    const cardEmit = lastEmit(io, "bingo-card");
    expect(cardEmit?.target).toBe("s1");
  });

  it("blocks start and warns host when answers are too few for the card size", () => {
    const engine = makeEngine(io, { cardSize: 5 }); // needs 24 distinct, only 9 available
    engine.addPlayer(makePlayer("s1", "P1"), mockSocket("s1"));

    engine.startGame();

    expect(engine.status).toBe("LOBBY");
    expect(io.emits).toContainEqual({
      target: "host-sock",
      event: "error",
      payload: { message: SOCKET_ERROR_BINGO_NOT_ENOUGH_ANSWERS },
    });
  });

  it("reveals questions to the room without leaking the answer, but tells the host", () => {
    const engine = makeEngine(io);
    engine.addPlayer(makePlayer("s1", "P1"), mockSocket("s1"));
    engine.startGame();

    engine.revealNextQuestion();

    const questionEmit = lastEmit(io, "bingo-question")!;
    expect(questionEmit.target).toBe("PIN1");
    expect(questionEmit.payload).not.toHaveProperty("answer");

    const reveal = lastEmit(io, "bingo-answer-reveal")!;
    expect(reveal.target).toBe("host-sock");
    expect(reveal.payload).toHaveProperty("answer");
  });

  it("asks only one question per answer when duplicate correct answers exist", () => {
    const duplicateAnswerQuestions: GameQuestion[] = [
      ...nineQuestions,
      {
        id: "q-duplicate-a0",
        question: "Duplicate A0",
        options: ["A0", "wrong"],
        correctAnswer: 0,
      },
    ];
    const engine = makeEngineWithQuestions(io, duplicateAnswerQuestions);
    engine.addPlayer(makePlayer("s1", "P1"), mockSocket("s1"));
    engine.startGame();

    const seenIds = new Set<string>();
    for (let i = 0; i < 9; i++) {
      engine.revealNextQuestion();
      const payload = lastEmit(io, "bingo-question")!.payload as { id: string; total: number };
      expect(payload.total).toBe(9);
      seenIds.add(payload.id);
    }

    expect(seenIds.size).toBe(9);
    expect(seenIds.has("q0") || seenIds.has("q-duplicate-a0")).toBe(true);
    expect(seenIds.has("q0") && seenIds.has("q-duplicate-a0")).toBe(false);
  });

  it("resends the current question and answer to the host after reconnect", () => {
    const engine = makeEngine(io);
    engine.addPlayer(makePlayer("s1", "P1"), mockSocket("s1"));
    engine.startGame();
    engine.revealNextQuestion();

    const originalQuestion = lastEmit(io, "bingo-question")!.payload as {
      id: string;
      question: string;
      index: number;
      total: number;
    };

    engine.registerHostConnection("host-reconnected", "tok");
    io.emits.length = 0;
    engine.syncHostState();

    expect(io.emits).toContainEqual({
      target: "host-reconnected",
      event: "bingo-question",
      payload: originalQuestion,
    });
    expect(lastEmit(io, "bingo-answer-reveal")).toMatchObject({
      target: "host-reconnected",
      payload: { id: originalQuestion.id },
    });
  });

  it("marks the correct cell and rejects a second tap on the same question", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();
    engine.revealNextQuestion();

    const cellIndex = markCurrentQuestion(engine, io, sock);
    const player = engine.getPlayer("s1")!;
    expect(player.marked[cellIndex]).toBe(true);
    expect(player.correctAnswers).toBe(1);
    expect(sock.emit).toHaveBeenCalledWith(
      "mark-result",
      expect.objectContaining({ cellIndex, correct: true })
    );

    engine.handleEvent("mark-cell", { cellIndex: 0 }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_BINGO_ALREADY_ANSWERED });
  });

  it("counts a wrong tap as incorrect without marking", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();
    engine.revealNextQuestion();

    const question = lastEmit(io, "bingo-question")!.payload as { id: string };
    const q = nineQuestions.find((x) => x.id === question.id)!;
    const player = engine.getPlayer("s1")!;
    const wrongCell = player.card.findIndex((c) => c !== q.options[q.correctAnswer]);

    engine.handleEvent("mark-cell", { cellIndex: wrongCell }, sock);
    expect(player.marked[wrongCell]).toBe(false);
    expect(player.incorrectAnswers).toBe(1);
    expect(player.correctAnswers).toBe(0);
  });

  it("rate limits rapid Bingo mark-cell attempts without adding incorrect answers", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();
    engine.revealNextQuestion();

    const question = lastEmit(io, "bingo-question")!.payload as { id: string };
    const q = nineQuestions.find((x) => x.id === question.id)!;
    const player = engine.getPlayer("s1")!;
    const wrongCells = player.card
      .map((label, index) => ({ label, index }))
      .filter((cell) => cell.label !== q.options[q.correctAnswer]);
    expect(wrongCells.length).toBeGreaterThan(1);

    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    engine.handleEvent("mark-cell", { cellIndex: wrongCells[0].index }, sock);
    expect(player.incorrectAnswers).toBe(1);

    now.mockReturnValue(1100);
    engine.handleEvent("mark-cell", { cellIndex: wrongCells[1].index }, sock);

    expect(player.incorrectAnswers).toBe(1);
    expect(sock.emit).toHaveBeenCalledWith("error", {
      message: SOCKET_ERROR_TOO_MANY_SUBMISSIONS,
    });
    now.mockRestore();
  });

  it("lets a player retry after a wrong tap until they answer correctly", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();
    engine.revealNextQuestion();

    const question = lastEmit(io, "bingo-question")!.payload as { id: string };
    const q = nineQuestions.find((x) => x.id === question.id)!;
    const answer = q.options[q.correctAnswer];
    const player = engine.getPlayer("s1")!;
    const wrongCell = player.card.findIndex((c) => c !== answer);
    const rightCell = player.card.findIndex((c) => c === answer);
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);

    // แตะผิดก่อน — ต้องไม่ล็อก (ยังแตะต่อได้)
    engine.handleEvent("mark-cell", { cellIndex: wrongCell }, sock);
    expect(player.marked[wrongCell]).toBe(false);
    expect(player.incorrectAnswers).toBe(1);

    // แตะใหม่ให้ถูก — มาร์คได้ ไม่โดน ALREADY_ANSWERED
    now.mockReturnValue(1500);
    engine.handleEvent("mark-cell", { cellIndex: rightCell }, sock);
    expect(player.marked[rightCell]).toBe(true);
    expect(player.correctAnswers).toBe(1);

    // หลังตอบถูกแล้ว แตะอีก — คราวนี้ต้องโดนล็อก
    engine.handleEvent("mark-cell", { cellIndex: rightCell }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", {
      message: SOCKET_ERROR_BINGO_ALREADY_ANSWERED,
    });
    now.mockRestore();
  });

  it("does not lock a player when TIME mode recycles index 0 for a different question", () => {
    const engine = makeEngine(io, { winCondition: "TIME" });
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();

    (engine as unknown as { questionOrder: string[]; currentIndex: number }).questionOrder = ["q0"];
    (engine as unknown as { questionOrder: string[]; currentIndex: number }).currentIndex = -1;
    engine.revealNextQuestion();
    markCurrentQuestion(engine, io, sock);

    const player = engine.getPlayer("s1")!;
    expect(player.answeredCurrentIndex).toBe(0);
    expect(player.answeredQuestionId).toBe("q0");

    (engine as unknown as { questionOrder: string[]; currentIndex: number }).questionOrder = ["q1"];
    (engine as unknown as { questionOrder: string[]; currentIndex: number }).currentIndex = -1;
    engine.revealNextQuestion();
    const q1Cell = player.card.findIndex((c) => c === "A1");
    expect(q1Cell).toBeGreaterThanOrEqual(0);

    engine.handleEvent("mark-cell", { cellIndex: q1Cell }, sock);

    expect(player.marked[q1Cell]).toBe(true);
    expect(player.answeredQuestionId).toBe("q1");
    expect(sock.emit).not.toHaveBeenCalledWith("error", {
      message: SOCKET_ERROR_BINGO_ALREADY_ANSWERED,
    });
  });

  it("rejects mark-cell before any question is revealed", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();

    engine.handleEvent("mark-cell", { cellIndex: 0 }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_BINGO_NO_ACTIVE_QUESTION });
  });

  it("rejects an out-of-range cell index", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();
    engine.revealNextQuestion();

    engine.handleEvent("mark-cell", { cellIndex: 99 }, sock);
    expect(sock.emit).toHaveBeenCalledWith("error", { message: SOCKET_ERROR_BINGO_INVALID_CELL });
  });

  it("ends the game when a player reaches the line target (LINES win condition)", () => {
    const engine = makeEngine(io, { winCondition: "LINES", bingoLinesToWin: 3 });
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();

    // ตอบทุกข้อให้ถูก (9 ข้อ = ทั้งการ์ด) → ครบทุกแถว
    for (let i = 0; i < nineQuestions.length; i++) {
      engine.revealNextQuestion();
      markCurrentQuestion(engine, io, sock);
    }

    const player = engine.getPlayer("s1")!;
    expect(player.completedLines).toBe(8);

    engine.tick();
    expect(engine.status).toBe("ENDED");
    expect(player.score).toBe(8);
  });

  it("respects the configured Bingo line target instead of hardcoding by card size", () => {
    const engine = makeEngine(io, { winCondition: "LINES", bingoLinesToWin: 2 });
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();

    const player = engine.getPlayer("s1")!;
    player.marked = [
      true, true, true,
      false, false, false,
      false, false, false,
    ];
    player.completedLines = 1;

    engine.tick();
    expect(engine.status).toBe("PLAYING");

    player.marked = [
      true, true, true,
      true, false, false,
      true, false, false,
    ];
    player.completedLines = 2;

    engine.tick();
    expect(engine.status).toBe("ENDED");
  });

  it("serialize/restore round-trips bingo state", () => {
    const engine = makeEngine(io);
    const sock = mockSocket("s1");
    engine.addPlayer(makePlayer("s1", "P1"), sock);
    engine.startGame();
    engine.revealNextQuestion();

    const snapshot = engine.serialize();
    expect(snapshot.gameMode).toBe("BINGO");

    const restored = makeEngine(createMockIo());
    restored.restore(snapshot as Parameters<BingoEngine["restore"]>[0]);
    restored.status = "PLAYING";

    // หลัง restore ยังถามข้อต่อไปได้ (questionOrder/currentIndex กลับมา)
    restored.revealNextQuestion();
    expect(restored.status).toBe("PLAYING");
  });

  it("recovers card/marks and keeps playing after a simulated server restart", () => {
    const engineA = makeEngine(io);
    const sock = mockSocket("s1");
    engineA.addPlayer(makePlayer("s1", "P1"), sock);
    engineA.startGame();
    engineA.revealNextQuestion();
    markCurrentQuestion(engineA, io, sock);

    const before = engineA.getPlayer("s1")!;
    const markedBefore = before.marked.filter(Boolean).length;
    expect(markedBefore).toBeGreaterThan(0);

    // "Restart": new engine instance restores from the persisted snapshot
    const snapshot = engineA.serialize();
    const io2 = createMockIo();
    const engineB = makeEngine(io2);
    engineB.restore(snapshot as Parameters<BingoEngine["restore"]>[0]);
    engineB.status = "PLAYING";

    const restored = engineB.players[0];
    expect(restored.card).toEqual(before.card);
    expect(restored.marked.filter(Boolean).length).toBe(markedBefore);
    expect(restored.completedLines).toBe(before.completedLines);
    // ฐานล้าง socket id หลัง restore — รอ reconnect ผูกใหม่
    expect(restored.id).toBe("");

    // Reconnect: ผูก socket id ใหม่ แล้วเล่นต่อได้
    restored.id = "s1b";
    const sock2 = mockSocket("s1b");
    engineB.revealNextQuestion();
    markCurrentQuestion(engineB, io2, sock2);
    expect(engineB.getPlayer("s1b")!.marked.filter(Boolean).length).toBeGreaterThanOrEqual(markedBefore);
  });
});
