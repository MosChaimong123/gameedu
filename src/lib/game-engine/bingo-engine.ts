import { Socket } from "socket.io";
import { AbstractGameEngine, GameQuestion } from "./abstract-game";
import { GameSettings, BingoPlayer } from "../types/game";
import {
  BingoCardSize,
  answerTextOf,
  buildWorkingAnswers,
  collectAnswerPool,
  countCompletedLines,
  generateCard,
  linesToWinForSize,
  normalizeCardSize,
  shuffle,
} from "./bingo-card";
import {
  SOCKET_ERROR_BINGO_ALREADY_ANSWERED,
  SOCKET_ERROR_BINGO_INVALID_CELL,
  SOCKET_ERROR_BINGO_NO_ACTIVE_QUESTION,
  SOCKET_ERROR_BINGO_NOT_ENOUGH_ANSWERS,
  SOCKET_ERROR_PLAY_NOT_IN_GAME,
} from "../socket-error-messages";

type MarkCellPayload = {
  cellIndex?: number;
};

type BingoPersistedState = {
  workingAnswers: string[];
  questionOrder: string[];
  currentIndex: number;
};

export class BingoEngine extends AbstractGameEngine {
  public gameMode = "BINGO";
  public declare players: BingoPlayer[];

  /** คลังคำตอบกลางของทั้งห้อง (ทุกการ์ดสลับจากชุดนี้) */
  private workingAnswers: string[] = [];
  /** ลำดับ question id ที่ครูจะถาม (เฉพาะข้อที่เฉลยอยู่ในคลังคำตอบ) */
  private questionOrder: string[] = [];
  /** index ใน 'questionOrder' ของข้อที่กำลังถาม; -1 = ยังไม่เริ่มถาม */
  private currentIndex = -1;

  constructor(
    pin: string,
    hostId: string,
    setId: string,
    settings: Partial<GameSettings>,
    questions: GameQuestion[],
    io: Parameters<AbstractGameEngine["setIO"]>[0]
  ) {
    super(pin, hostId, setId, settings, questions, io);
  }

  private get size(): BingoCardSize {
    return normalizeCardSize(this.settings.cardSize);
  }

  public getPlayer(socketId: string): BingoPlayer | undefined {
    return super.getPlayer(socketId) as BingoPlayer | undefined;
  }

  public addPlayer(player: BingoPlayer, socket: Socket): void {
    player.correctAnswers = player.correctAnswers ?? 0;
    player.incorrectAnswers = player.incorrectAnswers ?? 0;
    player.completedLines = 0;
    player.answeredCurrentIndex = -1;

    if (this.workingAnswers.length > 0) {
      // เข้าเกมสาย: แจกการ์ดทันที
      const { card, marked } = generateCard(this.workingAnswers, this.size);
      player.card = card;
      player.marked = marked;
      player.completedLines = countCompletedLines(marked, this.size);
    } else {
      player.card = [];
      player.marked = [];
    }

    super.addPlayer(player, socket);

    if (this.status === "PLAYING" && player.card.length > 0) {
      socket.emit("bingo-card", { card: player.card, marked: player.marked, size: this.size });
    }
  }

  public override startGame(): void {
    const pool = collectAnswerPool(this.questions);
    const working = buildWorkingAnswers(pool, this.size);
    if (!working) {
      this.emitToHost("error", { message: SOCKET_ERROR_BINGO_NOT_ENOUGH_ANSWERS });
      return;
    }

    // ตั้งเป้าแถวอัตโนมัติตามขนาดการ์ด (ให้ค่าตรงกับที่ใช้ตัดสินใน tick)
    this.settings.bingoLinesToWin = linesToWinForSize(this.size);

    this.workingAnswers = working;
    const workingSet = new Set(working);
    this.questionOrder = shuffle(
      this.questions
        .filter((q) => workingSet.has(answerTextOf(q)))
        .map((q) => q.id)
    );
    this.currentIndex = -1;

    for (const player of this.players) {
      const { card, marked } = generateCard(this.workingAnswers, this.size);
      player.card = card;
      player.marked = marked;
      player.completedLines = countCompletedLines(marked, this.size);
      player.answeredCurrentIndex = -1;
      this.io.to(player.id).emit("bingo-card", { card, marked, size: this.size });
    }

    super.startGame();
  }

  /** ครูกดถามข้อต่อไป (host-gated ใน socket layer) */
  public revealNextQuestion(): void {
    if (this.status !== "PLAYING" || this.questionOrder.length === 0) return;

    this.currentIndex++;
    if (this.currentIndex >= this.questionOrder.length) {
      // ถามครบแล้ว → สลับลำดับใหม่แล้ววนต่อ
      this.questionOrder = shuffle(this.questionOrder);
      this.currentIndex = 0;
    }

    const questionId = this.questionOrder[this.currentIndex];
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) return;

