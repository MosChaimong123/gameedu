import { Server, Socket } from "socket.io";
import { AbstractGameEngine } from "./abstract-game";
import { CryptoHackPlayer, CryptoHackSession, GameSettings, HackTask, CryptoReward } from "../types/game";

export class CryptoHackEngine extends AbstractGameEngine {
    public players: CryptoHackPlayer[] = [];
    public gameMode = "CRYPTO_HACK";

    // Sub-state for Crypto Hack
    private hackState: "PASSWORD_SELECTION" | "HACKING" = "PASSWORD_SELECTION";
    private passwords = ["Bitcoin", "Ethereum", "Dogecoin", "Solana", "Cardano"]; // Example passwords

    constructor(
        pin: string,
        hostId: string,
        setId: string,
        settings: GameSettings,
        questions: any[],
        io: Server
    ) {
        super(pin, hostId, setId, settings, questions, io);
    }

    protected statusUpdate(): void {
        const payload: any = {
            players: this.players,
            // Include global hack state
            hackState: this.hackState,
            // Include password options if in selection phase
            passwordOptions: this.hackState === "PASSWORD_SELECTION" ? this.passwords : undefined
        };
        this.io.to(this.pin).emit("game-state-update", payload);
    }

    addPlayer(player: any, socket: Socket) {
        if (this.status !== "LOBBY" && !this.settings.allowLateJoin) {
            socket.emit("error", { message: "Game is locked" });
            return;
        }

        const newPlayer: CryptoHackPlayer = {
            ...player,
            crypto: 0,
            password: "",
            hackChance: 1.0,
            isLocked: false,
            isGlitched: false,
            score: 0,
            hackingHistory: {}
        };

        this.players.push(newPlayer);
        this.io.to(this.pin).emit("player-joined", { players: this.players });
        console.log(`[${this.pin}] Player joined: ${newPlayer.name}`);
    }

    startGame() {
        if (this.status !== "LOBBY") return;

        super.startGame(); // emits game-started
        this.hackState = "PASSWORD_SELECTION";

        console.log(`[${this.pin}] Starting Crypto Hack: Password Selection`);

        // Emit password selection event
        this.io.to(this.pin).emit("choose-password", { options: this.passwords });

        // Auto-transition to Playing after 30 seconds if not everyone chose?
        // For now, let's just wait or start tick loop.
    }

    handleEvent(eventName: string, payload: any, socket: Socket) {
        const player = this.getPlayer(socket.id) as CryptoHackPlayer;
        if (!player) return;

        switch (eventName) {
            case "select-password":
                this.handleSelectPassword(player, payload.password);
                break;
            case "submit-answer":
                this.handleAnswerPayload(player, payload, socket);
                break;
            case "select-box":
                this.handleBoxSelection(player, payload.index, socket);
                break;
            case "request-hack-options":
                this.handleRequestHackOptions(player, payload.targetId, socket);
                break;
            case "attempt-hack":
                this.handleHackAttempt(player, payload, socket);
                break;
            case "request-question":
                this.handleRequestQuestion(socket);
                break;
            case "task-complete":
                this.handleTaskComplete(player, socket);
                break;
        }
    }

    private handleSelectPassword(player: CryptoHackPlayer, password: string) {
        if (this.hackState !== "PASSWORD_SELECTION") return;

        player.password = password;
        console.log(`[${this.pin}] ${player.name} selected password.`);

        // Notify player they are ready? Or just wait.

        // If all players selected, move to next phase?
        const allSelected = this.players.every(p => p.password !== "");
        if (allSelected && this.players.length > 0) {
            this.startHackingPhase();
        }
    }

    private startHackingPhase() {
        this.hackState = "HACKING";
        this.io.to(this.pin).emit("game-phase-change", { phase: "HACKING" });
        console.log(`[${this.pin}] Hacking Phase Started!`);
    }

    private handleAnswer(player: CryptoHackPlayer, answerIndex: number) {
        // Find current question (randomness should be handled per player ideally, but for MVP assuming synced or managed)
        // Actually Base Engine handles random question serving but we need to validate.
        // For MVP let's assume client sends Question ID and we validate.
        // But AbstractGameEngine doesn't store "current question per player" easily yet.
        // We'll rely on client honesty or simple validation if possible.
        // Actually, let's just assume correct for now to unblock, or improved:
        // Client sends { questionId, answerIndex }

        // Simulating correctness for MVP without full question tracking per player
        // In real app, we must track which question was sent to player.
        // For now, let's trust the client payload has Question ID and we check against the SET.

        // Wait, handleAnswer signature in this file only has answerIndex.
        // We should update it to accept payload or questionId.
        // Let's change the method signature in the switch call first.

        // To keep it simple: Just assume correct if we can, or fetch question.
        // Let's fetch a random question for "next-question" but validation needs ID.
    }



