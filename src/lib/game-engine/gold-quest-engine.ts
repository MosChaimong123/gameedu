
import { Socket } from "socket.io";
import { AbstractGameEngine } from "./abstract-game";
import { GoldQuestPlayer, GoldQuestSession, ChestReward, ClientEvents } from "../types/game";
import { generateChestReward } from "../game/gold-quest";

export class GoldQuestEngine extends AbstractGameEngine {
    public gameMode = "GOLD_QUEST";
    // Override players typing
    public declare players: GoldQuestPlayer[];

    constructor(
        pin: string,
        hostId: string,
        setId: string,
        settings: any,
        questions: any[],
        io: any
    ) {
        super(pin, hostId, setId, settings, questions, io);
    }

    public getPlayer(socketId: string): GoldQuestPlayer | undefined {
        return super.getPlayer(socketId) as GoldQuestPlayer | undefined;
    }

    public addPlayer(player: GoldQuestPlayer, socket: Socket): void {
        // Initialize specific Gold Quest properties
        player.gold = 0;
        player.multiplier = 1;
        player.streak = 0;
        player.correctAnswers = 0;
        player.incorrectAnswers = 0;
        super.addPlayer(player, socket);
    }

    public handleEvent(eventName: string, payload: any, socket: Socket): void {
        switch (eventName) {
            case "open-chest":
                this.handleOpenChest(socket);
                break;
            case "use-interaction":
                this.handleInteraction(socket, payload);
                break;
            case "submit-answer":
                this.handleSubmitAnswer(socket, payload);
                break;
            case "request-question":
                this.handleRequestQuestion(socket);
                break;
        }
    }

    public tick(): void {
        super.tick(); // Checks Time Limit

        // Check Gold Goal
        if (this.status === "PLAYING" && this.settings.winCondition === "GOLD") {
            const winner = this.players.find(p => p.gold >= this.settings.goldGoal);
            if (winner) {
                this.endGame();
            }
        }
    }

    // --- Specific Logic ---

    private handleOpenChest(socket: Socket) {
        if (this.status !== "PLAYING") return;
        const player = this.getPlayer(socket.id);
        if (!player) return;

        const reward = generateChestReward();
        let newTotal = player.gold;

        if (reward.type === "GOLD") {
            const amount = reward.value * player.multiplier;
            player.gold += amount;
            newTotal = player.gold;
            player.multiplier = 1;
        } else if (reward.type === "MULTIPLIER") {
            player.multiplier = reward.value;
        } else if (reward.type === "LOSE_GOLD") {
            const loss = Math.floor(player.gold * (reward.value / 100));
            player.gold = Math.max(0, player.gold - loss);
            newTotal = player.gold;
        }

        socket.emit("chest-result", { reward, newTotal });
        this.statusUpdate(); // Broadcast new scores
    }

    private handleInteraction(socket: Socket, payload: any) {
        const { targetId, type } = payload;
        const actor = this.getPlayer(socket.id);
        const victim = this.getPlayer(targetId);

        if (!actor || !victim) return;

        if (type === "SWAP") {
            const temp = actor.gold;
            actor.gold = victim.gold;
            victim.gold = temp;
            this.io.to(victim.id).emit("player-gold-update", { gold: victim.gold });
        } else if (type === "STEAL") {
            const stealPercent = 25; // Could be config
            const stealAmount = Math.floor(victim.gold * (stealPercent / 100));
            victim.gold -= stealAmount;
            actor.gold += stealAmount;
            this.io.to(victim.id).emit("player-gold-update", { gold: victim.gold });
        }

        this.io.to(actor.id).emit("player-gold-update", { gold: actor.gold });

        // Broadcast effect event for feed
        this.io.to(this.pin).emit("interaction-effect", {
            source: actor.name,
            target: victim.name,
            type,
            amount: 0
        });

        this.statusUpdate();
    }

    private handleSubmitAnswer(socket: Socket, payload: any) {
        const { questionId, answerIndex } = payload;
        const question = this.questions.find(q => q.id === questionId);

        if (!question) return;

        const isCorrect = question.correctAnswer === answerIndex;

        const player = this.getPlayer(socket.id);
        if (player) {
            if (isCorrect) {
                player.correctAnswers = (player.correctAnswers || 0) + 1;
            } else {
                player.incorrectAnswers = (player.incorrectAnswers || 0) + 1;
            }
        }

        socket.emit("answer-result", { correct: isCorrect });
    }

    // Track seen questions per player: Name -> Set<questionId>
    // Changed from socket.id to Name to persist across refreshes/reconnects
    private seenQuestions = new Map<string, Set<string>>();

    private handleRequestQuestion(socket: Socket) {
        if (!this.questions || this.questions.length === 0) return;

        const player = this.getPlayer(socket.id);
        const key = player ? player.name : socket.id;

        // Initialize set if not exists
        if (!this.seenQuestions.has(key)) {
            this.seenQuestions.set(key, new Set());
        }

        const seen = this.seenQuestions.get(key)!;

        // Filter available questions
        const available = this.questions.filter(q => !seen.has(q.id));

        let q: any;

        if (available.length > 0) {
            // Pick a random available question
            q = available[Math.floor(Math.random() * available.length)];
        } else {
            // All questions seen! Reset tracking loop.
            console.log(`[Quest] Player ${key} has seen all questions. Resetting loop.`);
            seen.clear();
            // Pick random from FULL list
            q = this.questions[Math.floor(Math.random() * this.questions.length)];
        }

        // Mark as seen
        seen.add(q.id);

        socket.emit("next-question", {
            id: q.id,
            question: q.question,
            options: q.options,
            timeLimit: q.timeLimit,
            image: q.image
        });
    }

    public override endGame() {
        // Sync gold to generic score for history/leaderboards
        this.players.forEach(p => {
            p.score = p.gold;
        });

        // Sort players before sending
        this.players.sort((a, b) => b.gold - a.gold);
        super.endGame();
    }

    // --- Persistence ---

    public override serialize(): any {
        const base = super.serialize();
        return {
            ...base,
            gameMode: "GOLD_QUEST",
            // No extra global state for now, but good hook for later
            state: {}
        };
    }

    public override restore(data: any): void {
        super.restore(data);
        // Any specific state restoration can go here
        // Players are already restored by base
    }
}
