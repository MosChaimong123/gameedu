import { Socket } from "socket.io";
import { AbstractGameEngine, type GameQuestion } from "./abstract-game";
import type {
    GameSettings,
    NegamonBattlePlayer,
    NegamonBattleTuning,
    NegamonRoundHit,
} from "../types/game";
import { calcDamage } from "../classroom-utils";
import { resolveNegamonTuning } from "../negamon-battle-tuning";

type BattlePhase = "QUESTION" | "BETWEEN";

type RoundAnswer = { answerIndex: number; at: number };

type NegamonBattlePersistedState = {
    phase: BattlePhase;
    questionIndex: number;
    roundIndex: number;
    roundStartedAt: number;
    roundEndsAt: number;
    betweenEndsAt: number;
    currentQuestionId: string | null;
    /** key = ชื่อเล่นในเกม (nickname) — ไม่ใช้ socket id เพื่อ reconnect / restore */
    roundAnswers: [string, RoundAnswer][];
};

type SubmitNegamonAnswerPayload = {
    /** ต้องตรงกับรหัสห้อง — กันส่งคำตอบไปคนละห้อง (เฟส D) */
    pin: string;
    questionId: string;
    answerIndex: number;
};

function normalizeRoundDamage(baseDamage: number, combatantCount: number): number {
    const targetCount = Math.max(1, combatantCount - 1);
    return Math.max(1, Math.floor(baseDamage / Math.sqrt(targetCount)));
}

export class NegamonBattleEngine extends AbstractGameEngine {
    public gameMode = "NEGAMON_BATTLE";
    public declare players: NegamonBattlePlayer[];

    private phase: BattlePhase = "QUESTION";
    private questionIndex = 0;
    private roundIndex = 0;
    private roundStartedAt = 0;
    private roundEndsAt = 0;
    private betweenEndsAt = 0;
    private currentQuestionId: string | null = null;
    /** key = player.name (nickname ในห้อง — ไม่ซ้ำยกเว้น reconnect) */
    private roundAnswers = new Map<string, RoundAnswer>();

    private get tuning(): NegamonBattleTuning {
        return resolveNegamonTuning(this.settings);
    }

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

    public getPlayer(socketId: string): NegamonBattlePlayer | undefined {
        return super.getPlayer(socketId) as NegamonBattlePlayer | undefined;
    }

    public addPlayer(player: NegamonBattlePlayer, socket: Socket): void {
        const hp = this.tuning.startHp;
        player.battleHp = hp;
        player.maxHp = hp;
        player.eliminated = false;
        player.correctAnswers = player.correctAnswers ?? 0;
        player.incorrectAnswers = player.incorrectAnswers ?? 0;
        super.addPlayer(player, socket);
    }

    public startGame(): void {
        if (this.questions.length === 0) {
            this.status = "PLAYING";
            this.startTime = Date.now();
            this.io.to(this.pin).emit("game-started", {
                startTime: this.startTime,
                settings: this.settings,
                gameMode: this.gameMode,
            });
            this.endGame();
            return;
        }
        super.startGame();
        this.questionIndex = 0;
        this.roundIndex = 0;
        this.beginRound();
    }

    public tick(): void {
        super.tick();
        if (this.status !== "PLAYING") return;

        if (this.phase === "QUESTION") {
            const active = this.activeCombatants();
            if (active.length <= 1) {
                this.endGame();
                return;
            }
            const allAnswered =
                active.length > 0 && active.every((p) => this.roundAnswers.has(p.name));
            if (Date.now() >= this.roundEndsAt || allAnswered) {
                this.resolveRound();
            }
        } else if (this.phase === "BETWEEN") {
            if (Date.now() >= this.betweenEndsAt) {
                this.beginRound();
            }
        }
    }

    public handleEvent(eventName: string, payload: unknown, socket: Socket): void {
        if (eventName === "submit-negamon-answer") {
            this.handleSubmitAnswer(socket, payload as SubmitNegamonAnswerPayload);
        }
    }

    private activeCombatants(): NegamonBattlePlayer[] {
        return this.players.filter((p) => !p.eliminated);
    }

