import { Socket } from "socket.io";
import { AbstractGameEngine, GameQuestion } from "./abstract-game";
import { ArQuestPlayer, GameSettings } from "../types/game";
import {
  SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS,
  SOCKET_ERROR_PLAY_NOT_IN_GAME,
} from "../socket-error-messages";

type SubmitArAnswerPayload = {
  questionId: string;
  answerIndex: number;
};

const BASE_CORRECT_SCORE = 100;
const STREAK_BONUS = 25;

export class ArQuestEngine extends AbstractGameEngine {
  public gameMode = "AR_QUEST";
  public declare players: ArQuestPlayer[];

  private seenQuestions = new Map<string, Set<string>>();

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

  public getPlayer(socketId: string): ArQuestPlayer | undefined {
    return super.getPlayer(socketId) as ArQuestPlayer | undefined;
  }

  public addPlayer(player: ArQuestPlayer, socket: Socket): void {
    player.arScore = 0;
    player.streak = 0;
    player.correctAnswers = 0;
    player.incorrectAnswers = 0;
    player.servedQuestionId = null;
    super.addPlayer(player, socket);
  }

  public override startGame(): void {
    super.startGame();
    this.syncHostState();
  }

  public handleEvent(eventName: string, payload: unknown, socket: Socket): void {
    switch (eventName) {
      case "request-question":
        this.handleRequestQuestion(socket);
        break;
      case "submit-answer":
      case "submit-ar-answer":
        this.handleSubmitAnswer(socket, payload as SubmitArAnswerPayload);
        break;
      case "ar-tracking-ready":
        this.io.to(this.pin).emit("ar-tracking-status", {
          playerId: socket.id,
          ready: true,
        });
        break;
    }
  }

  public tick(): void {
    super.tick();

    if (this.status === "PLAYING" && this.settings.winCondition === "GOLD") {
      const winner = this.players.find((p) => p.arScore >= (this.settings.goldGoal ?? Infinity));
      if (winner) this.endGame();
    }
  }

  public syncHostState(): void {
    this.emitArState();
  }

  private handleSubmitAnswer(socket: Socket, payload: SubmitArAnswerPayload) {
    const { questionId, answerIndex } = payload;
    const player = this.getPlayer(socket.id);
    if (!player) {
      socket.emit("error", { message: SOCKET_ERROR_PLAY_NOT_IN_GAME });
      return;
    }

    const question = this.questions.find((q) => q.id === questionId);
    if (!question) {
      socket.emit("error", { message: SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS });
      return;
    }

    if (player.servedQuestionId !== questionId) return;
    player.servedQuestionId = null;

    const correct = question.correctAnswer === answerIndex;
    if (!player.responses) player.responses = {};
    player.responses[questionId] = correct;

    if (correct) {
      player.correctAnswers += 1;
      player.streak += 1;
      player.arScore += BASE_CORRECT_SCORE + Math.max(0, player.streak - 1) * STREAK_BONUS;
    } else {
      player.incorrectAnswers += 1;
      player.streak = 0;
    }
    player.score = player.arScore;

    socket.emit("answer-result", { correct, score: player.arScore, streak: player.streak });
    socket.emit("ar-answer-result", { correct, score: player.arScore, streak: player.streak });
    this.statusUpdate();
    this.emitArState();
  }

  private handleRequestQuestion(socket: Socket) {
    if (!this.questions || this.questions.length === 0) return;

    const player = this.getPlayer(socket.id);
    if (!player) {
      socket.emit("error", { message: SOCKET_ERROR_PLAY_NOT_IN_GAME });
      return;
    }

    const key = player.name;
    if (!this.seenQuestions.has(key)) this.seenQuestions.set(key, new Set());
    const seen = this.seenQuestions.get(key)!;
    const available = this.questions.filter((q) => !seen.has(q.id));
    const pool = available.length > 0 ? available : this.questions;
    if (available.length === 0) seen.clear();

    const question = pool[Math.floor(Math.random() * pool.length)];
    seen.add(question.id);
    player.servedQuestionId = question.id;

    socket.emit("next-question", {
      id: question.id,
      question: question.question,
      options: question.options,
      timeLimit: question.timeLimit,
      image: question.image,
    });
    this.io.to(this.pin).emit("ar-quest-question-served", {
      playerId: player.id,
      playerName: player.name,
      questionId: question.id,
    });
  }

  private emitArState(): void {
    this.io.to(this.pin).emit("ar-quest-state", {
      players: this.players,
      settings: this.settings.arQuest,
      gameMode: this.gameMode,
    });
  }

  public override endGame() {
    this.players.forEach((player) => {
      player.score = player.arScore;
    });
    this.players.sort((a, b) => b.arScore - a.arScore);
    this.seenQuestions.clear();
    super.endGame();
  }

  public override serialize() {
    const base = super.serialize();
    return {
      ...base,
      gameMode: "AR_QUEST",
      state: {},
    };
  }

  public override restore(data: Parameters<AbstractGameEngine["restore"]>[0]): void {
    super.restore(data);
  }
}