    public handleReconnection(player: CryptoHackPlayer, socket: Socket) {
        const oldId = player.id;
        super.handleReconnection(player, socket);
        // Player object state (including pendingRewards) is preserved by reference or restore
        console.log(`[Crypto] Player reconnected: ${player.name}`);
    }

    // Updated signature to handle full payload
    private handleAnswerPayload(player: CryptoHackPlayer, payload: any, socket: Socket) {
        const { questionId, answerIndex } = payload;
        const question = this.questions.find(q => q.id === questionId);

        if (!question) return;

        const isCorrect = question.correctAnswer === answerIndex;

        socket.emit("answer-result", { correct: isCorrect });

        console.log(`[Crypto] Answer: ${player.name} Correct: ${isCorrect}`);

        if (isCorrect) {
            // Generate 3 choices
            const choices = this.generateRewardChoices();
            player.pendingRewards = choices; // Store on player
            console.log(`[Crypto] Generated rewards for ${player.name}:`, choices);

            setTimeout(() => {
                console.log(`[Crypto] Emitting choose-box to ${player.name} (${player.id})`);
                this.io.to(player.id).emit("choose-box", { options: ["HIDDEN", "HIDDEN", "HIDDEN"] });
            }, 1000);
        }
    }

    private generateRewardChoices(): CryptoReward[] {
        const rewards: CryptoReward[] = [];
        for (let i = 0; i < 3; i++) {
            const roll = Math.random();
            if (roll < 0.6) {
                // 60% Common Crypto
                rewards.push({ type: "CRYPTO", amount: Math.floor(Math.random() * 40) + 10 });
            } else if (roll < 0.8) {
                // 20% Multiplier or Rare Crypto
                if (Math.random() > 0.5) rewards.push({ type: "MULTIPLIER", value: 2 });
                else rewards.push({ type: "CRYPTO", amount: 50 });
            } else if (roll < 0.95) {
                // 15% HACK (High chance if rare rolled)
                rewards.push({ type: "HACK" });
            } else {
                // 5% NOTHING
                rewards.push({ type: "NOTHING" });
            }
        }
        return rewards;
    }

    private handleBoxSelection(player: CryptoHackPlayer, index: number, socket: Socket) {
        try {
            console.log(`[Crypto] Box Selection by ${player.name} (Index: ${index})`);
            const choices = player.pendingRewards;

            if (!choices || !choices[index]) {
                console.warn(`[Crypto] Invalid box selection for ${player.name}: No pending rewards (Count: ${choices?.length}) or invalid index.`);
                socket.emit("selection-error", { message: "No rewards pending or invalid selection." });
                return;
            }

            const reward = choices[index];
            // Clear pending - IMPORANT: Do this AFTER successful retrieval
            player.pendingRewards = undefined;

            if (reward.type === "CRYPTO") {
                console.log(`[Crypto] Updating crypto for ${player.name}: ${player.crypto} + ${reward.amount}`);
                player.crypto = (player.crypto || 0) + reward.amount;
            } else if (reward.type === "MULTIPLIER") {
                console.log(`[Crypto] Updating crypto for ${player.name}: ${player.crypto} * ${reward.value}`);
                player.crypto = (player.crypto || 0) * reward.value;
            }

            const newTotal = player.crypto;
            console.log(`[Crypto] New Total for ${player.name}: ${newTotal}. Reward: ${reward.type}`);

            // Emit reveal
            socket.emit("box-reveal", { index, reward, newTotal });
            this.statusUpdate(); // Persist state change
        } catch (error) {
            console.error(`[Crypto] Error in handleBoxSelection:`, error);
            socket.emit("selection-error", { message: "Server error processing selection." });
        }
    }

    private handleRequestHackOptions(player: CryptoHackPlayer, targetId: string, socket: Socket) {
        const target = this.players.find(p => p.id === targetId);
        if (!target) return;

        // Hint Logic
        let hint;
        if (target.id === player.id) {
            // Self-hack? (Practice)
            hint = "You";
        } else {
            const attempts = player.hackingHistory[targetId] || 0;
            if (attempts > 0) {
                // Reveal first N chars
                hint = target.password.substring(0, Math.min(attempts, target.password.length));
            }
        }

        socket.emit("hack-options", {
            targetId,
            options: this.passwords, // In real game, maybe vary options
            hint: hint || undefined
        });
    }

