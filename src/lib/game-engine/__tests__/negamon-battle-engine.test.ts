import { describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { NegamonBattleEngine } from "../negamon-battle-engine";
import type { NegamonBattlePlayer } from "../../types/game";

const mockIo = { to: () => ({ emit: vi.fn() }) } as unknown as Server;

const baseQuestion = {
    id: "q1",
    question: "2+2?",
    options: ["4", "5"] as string[],
    correctAnswer: 0,
};

function sock(id: string): Socket {
    return { id } as Socket;
}

function player(id: string, name: string): NegamonBattlePlayer {
    return {
        id,
        name,
        battleHp: 100,
        maxHp: 100,
        eliminated: false,
        isConnected: true,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
    };
}

describe("NegamonBattleEngine", () => {
    it("stores round answers by player name so reconnect (new socket id) cannot submit twice", () => {
        const engine = new NegamonBattleEngine("111111", "host", "set-1", {}, [baseQuestion], mockIo);
        const p = player("socket-a", "Alice");
        engine.addPlayer(p, sock("socket-a"));
        engine.addPlayer(player("socket-b", "Bob"), sock("socket-b"));
        engine.startGame();

        engine.handleEvent(
            "submit-negamon-answer",
            { pin: "111111", questionId: "q1", answerIndex: 0 },
            sock("socket-a")
        );

        const alice = engine.players.find((x) => x.name === "Alice")!;
        engine.handleReconnection(alice, sock("socket-a-new"));

        engine.handleEvent(
            "submit-negamon-answer",
            { pin: "111111", questionId: "q1", answerIndex: 0 },
            sock("socket-a-new")
        );

        const internal = engine as unknown as { roundAnswers: Map<string, unknown> };
        expect(internal.roundAnswers.size).toBe(1);
        expect(internal.roundAnswers.has("Alice")).toBe(true);
    });

    it("restore drops roundAnswers keys that are not current player names (e.g. legacy socket ids)", () => {
        const engine = new NegamonBattleEngine("222222", "host", "set-1", {}, [baseQuestion], mockIo);

        engine.restore({
            pin: "222222",
            hostId: "host",
            setId: "set-1",
            status: "PLAYING",
            settings: {},
            questions: [baseQuestion],
            players: [
                { ...player("", "X"), id: "", isConnected: false },
                { ...player("", "Y"), id: "", isConnected: false },
            ],
            state: {
                phase: "QUESTION",
                questionIndex: 0,
                roundIndex: 1,
                roundStartedAt: Date.now(),
                roundEndsAt: Date.now() + 60_000,
                betweenEndsAt: 0,
                currentQuestionId: "q1",
                roundAnswers: [
                    ["dead-socket-id", { answerIndex: 0, at: Date.now() }],
                    ["X", { answerIndex: 0, at: Date.now() }],
                ],
            },
        });

        const internal = engine as unknown as { roundAnswers: Map<string, unknown> };
        expect(internal.roundAnswers.has("dead-socket-id")).toBe(false);
        expect(internal.roundAnswers.has("X")).toBe(true);
        expect(internal.roundAnswers.size).toBe(1);
    });

    it("rejects submit when pin does not match the game room", () => {
        const engine = new NegamonBattleEngine("444444", "host", "set-1", {}, [baseQuestion], mockIo);
        engine.addPlayer(player("s1", "Only"), sock("s1"));
        engine.addPlayer(player("s2", "Other"), sock("s2"));
        engine.startGame();

        engine.handleEvent(
            "submit-negamon-answer",
            { pin: "wrong-pin", questionId: "q1", answerIndex: 0 },
            sock("s1")
        );

        const internal = engine as unknown as { roundAnswers: Map<string, unknown> };
        expect(internal.roundAnswers.size).toBe(0);
    });

    it("normalizes simultaneous damage so small lobbies do not wipe targets too fast", () => {
        const engine = new NegamonBattleEngine("333333", "host", "set-1", {}, [baseQuestion], mockIo);
        engine.addPlayer(player("s1", "A"), sock("s1"));
        engine.addPlayer(player("s2", "B"), sock("s2"));
        engine.addPlayer(player("s3", "C"), sock("s3"));
        engine.startGame();

        const b = engine.players.find((p) => p.name === "B")!;
        b.battleHp = 90;

        engine.handleEvent(
            "submit-negamon-answer",
            { pin: "333333", questionId: "q1", answerIndex: 0 },
            sock("s1")
        );
        engine.handleEvent(
            "submit-negamon-answer",
            { pin: "333333", questionId: "q1", answerIndex: 0 },
            sock("s3")
        );
        engine.handleEvent(
            "submit-negamon-answer",
            { pin: "333333", questionId: "q1", answerIndex: 1 },
            sock("s2")
        );

        const internal = engine as unknown as { roundEndsAt: number };
        internal.roundEndsAt = Date.now() - 1;

        engine.tick();

        expect(b.battleHp).toBe(32);
        expect(b.eliminated).toBe(false);
    });
});