    private beginRound(): void {
        const active = this.activeCombatants();
        if (active.length <= 1) {
            this.endGame();
            return;
        }

        this.phase = "QUESTION";
        this.roundIndex += 1;
        const q = this.questions[this.questionIndex % this.questions.length];
        this.questionIndex += 1;
        this.currentQuestionId = q.id;
        this.roundAnswers.clear();
        const now = Date.now();
        this.roundStartedAt = now;
        this.roundEndsAt = now + this.tuning.roundSeconds * 1000;

        this.broadcastState();
    }

    private handleSubmitAnswer(socket: Socket, payload: SubmitNegamonAnswerPayload): void {
        if (this.status !== "PLAYING" || this.phase !== "QUESTION") return;
        if (typeof payload.pin !== "string" || payload.pin !== this.pin) return;
        if (payload.questionId !== this.currentQuestionId) return;

        const player = this.getPlayer(socket.id);
        if (!player || player.eliminated) return;
        if (this.roundAnswers.has(player.name)) return;
        if (Date.now() > this.roundEndsAt) return;

        const idx = payload.answerIndex;
        const q = this.questions.find((x) => x.id === this.currentQuestionId);
        if (!q || typeof idx !== "number" || idx < 0 || idx >= q.options.length) return;

        this.roundAnswers.set(player.name, { answerIndex: idx, at: Date.now() });
        this.broadcastState();
    }

    private resolveRound(): void {
        if (this.phase !== "QUESTION") return;
        this.phase = "BETWEEN";

        const q = this.questions.find((x) => x.id === this.currentQuestionId);
        const logs: string[] = [];
        const hits: NegamonRoundHit[] = [];
        if (!q) {
            this.betweenEndsAt = Date.now() + this.tuning.betweenSeconds * 1000;
            this.io.to(this.pin).emit("negamon-round-result", {
                logs: ["ข้ามรอบ — ไม่มีคำถาม"],
                hits: [] as NegamonRoundHit[],
                players: this.players,
            });
            this.broadcastState();
            return;
        }

        /**
         * ลำดับเทิร์น: ผู้เล่นที่ตอบถูกเรียงตามเวลาส่งคำตอบ (เร็วก่อน) แล้วค่อยโจมตีทีละครั้ง
         * ลง HP ทันทีต่อการโจมตี — ถ้าเป้าหมาย K.O. แล้ว ผู้โจมตีคนถัดไปจะไม่ตีคนนั้น
         */
        const active = [...this.activeCombatants()];
        const combatantCount = active.length;
        const fastMs = this.tuning.fastAnswerSeconds * 1000;

        type CorrectStriker = { attacker: (typeof active)[number]; ans: RoundAnswer };
        const strikers: CorrectStriker[] = [];
        for (const attacker of active) {
            const ans = this.roundAnswers.get(attacker.name);
            const correct = ans !== undefined && ans.answerIndex === q.correctAnswer;
            if (correct && ans) strikers.push({ attacker, ans });
        }
        strikers.sort((a, b) => {
            const dt = a.ans.at - b.ans.at;
            if (dt !== 0) return dt;
            return a.attacker.name.localeCompare(b.attacker.name);
        });

        for (const { attacker, ans } of strikers) {
            const isFast = ans.at - this.roundStartedAt <= fastMs;
            for (const target of active) {
                if (target.name === attacker.name) continue;
                if (target.eliminated) continue;

                const { damage } = calcDamage(
                    this.tuning.attackerAtk,
                    this.tuning.defenderDef,
                    this.tuning.movePower,
                    1,
                    isFast
                );
                const normalizedDamage = normalizeRoundDamage(damage, combatantCount);
                target.battleHp = Math.max(0, target.battleHp - normalizedDamage);
                logs.push(`${attacker.name} โจมตี ${target.name} -${normalizedDamage} HP`);

                const eliminated = target.battleHp <= 0;
                hits.push({
                    attackerName: attacker.name,
                    targetName: target.name,
                    damage: normalizedDamage,
                    targetHpAfter: target.battleHp,
                    eliminated,
                    fastStrike: isFast,
                });

                if (eliminated) {
                    target.eliminated = true;
                    target.eliminatedAt = Date.now();
                    logs.push(`${target.name} K.O.`);
                }
            }
        }

        for (const p of active) {
            if (!this.roundAnswers.has(p.name)) {
                logs.push(`${p.name} ไม่ได้ตอบ`);
            }
        }

        const survivors = this.activeCombatants();
        if (survivors.length <= 1) {
            this.io.to(this.pin).emit("negamon-round-result", { logs, hits, players: this.players });
            this.broadcastState();
            this.endGame();
            return;
        }

        this.betweenEndsAt = Date.now() + this.tuning.betweenSeconds * 1000;
        this.io.to(this.pin).emit("negamon-round-result", { logs, hits, players: this.players });
        this.broadcastState();
    }

