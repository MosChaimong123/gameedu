"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegamonBattleEngine = void 0;
const abstract_game_1 = require("./abstract-game");
const classroom_utils_1 = require("../classroom-utils");
const negamon_battle_tuning_1 = require("../negamon-battle-tuning");
function normalizeRoundDamage(baseDamage, combatantCount) {
    const targetCount = Math.max(1, combatantCount - 1);
    return Math.max(1, Math.floor(baseDamage / Math.sqrt(targetCount)));
}
class NegamonBattleEngine extends abstract_game_1.AbstractGameEngine {
    get tuning() {
        return (0, negamon_battle_tuning_1.resolveNegamonTuning)(this.settings);
    }
    constructor(pin, hostId, setId, settings, questions, io) {
        super(pin, hostId, setId, settings, questions, io);
        this.gameMode = "NEGAMON_BATTLE";
        this.phase = "QUESTION";
        this.questionIndex = 0;
        this.roundIndex = 0;
        this.roundStartedAt = 0;
        this.roundEndsAt = 0;
        this.betweenEndsAt = 0;
        this.currentQuestionId = null;
        /** key = player.name (nickname ในห้อง — ไม่ซ้ำยกเว้น reconnect) */
        this.roundAnswers = new Map();
    }
    getPlayer(socketId) {
        return super.getPlayer(socketId);
    }
    addPlayer(player, socket) {
        var _a, _b;
        const hp = this.tuning.startHp;
        player.battleHp = hp;
        player.maxHp = hp;
        player.eliminated = false;
        player.correctAnswers = (_a = player.correctAnswers) !== null && _a !== void 0 ? _a : 0;
        player.incorrectAnswers = (_b = player.incorrectAnswers) !== null && _b !== void 0 ? _b : 0;
        super.addPlayer(player, socket);
    }
    startGame() {
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
    tick() {
        super.tick();
        if (this.status !== "PLAYING")
            return;
        if (this.phase === "QUESTION") {
            const active = this.activeCombatants();
            if (active.length <= 1) {
                this.endGame();
                return;
            }
            const allAnswered = active.length > 0 && active.every((p) => this.roundAnswers.has(p.name));
            if (Date.now() >= this.roundEndsAt || allAnswered) {
                this.resolveRound();
            }
        }
        else if (this.phase === "BETWEEN") {
            if (Date.now() >= this.betweenEndsAt) {
                this.beginRound();
            }
        }
    }
    handleEvent(eventName, payload, socket) {
        if (eventName === "submit-negamon-answer") {
            this.handleSubmitAnswer(socket, payload);
        }
    }
    activeCombatants() {
        return this.players.filter((p) => !p.eliminated);
    }
    beginRound() {
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
    handleSubmitAnswer(socket, payload) {
        if (this.status !== "PLAYING" || this.phase !== "QUESTION")
            return;
        if (typeof payload.pin !== "string" || payload.pin !== this.pin)
            return;
        if (payload.questionId !== this.currentQuestionId)
            return;
        const player = this.getPlayer(socket.id);
        if (!player || player.eliminated)
            return;
        if (this.roundAnswers.has(player.name))
            return;
        if (Date.now() > this.roundEndsAt)
            return;
        const idx = payload.answerIndex;
        const q = this.questions.find((x) => x.id === this.currentQuestionId);
        if (!q || typeof idx !== "number" || idx < 0 || idx >= q.options.length)
            return;
        this.roundAnswers.set(player.name, { answerIndex: idx, at: Date.now() });
        this.broadcastState();
    }
    resolveRound() {
        if (this.phase !== "QUESTION")
            return;
        this.phase = "BETWEEN";
        const q = this.questions.find((x) => x.id === this.currentQuestionId);
        const logs = [];
        const hits = [];
        if (!q) {
            this.betweenEndsAt = Date.now() + this.tuning.betweenSeconds * 1000;
            this.io.to(this.pin).emit("negamon-round-result", {
                logs: ["ข้ามรอบ — ไม่มีคำถาม"],
                hits: [],
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
        const strikers = [];
        for (const attacker of active) {
            const ans = this.roundAnswers.get(attacker.name);
            const correct = ans !== undefined && ans.answerIndex === q.correctAnswer;
            if (correct && ans)
                strikers.push({ attacker, ans });
        }
        strikers.sort((a, b) => {
            const dt = a.ans.at - b.ans.at;
            if (dt !== 0)
                return dt;
            return a.attacker.name.localeCompare(b.attacker.name);
        });
        for (const { attacker, ans } of strikers) {
            const isFast = ans.at - this.roundStartedAt <= fastMs;
            for (const target of active) {
                if (target.name === attacker.name)
                    continue;
                if (target.eliminated)
                    continue;
                const { damage } = (0, classroom_utils_1.calcDamage)(this.tuning.attackerAtk, this.tuning.defenderDef, this.tuning.movePower, 1, isFast);
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
    broadcastState() {
        var _a;
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
                    image: (_a = q.image) !== null && _a !== void 0 ? _a : undefined,
                }
                : null,
            players: this.players,
        });
        this.statusUpdate();
    }
    statusUpdate() {
        this.io.to(this.pin).emit("player-joined", { players: this.players });
        if (this.status === "PLAYING") {
            this.io.to(this.pin).emit("game-state-update", {
                players: this.players,
                gameMode: this.gameMode,
            });
        }
    }
    endGame() {
        this.players.forEach((p) => {
            p.score = p.eliminated ? 0 : p.battleHp;
        });
        this.players.sort((a, b) => {
            var _a, _b;
            // ผู้รอด (HP > 0) อยู่บนสุด เรียงตาม HP เหลือ
            if (!a.eliminated && !b.eliminated)
                return b.battleHp - a.battleHp;
            if (!a.eliminated)
                return -1;
            if (!b.eliminated)
                return 1;
            // ผู้แพ้ทั้งคู่ — แพ้ทีหลัง = อยู่ด้านบน (อันดับดีกว่า)
            const aAt = (_a = a.eliminatedAt) !== null && _a !== void 0 ? _a : 0;
            const bAt = (_b = b.eliminatedAt) !== null && _b !== void 0 ? _b : 0;
            return bAt - aAt;
        });
        super.endGame();
    }
    serialize() {
        const base = super.serialize();
        const state = {
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
    restore(data) {
        var _a, _b, _c, _d, _e, _f, _g;
        super.restore(data);
        const raw = data.state;
        if (raw && typeof raw === "object") {
            this.phase = raw.phase === "BETWEEN" ? "BETWEEN" : "QUESTION";
            this.questionIndex = (_a = raw.questionIndex) !== null && _a !== void 0 ? _a : 0;
            this.roundIndex = (_b = raw.roundIndex) !== null && _b !== void 0 ? _b : 0;
            this.roundStartedAt = (_c = raw.roundStartedAt) !== null && _c !== void 0 ? _c : 0;
            this.roundEndsAt = (_d = raw.roundEndsAt) !== null && _d !== void 0 ? _d : 0;
            this.betweenEndsAt = (_e = raw.betweenEndsAt) !== null && _e !== void 0 ? _e : 0;
            this.currentQuestionId = (_f = raw.currentQuestionId) !== null && _f !== void 0 ? _f : null;
            this.roundAnswers = new Map();
            const allowedNames = new Set(this.players.map((p) => p.name));
            for (const [key, ans] of (_g = raw.roundAnswers) !== null && _g !== void 0 ? _g : []) {
                if (typeof key === "string" && allowedNames.has(key) && ans && typeof ans === "object") {
                    this.roundAnswers.set(key, ans);
                }
            }
        }
        const hpDefault = this.tuning.startHp;
        this.players = this.players.map((p) => {
            var _a, _b;
            const nb = p;
            return {
                ...nb,
                battleHp: (_a = nb.battleHp) !== null && _a !== void 0 ? _a : hpDefault,
                maxHp: (_b = nb.maxHp) !== null && _b !== void 0 ? _b : hpDefault,
                eliminated: Boolean(nb.eliminated),
            };
        });
    }
}
exports.NegamonBattleEngine = NegamonBattleEngine;
