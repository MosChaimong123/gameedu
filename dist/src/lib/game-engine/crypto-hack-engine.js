"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoHackEngine = void 0;
const abstract_game_1 = require("./abstract-game");
const CRYPTO_PASSWORDS = [
    "Bitcoin", "Ethereum", "Dogecoin", "Solana", "Cardano",
    "Ripple", "Binance", "Tether", "Polkadot", "Litecoin",
    "Chainlink", "Stellar", "Monero", "Tron", "Cosmos",
    "Tezos", "IOTA", "Neo", "Dash", "Zcash",
    "Maker", "Aave", "Uniswap", "Sushi", "Compound",
    "Curve", "Yearn", "Polygon", "Avalanche", "Terra",
    "Algorand", "VeChain", "Filecoin", "Sandbox", "Decentraland",
    "Axie", "Theta", "Fantom", "Quant", "Hedera",
    "Near", "Flow", "EOS", "TrueUSD", "Zilliqa",
    "Harmony", "Elrond", "Enjin", "Chiliz", "Kusama"
];
class CryptoHackEngine extends abstract_game_1.AbstractGameEngine {
    constructor(pin, hostId, setId, settings, questions, io) {
        super(pin, hostId, setId, settings, questions, io);
        this.players = [];
        this.gameMode = "CRYPTO_HACK";
        // Sub-state for Crypto Hack
        this.hackState = "PASSWORD_SELECTION";
        this.passwords = CRYPTO_PASSWORDS;
    }
    statusUpdate() {
        // Calculate available passwords (remove already taken ones)
        const takenPasswords = new Set(this.players.map(p => p.password).filter(p => p && p !== ""));
        const availablePasswords = CRYPTO_PASSWORDS.filter(p => !takenPasswords.has(p));
        // Update local ref ensuring it doesn't get stale in wrong way, though we use calculated one for payload
        this.passwords = availablePasswords;
        const payload = {
            players: this.players,
            hackState: this.hackState,
            // Send ONLY available passwords
            passwordOptions: availablePasswords
        };
        this.io.to(this.pin).emit("game-state-update", payload);
    }
    addPlayer(player, socket) {
        if (this.status !== "LOBBY" && !this.settings.allowLateJoin) {
            socket.emit("error", { message: "Game is locked" });
            return;
        }
        const existingPlayerIndex = this.players.findIndex(p => p.name === player.name);
        if (existingPlayerIndex !== -1) {
            // Reconnection: Update Socket ID
            console.log(`[${this.pin}] Player reconnected: ${player.name}`);
            this.players[existingPlayerIndex].id = socket.id;
            this.players[existingPlayerIndex].isConnected = true;
            // Resend current state to this player
            socket.emit("game-state-update", {
                players: this.players,
                hackState: this.hackState,
                passwordOptions: this.hackState === "PASSWORD_SELECTION" ? this.passwords : undefined
            });
        }
        else {
            // New Player
            const newPlayer = {
                ...player,
                id: socket.id, // Ensure we use the socket ID
                crypto: 0,
                // If joining late (HACKING phase), auto-assign password to prevent bugs
                password: this.hackState === "HACKING" ? "GuestPass" : "",
                hackChance: 1.0,
                isGlitched: false,
                score: 0,
                correctAnswers: 0,
                incorrectAnswers: 0,
                isLocked: false,
                hackingHistory: {},
                completedTaskTypes: []
            };
            this.players.push(newPlayer);
            console.log(`[${this.pin}] New player joined: ${newPlayer.name}`);
        }
        this.io.to(this.pin).emit("player-joined", { players: this.players });
    }
    startGame() {
        if (this.status !== "LOBBY")
            return;
        super.startGame(); // emits game-started
        this.hackState = "PASSWORD_SELECTION";
        console.log(`[${this.pin}] Starting Crypto Hack: Password Selection`);
        // Emit password selection event
        this.io.to(this.pin).emit("choose-password", { options: this.passwords });
        // Auto-transition to Playing after 30 seconds if not everyone chose?
        // For now, let's just wait or start tick loop.
    }
    handleEvent(eventName, payload, socket) {
        const player = this.getPlayer(socket.id);
        if (!player)
            return;
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
    handleSelectPassword(player, password) {
        if (this.hackState !== "PASSWORD_SELECTION")
            return;
        // Prevent Duplicate Password Selection
        const isTaken = this.players.some(p => p.id !== player.id && p.password === password);
        if (isTaken) {
            this.io.to(player.id).emit("error", { message: "Protocol Occupied! Choose another." });
            return;
        }
        player.password = password;
        console.log(`[${this.pin}] ${player.name} selected password: ${password}`);
        this.statusUpdate(); // Refresh available list
        // If all players selected, move to next phase
        const allSelected = this.players.every(p => p.password !== "");
        if (allSelected && this.players.length > 0) {
            this.startHackingPhase();
        }
    }
    startHackingPhase() {
        this.hackState = "HACKING";
        this.io.to(this.pin).emit("game-phase-change", { phase: "HACKING" });
        console.log(`[${this.pin}] Hacking Phase Started!`);
    }
    handleAnswer(player, answerIndex) {
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
    handleReconnection(player, socket) {
        const oldId = player.id;
        super.handleReconnection(player, socket);
        // Player object state (including pendingRewards) is preserved by reference or restore
        console.log(`[Crypto] Player reconnected: ${player.name}`);
    }
    // Updated signature to handle full payload
    handleAnswerPayload(player, payload, socket) {
        const { questionId, answerIndex } = payload;
        const question = this.questions.find(q => q.id === questionId);
        if (!question)
            return;
        const isCorrect = question.correctAnswer === answerIndex;
        if (isCorrect) {
            player.correctAnswers = (player.correctAnswers || 0) + 1;
        }
        else {
            player.incorrectAnswers = (player.incorrectAnswers || 0) + 1;
        }
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
    generateRewardChoices() {
        const rewards = [];
        for (let i = 0; i < 3; i++) {
            const roll = Math.random();
            if (roll < 0.6) {
                // 60% Common Crypto
                rewards.push({ type: "CRYPTO", amount: Math.floor(Math.random() * 40) + 10 });
            }
            else if (roll < 0.8) {
                // 20% Multiplier or Rare Crypto
                if (Math.random() > 0.5)
                    rewards.push({ type: "MULTIPLIER", value: 2 });
                else
                    rewards.push({ type: "CRYPTO", amount: 50 });
            }
            else if (roll < 0.95) {
                // 15% HACK (High chance if rare rolled)
                rewards.push({ type: "HACK" });
            }
            else {
                // 5% NOTHING
                rewards.push({ type: "NOTHING" });
            }
        }
        return rewards;
    }
    handleBoxSelection(player, index, socket) {
        try {
            // Ensure index is a number
            if (typeof index !== 'number') {
                index = parseInt(index);
                if (isNaN(index)) {
                    console.warn(`[Crypto] Invalid index format from ${player.name}:`, index);
                    return;
                }
            }
            console.log(`[Crypto] Box Selection by ${player.name} (Index: ${index})`);
            const choices = player.pendingRewards;
            if (!choices || !choices[index]) {
                console.warn(`[Crypto] Invalid box selection for ${player.name}: No pending rewards (Count: ${choices === null || choices === void 0 ? void 0 : choices.length}) or invalid index (${index}).`);
                socket.emit("selection-error", { message: "No rewards pending or invalid selection." });
                // Re-emit choose-box to sync client?
                if (choices && choices.length === 3) {
                    socket.emit("choose-box", { options: ["HIDDEN", "HIDDEN", "HIDDEN"] });
                }
                return;
            }
            const reward = choices[index];
            // Clear pending - IMPORANT: Do this AFTER successful retrieval
            player.pendingRewards = undefined;
            if (reward.type === "CRYPTO") {
                console.log(`[Crypto] Updating crypto for ${player.name}: ${player.crypto} + ${reward.amount}`);
                player.crypto = (player.crypto || 0) + reward.amount;
            }
            else if (reward.type === "MULTIPLIER") {
                console.log(`[Crypto] Updating crypto for ${player.name}: ${player.crypto} * ${reward.value}`);
                player.crypto = (player.crypto || 0) * reward.value;
            }
            const newTotal = player.crypto;
            console.log(`[Crypto] New Total for ${player.name}: ${newTotal}. Reward: ${reward.type}`);
            // Emit reveal
            socket.emit("box-reveal", { index, reward, newTotal });
            this.statusUpdate(); // Persist state change
        }
        catch (error) {
            console.error(`[Crypto] Error in handleBoxSelection:`, error);
            socket.emit("selection-error", { message: "Server error processing selection." });
        }
    }
    handleRequestHackOptions(player, targetId, socket) {
        const target = this.players.find(p => p.id === targetId);
        if (!target)
            return;
        // Hint Logic
        let hint;
        const attempts = (player.hackingHistory && player.hackingHistory[targetId]) || 0;
        if (target.id === player.id) {
            hint = "You";
        }
        else if (attempts > 0) {
            hint = target.password.substring(0, Math.min(attempts, target.password.length));
        }
        // Generate Hack Options (Target + 9 Random Distractors)
        // Access global constant CRYPTO_PASSWORDS
        const fullList = CRYPTO_PASSWORDS;
        const distractors = fullList.filter(p => p !== target.password);
        // Shuffle distractors
        for (let i = distractors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
        }
        // Pick top 9
        const selected = distractors.slice(0, 9);
        // Ensure target password is included
        if (target.password)
            selected.push(target.password);
        // Shuffle final list (Total ~10)
        for (let i = selected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selected[i], selected[j]] = [selected[j], selected[i]];
        }
        socket.emit("hack-options", {
            targetId,
            options: selected,
            hint: hint || undefined
        });
    }
    handleHackAttempt(player, payload, socket) {
        const { targetId, passwordGuess } = payload;
        const target = this.players.find(p => p.id === targetId);
        if (!target)
            return;
        // Record Attempt for Hint Logic
        if (!player.hackingHistory)
            player.hackingHistory = {};
        if (!player.hackingHistory[targetId])
            player.hackingHistory[targetId] = 0;
        const isCorrect = target.password === passwordGuess;
        if (isCorrect) {
            // Success!
            // Steal Amount (Logic from Blooket: % of crypto?)
            // Let's allow stealing 10-30% of target crypto, minimum 10.
            const stealPercent = (Math.floor(Math.random() * 20) + 10) / 100;
            let stealAmount = Math.floor(target.crypto * stealPercent);
            if (stealAmount < 10)
                stealAmount = Math.min(target.crypto, 10);
            target.crypto -= stealAmount;
            player.crypto += stealAmount;
            if (target.crypto < 0)
                target.crypto = 0;
            // --- Glitch Mechanic ---
            target.isGlitched = true;
            target.currentTask = this.generateTask(target);
            // Emit Results
            socket.emit("hack-result", { success: true, amount: stealAmount, targetName: target.name });
            this.io.to(target.id).emit("player-hacked", {
                hacker: player.name,
                amount: stealAmount,
                isGlitched: true,
                task: target.currentTask
            });
            // Broadcast to Host/Room for Log
            this.io.to(this.pin).emit("interaction-effect", {
                source: player.name,
                target: target.name,
                type: "HACK",
                amount: stealAmount
            });
            // Clear history on success?
            player.hackingHistory[targetId] = 0;
        }
        else {
            // Fail
            player.hackingHistory[targetId]++;
            socket.emit("hack-result", { success: false, targetName: target.name });
            // Penalty? Move to Task?
            // "Task Penalty" logic needed.
            // For now, simple fail.
        }
        this.statusUpdate();
    }
    handleRequestQuestion(socket) {
        // Enforce Phase Check
        if (this.hackState === "PASSWORD_SELECTION") {
            const player = this.getPlayer(socket.id);
            if (player && !player.password) {
                // If player hasn't selected password, resent options instead of question
                socket.emit("choose-password", { options: this.passwords });
            }
            return; // STOP HERE
        }
        const player = this.getPlayer(socket.id);
        if (!player)
            return;
        // Check for Pending Rewards (Stuck in Box Selection)
        if (player.pendingRewards && player.pendingRewards.length > 0) {
            console.log(`[Crypto] Player ${player.name} requested question but has pending rewards. Resending choose-box.`);
            socket.emit("choose-box", { options: ["HIDDEN", "HIDDEN", "HIDDEN"] });
            return;
        }
        if (player && player.isGlitched) {
            socket.emit("error", { message: "System Glitched! Complete task to restore." });
            // Resend task just in case
            if (player.currentTask)
                socket.emit("task-assigned", { task: player.currentTask });
            // Also emit player-hacked to show overlay?
            // socket.emit("player-hacked", ...)
            return;
        }
        if (!this.questions || this.questions.length === 0)
            return;
        const q = this.questions[Math.floor(Math.random() * this.questions.length)];
        // Randomize options order for security/gameplay?
        // For MVP, sending raw.
        socket.emit("next-question", {
            id: q.id,
            question: q.question,
            options: q.options,
            timeLimit: q.timeLimit,
            image: q.image
        });
    }
    generateTask(player) {
        const allTypes = ["TYPE_CODE", "UPLOAD_DATA", "PATTERN", "FREQUENCY", "MEMORY"];
        let available = allTypes.filter(t => !player.completedTaskTypes.includes(t));
        // If all types completed, reset history and use all
        if (available.length === 0) {
            player.completedTaskTypes = [];
            available = allTypes;
        }
        // Pick Random
        const type = available[Math.floor(Math.random() * available.length)];
        // Add to history (will be saved on completion or assignment? Better on assignment to avoid repeats if fail/retry)
        // Actually, let's track on assignment so next one is different
        player.completedTaskTypes.push(type);
        // Generate Payload
        switch (type) {
            case "TYPE_CODE":
                const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                let code = "";
                for (let i = 0; i < 6; i++) {
                    code += charset.charAt(Math.floor(Math.random() * charset.length));
                }
                return { type: "TYPE_CODE", payload: { code } };
            case "UPLOAD_DATA":
                return { type: "UPLOAD_DATA", payload: { size: Math.floor(Math.random() * 500) + 100 } };
            case "PATTERN":
                return { type: "PATTERN", payload: { length: 4 } };
            case "FREQUENCY":
                return { type: "FREQUENCY" };
            case "MEMORY":
                return { type: "MEMORY" };
            default:
                return { type: "TYPE_CODE", payload: { code: "ERROR" } };
        }
    }
    handleTaskComplete(player, socket) {
        if (!player.currentTask)
            return;
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
    tick() {
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
    restore(data) {
        super.restore(data);
        this.hackState = data.hackState || "PASSWORD_SELECTION";
        this.passwords = data.passwordOptions || [
            "Bitcoin", "Ethereum", "Dogecoin", "Solana", "Cardano",
            "Ripple", "Binance", "Tether", "Polkadot", "Litecoin",
            "Chainlink", "Stellar", "Monero", "Tron", "Cosmos",
            "Tezos", "IOTA", "Neo", "Dash", "Zcash",
            "Maker", "Aave", "Uniswap", "Sushi", "Compound",
            "Curve", "Yearn", "Polygon", "Avalanche", "Terra"
        ];
        console.log(`[Crypto] Restored game ${this.pin}. Players: ${this.players.length}`);
    }
    // Override State for Serialization
    serialize() {
        return {
            ...super.serialize(),
            players: this.players,
            hackState: this.hackState,
            passwordOptions: this.passwords
        };
    }
}
exports.CryptoHackEngine = CryptoHackEngine;