    private broadcastState(): void {
        const q = this.currentQuestionId
            ? this.questions.find((x) => x.id === this.currentQuestionId)
            : null;
        this.io.to(this.pin).emit("negamon-battle-state", {
            phase: this.phase,
            roundEndsAt: this.roundEndsAt,
            betweenEndsAt: this.betweenEndsAt,
            roundIndex: this.roundIndex,
            currentQuestion: q
                ? {
                      id: q.id,
                      question: q.question,
                      options: q.options,
                      timeLimit: Math.max(0, Math.ceil((this.roundEndsAt - Date.now()) / 1000)),
                      image: q.image ?? undefined,
                  }
                : null,
            players: this.players,
        });
        this.statusUpdate();
    }

    protected statusUpdate(): void {
        this.io.to(this.pin).emit("player-joined", { players: this.players });
        if (this.status === "PLAYING") {
            this.io.to(this.pin).emit("game-state-update", {
                players: this.players,
                gameMode: this.gameMode,
            });
        }
    }

    public override endGame(): void {
        this.players.forEach((p) => {
            p.score = p.eliminated ? 0 : p.battleHp;
        });
        this.players.sort((a, b) => {
            // ผู้รอด (HP > 0) อยู่บนสุด เรียงตาม HP เหลือ
            if (!a.eliminated && !b.eliminated) return b.battleHp - a.battleHp;
            if (!a.eliminated) return -1;
            if (!b.eliminated) return 1;
            // ผู้แพ้ทั้งคู่ — แพ้ทีหลัง = อยู่ด้านบน (อันดับดีกว่า)
            const aAt = a.eliminatedAt ?? 0;
            const bAt = b.eliminatedAt ?? 0;
            return bAt - aAt;
        });
        super.endGame();
    }

    public override serialize() {
        const base = super.serialize();
        const state: NegamonBattlePersistedState = {
            phase: this.phase,
            questionIndex: this.questionIndex,
            roundIndex: this.roundIndex,
            roundStartedAt: this.roundStartedAt,
            roundEndsAt: this.roundEndsAt,
            betweenEndsAt: this.betweenEndsAt,
            currentQuestionId: this.currentQuestionId,
            roundAnswers: [...this.roundAnswers.entries()],
        };
        return {
            ...base,
            gameMode: this.gameMode,
            state,
        };
    }

    public override restore(data: Parameters<AbstractGameEngine["restore"]>[0]): void {
        super.restore(data);
        const raw = data.state as NegamonBattlePersistedState | undefined;
        if (raw && typeof raw === "object") {
            this.phase = raw.phase === "BETWEEN" ? "BETWEEN" : "QUESTION";
            this.questionIndex = raw.questionIndex ?? 0;
            this.roundIndex = raw.roundIndex ?? 0;
            this.roundStartedAt = raw.roundStartedAt ?? 0;
            this.roundEndsAt = raw.roundEndsAt ?? 0;
            this.betweenEndsAt = raw.betweenEndsAt ?? 0;
            this.currentQuestionId = raw.currentQuestionId ?? null;
            this.roundAnswers = new Map();
            const allowedNames = new Set(this.players.map((p) => p.name));
            for (const [key, ans] of raw.roundAnswers ?? []) {
                if (typeof key === "string" && allowedNames.has(key) && ans && typeof ans === "object") {
                    this.roundAnswers.set(key, ans as RoundAnswer);
                }
            }
        }
        const hpDefault = this.tuning.startHp;
        this.players = this.players.map((p) => {
            const nb = p as NegamonBattlePlayer;
            return {
                ...nb,
                battleHp: nb.battleHp ?? hpDefault,
                maxHp: nb.maxHp ?? hpDefault,
                eliminated: Boolean(nb.eliminated),
            };
        });
    }
}