    // โจทย์ broadcast ทั้งห้อง — ไม่ส่งเฉลย/ตัวเลือก เพราะการ์ดคือคลังคำตอบ
    this.io.to(this.pin).emit("bingo-question", {
      id: question.id,
      question: question.question,
      image: question.image ?? null,
      index: this.currentIndex,
      total: this.questionOrder.length,
    });
    // เฉลย + ตัวเลือก ส่งให้เฉพาะหน้าจอครูไว้อ้างอิง (ไม่ broadcast ถึงนักเรียน)
    this.emitToHost("bingo-answer-reveal", {
      id: question.id,
      answer: answerTextOf(question),
      options: question.options,
    });
  }

  /** Refresh กลางเกม: ผูก socket ใหม่แล้วส่งการ์ด + โจทย์ปัจจุบันกลับไปให้ */
  public override handleReconnection(player: BingoPlayer, socket: Socket): void {
    super.handleReconnection(player, socket);

    if (player.card.length > 0) {
      socket.emit("bingo-card", {
        card: player.card,
        marked: player.marked,
        size: this.size,
      });
    }

    if (this.currentIndex >= 0) {
      const questionId = this.questionOrder[this.currentIndex];
      const question = this.questions.find((q) => q.id === questionId);
      if (question) {
        socket.emit("bingo-question", {
          id: question.id,
          question: question.question,
          image: question.image ?? null,
          index: this.currentIndex,
          total: this.questionOrder.length,
        });
      }
    }
  }

  public handleEvent(eventName: string, payload: unknown, socket: Socket): void {
    switch (eventName) {
      case "mark-cell":
        this.handleMarkCell(socket, payload as MarkCellPayload);
        break;
    }
  }

  private handleMarkCell(socket: Socket, payload: MarkCellPayload): void {
    if (this.status !== "PLAYING") return;

    const player = this.getPlayer(socket.id);
    if (!player) {
      socket.emit("error", { message: SOCKET_ERROR_PLAY_NOT_IN_GAME });
      return;
    }
    if (this.currentIndex < 0) {
      socket.emit("error", { message: SOCKET_ERROR_BINGO_NO_ACTIVE_QUESTION });
      return;
    }
    if (player.answeredCurrentIndex === this.currentIndex) {
      socket.emit("error", { message: SOCKET_ERROR_BINGO_ALREADY_ANSWERED });
      return;
    }

    const cellIndex = Number(payload?.cellIndex);
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= player.card.length) {
      socket.emit("error", { message: SOCKET_ERROR_BINGO_INVALID_CELL });
      return;
    }

    const questionId = this.questionOrder[this.currentIndex];
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) return;

    const correctText = answerTextOf(question);
    const tappedText = (player.card[cellIndex] ?? "").trim();
    const alreadyMarked = player.marked[cellIndex] === true;
    const isCorrect = !alreadyMarked && tappedText === correctText;

    let newBingo = false;
    if (isCorrect) {
      // ล็อกข้อนี้เฉพาะตอนตอบถูก — ตอบผิดยังแตะใหม่ได้จนกว่าจะถูก
      player.answeredCurrentIndex = this.currentIndex;
      player.marked[cellIndex] = true;
      player.correctAnswers = (player.correctAnswers || 0) + 1;
      const before = player.completedLines;
      player.completedLines = countCompletedLines(player.marked, this.size);
      newBingo = player.completedLines > before;
    } else {
      player.incorrectAnswers = (player.incorrectAnswers || 0) + 1;
    }

    socket.emit("mark-result", {
      cellIndex,
      correct: isCorrect,
      completedLines: player.completedLines,
      newBingo,
    });
    this.statusUpdate();
  }

  public override tick(): void {
    super.tick(); // Time limit

    if (this.status === "PLAYING" && this.settings.winCondition === "LINES") {
      // เป้าปรับอัตโนมัติตามขนาดการ์ดให้เล่นจบได้จริง (ไม่อิงค่าที่กรอกเอง)
      const target = linesToWinForSize(this.size);
      if (this.players.some((p) => p.completedLines >= target)) {
        this.endGame();
      }
    }
  }

  public override endGame(): void {
    this.players.forEach((p) => {
      p.score = p.completedLines;
    });
    this.players.sort(
      (a, b) => b.completedLines - a.completedLines || b.correctAnswers - a.correctAnswers
    );
    super.endGame();
  }

  // --- Persistence ---

  public override serialize() {
    const base = super.serialize();
    const state: BingoPersistedState = {
      workingAnswers: this.workingAnswers,
      questionOrder: this.questionOrder,
      currentIndex: this.currentIndex,
    };
    return { ...base, gameMode: "BINGO", state };
  }

  public override restore(data: Parameters<AbstractGameEngine["restore"]>[0]): void {
    super.restore(data);
    const state = (data.state ?? undefined) as Partial<BingoPersistedState> | undefined;
    if (state) {
      this.workingAnswers = Array.isArray(state.workingAnswers) ? state.workingAnswers : [];
      this.questionOrder = Array.isArray(state.questionOrder) ? state.questionOrder : [];
      this.currentIndex = typeof state.currentIndex === "number" ? state.currentIndex : -1;
    }
  }
}