    private handleHackAttempt(player: CryptoHackPlayer, payload: any, socket: Socket) {
        const { targetId, passwordGuess } = payload;
        const target = this.players.find(p => p.id === targetId);

        if (!target) return;

        // Record Attempt for Hint Logic
        if (!player.hackingHistory) player.hackingHistory = {};
        if (!player.hackingHistory[targetId]) player.hackingHistory[targetId] = 0;

        const isCorrect = target.password === passwordGuess;

        if (isCorrect) {
            // Success!
            // Steal Amount (Logic from Blooket: % of crypto?)
            // Let's allow stealing 10-30% of target crypto, minimum 10.
            const stealPercent = (Math.floor(Math.random() * 20) + 10) / 100;
            let stealAmount = Math.floor(target.crypto * stealPercent);
            if (stealAmount < 10) stealAmount = Math.min(target.crypto, 10);

            target.crypto -= stealAmount;
            player.crypto += stealAmount;
            if (target.crypto < 0) target.crypto = 0;

            // --- Glitch Mechanic ---
            target.isGlitched = true;
            target.currentTask = this.generateTask();

            // Emit Results
            socket.emit("hack-result", { success: true, amount: stealAmount, targetName: target.name });
            this.io.to(target.id).emit("player-hacked", {
                hacker: player.name,
                amount: stealAmount,
                isGlitched: true,
                task: target.currentTask
            });

            // Clear history on success?
            player.hackingHistory[targetId] = 0;

        } else {
            // Fail
            player.hackingHistory[targetId]++;
            socket.emit("hack-result", { success: false, targetName: target.name });

            // Penalty? Move to Task?
            // "Task Penalty" logic needed.
            // For now, simple fail.
        }

        this.statusUpdate();
    }

    private handleRequestQuestion(socket: Socket) {
        const player = this.getPlayer(socket.id) as CryptoHackPlayer;
        if (player && player.isGlitched) {
            socket.emit("error", { message: "System Glitched! Complete task to restore." });
            // Resend task just in case
            if (player.currentTask) socket.emit("task-assigned", { task: player.currentTask });
            return;
        }

        if (!this.questions || this.questions.length === 0) return;
        const q = this.questions[Math.floor(Math.random() * this.questions.length)];
        socket.emit("next-question", {
            id: q.id,
            question: q.question,
            options: q.options,
            timeLimit: q.timeLimit,
            image: q.image
        });
    }

    private generateTask(): HackTask {
        const rand = Math.random();

        if (rand < 0.33) {
            // Type Code
            const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
                code += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            return { type: "TYPE_CODE", payload: { code } };
        } else if (rand < 0.66) {
            // Upload Data
            return { type: "UPLOAD_DATA", payload: { size: Math.floor(Math.random() * 500) + 100 } };
        } else {
            // Pattern
            return { type: "PATTERN", payload: { length: 4 } };
        }
    }

    private handleTaskComplete(player: CryptoHackPlayer, socket: Socket) {
        if (!player.currentTask) return;

        // MVP: Client says complete, we trust. 
        // Ideal: Client sends payload to verify (e.g., typed code).

        player.currentTask = null;
        player.isLocked = false;
        player.isGlitched = false; // Clear glitch

        socket.emit("task-complete", { success: true });
        // Emit explicit "glitch-cleared" if needed, but state update handles view switch
        this.statusUpdate();
    }

    // Override tick to allow for Crypto Goal win condition
    public tick(): void {
        super.tick(); // Handles time

        if (this.status === "PLAYING" && this.settings.winCondition === "GOLD" && this.settings.goldGoal) {
            // Check if any player reached the goal
            const winner = this.players.find(p => p.crypto >= this.settings.goldGoal);
            if (winner) {
                this.endGame();
            }
        }
    }

    // Override State for Serialization
    public restore(data: any): void {
        super.restore(data);
        this.hackState = data.hackState || "PASSWORD_SELECTION";
        this.passwords = data.passwordOptions || ["Bitcoin", "Ethereum", "Dogecoin", "Solana", "Cardano"];
        console.log(`[Crypto] Restored game ${this.pin}. Players: ${this.players.length}`);
    }

    // Override State for Serialization
    public serialize(): any {
        return {
            ...super.serialize(),
            players: this.players,
            hackState: this.hackState,
            passwordOptions: this.passwords
        };
    }
}
