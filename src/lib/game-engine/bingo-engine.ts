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
  requiredDistinctAnswers,
  shuffle,
} from "./bingo-card";
import {
  SOCKET_ERROR_BINGO_ALREADY_ANSWERED,
  SOCKET_ERROR_BINGO_INVALID_CELL,
  SOCKET_ERROR_BINGO_NO_ACTIVE_QUESTION,
  SOCKET_ERROR_BINGO_NOT_ENOUGH_ANSWERS,
  SOCKET_ERROR_PLAY_NOT_IN_GAME,
  SOCKET_ERROR_TOO_MANY_SUBMISSIONS,
} from "../socket-error-messages";

type MarkCellPayload = {
  cellIndex?: number;
};

type BingoPersistedState = {
  workingAnswers: string[];
  questionOrder: string[];
  currentIndex: number;
};

const MARK_CELL_MIN_INTERVAL_MS = 350;

export class BingoEngine extends AbstractGameEngine {
  public gameMode = "BINGO";
  public declare players: BingoPlayer[];

  /** คลังคำตอบกลางของทั้งห้อง (ทุกการ์ดสลับจากชุดนี้) */
  private workingAnswers: string[] = [];
  private markCellAttemptByPlayerId = new Map<string, { questionId: string; at: number }>();
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

  private get linesTarget(): number {
    const fallback = linesToWinForSize(this.size);
    const maxLines = this.size * 2 + 2;
    const configured = this.settings.bingoLinesToWin;
    if (typeof configured !== "number" || !Number.isFinite(configured)) return fallback;
    return Math.max(1, Math.min(maxLines, Math.floor(configured)));
  }

  public getPlayer(socketId: string): BingoPlayer | undefined {
    return super.getPlayer(socketId) as BingoPlayer | undefined;
  }

  public addPlayer(player: BingoPlayer, socket: Socket): void {
    player.correctAnswers = player.correctAnswers ?? 0;
    player.incorrectAnswers = player.incorrectAnswers ?? 0;
    player.completedLines = 0;
    player.answeredCurrentIndex = -1;
    player.answeredQuestionId = null;

    if (this.workingAnswers.length > 0 && this.workingAnswers.length === requiredDistinctAnswers(this.size)) {
      // เข้าเกมสาย: แจกการ์ดทันที (ตรวจว่า workingAnswers มีจำนวนถูกต้องก่อนสร้างการ์ด)
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
    this.settings.bingoLinesToWin = this.linesTarget;

    this.workingAnswers = working;
    const workingSet = new Set(working);
    const seenAnswers = new Set<string>();
    this.questionOrder = shuffle(
      this.questions
        .filter((q) => {
          const answer = answerTextOf(q);
          if (!workingSet.has(answer) || seenAnswers.has(answer)) return false;
          seenAnswers.add(answer);
          return true;
        })
        .map((q) => q.id)
    );
    this.currentIndex = -1;

    for (const player of this.players) {
      const { card, marked } = generateCard(this.workingAnswers, this.size);
      player.card = card;
      player.marked = marked;
      player.completedLines = countCompletedLines(marked, this.size);
      player.answeredCurrentIndex = -1;
      player.answeredQuestionId = null;
      this.io.to(player.id).emit("bingo-card", { card, marked, size: this.size });
    }

    super.startGame();
  }

  /** ครูกดถามข้อต่อไป (host-gated ใน socket layer) */
  public revealNextQuestion(): void {
    if (this.status !== "PLAYING" || this.questionOrder.length === 0) return;

    this.currentIndex++;
    if (this.currentIndex >= this.questionOrder.length) {
      // ถามครบแล้ว → สลับลำดับใหม่แล้ววนต่อ โดยไม่ให้ข้อแรกซ้ำกับข้อสุดท้ายที่เพิ่งถาม
      const lastId = this.questionOrder[this.questionOrder.length - 1];
      let reshuffled = shuffle(this.questionOrder);
      if (reshuffled.length > 1 && reshuffled[0] === lastId) {
        reshuffled = shuffle(reshuffled);
      }
      this.questionOrder = reshuffled;
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
  public syncHostState(): void {
    if (this.status !== "PLAYING") return;
    this.emitCurrentHostQuestion();
  }

  private emitCurrentHostQuestion(): void {
    if (this.currentIndex < 0) return;

    const questionId = this.questionOrder[this.currentIndex];
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) return;

    this.emitToHost("bingo-question", {
      id: question.id,
      question: question.question,
      image: question.image ?? null,
      index: this.currentIndex,
      total: this.questionOrder.length,
    });
    this.emitToHost("bingo-answer-reveal", {
      id: question.id,
      answer: answerTextOf(question),
      options: question.options,
    });
  }

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
    const cellIndex = Number(payload?.cellIndex);
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= player.card.length) {
      socket.emit("error", { message: SOCKET_ERROR_BINGO_INVALID_CELL });
      return;
    }

    const questionId = this.questionOrder[this.currentIndex];
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) return;
    const answeredQuestionId = player.answeredQuestionId ?? null;
    const answeredLegacyIndex = answeredQuestionId === null && player.answeredCurrentIndex === this.currentIndex;
    if (answeredQuestionId === questionId || answeredLegacyIndex) {
      socket.emit("error", { message: SOCKET_ERROR_BINGO_ALREADY_ANSWERED });
      return;
    }
    const now = Date.now();
    const lastAttempt = this.markCellAttemptByPlayerId.get(player.id);
    if (
      lastAttempt?.questionId === questionId &&
      now - lastAttempt.at < MARK_CELL_MIN_INTERVAL_MS
    ) {
      socket.emit("error", { message: SOCKET_ERROR_TOO_MANY_SUBMISSIONS });
      return;
    }
    this.markCellAttemptByPlayerId.set(player.id, { questionId, at: now });

    const correctText = answerTextOf(question);
    const tappedText = (player.card[cellIndex] ?? "").trim();
    const alreadyMarked = player.marked[cellIndex] === true;
    const isCorrect = !alreadyMarked && tappedText === correctText;

    let newBingo = false;
    if (isCorrect) {
      // ล็อกข้อนี้เฉพาะตอนตอบถูก — ตอบผิดยังแตะใหม่ได้จนกว่าจะถูก
      player.answeredCurrentIndex = this.currentIndex;
      player.answeredQuestionId = questionId;
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
      const target = this.linesTarget;
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
    // ล้าง state ที่ไม่ใช้แล้ว กัน memory leak ในเซิร์ฟเวอร์ที่รันยาว
    this.workingAnswers = [];
    this.questionOrder = [];
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
