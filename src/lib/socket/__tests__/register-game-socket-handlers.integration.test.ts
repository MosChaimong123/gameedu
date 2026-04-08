import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Server } from "socket.io";
import { io as clientIo, type Socket as ClientSocket } from "socket.io-client";
import { registerGameSocketHandlers } from "../register-game-socket-handlers";
import type { GameSettings } from "../../types/game";
import { resetRateLimitStore } from "../../security/rate-limit";

class FakeGame {
  public pin: string;
  public hostId: string;
  public gameMode = "GOLD_QUEST";
  public status: "LOBBY" | "PLAYING" | "ENDED" = "LOBBY";
  public settings: Partial<GameSettings>;
  public players: Array<{ id: string; name: string; isConnected: boolean }> = [];
  public startTime?: number;
  private hostSocketId?: string;
  private hostReconnectToken?: string;
  private playerReconnectTokens = new Map<string, string>();
  public startGameCalls = 0;
  public endGameCalls = 0;
  public handleEventCalls: Array<{ event: string; payload: unknown; socketId: string }> = [];

  constructor(pin: string, hostId: string, settings: Partial<GameSettings>) {
    this.pin = pin;
    this.hostId = hostId;
    this.settings = settings;
  }

  registerHostConnection(socketId: string, reconnectToken: string): void {
    this.hostSocketId = socketId;
    this.hostReconnectToken = reconnectToken;
  }

  reconnectHost(socketId: string, reconnectToken: string): boolean {
    if (reconnectToken !== this.hostReconnectToken) return false;
    this.hostSocketId = socketId;
    return true;
  }

  isHostSocket(socketId: string): boolean {
    return socketId === this.hostSocketId;
  }

  registerPlayerReconnectToken(playerName: string, reconnectToken: string): void {
    this.playerReconnectTokens.set(playerName, reconnectToken);
  }

  getPlayerReconnectToken(playerName: string): string | undefined {
    return this.playerReconnectTokens.get(playerName);
  }

  canReconnectPlayer(playerName: string, reconnectToken?: string): boolean {
    return !!reconnectToken && reconnectToken === this.playerReconnectTokens.get(playerName);
  }

  addPlayer(player: { id?: string; name: string; isConnected?: boolean }, socket: { id: string }): void {
    const nextPlayer = {
      id: player.id ?? socket.id,
      name: player.name,
      isConnected: player.isConnected ?? true,
    };
    this.players.push(nextPlayer);
  }

  handleReconnection(player: { id?: string; name: string; isConnected?: boolean }, socket: { id: string }): void {
    player.id = socket.id;
    player.isConnected = true;
  }

  removePlayer(socketId: string): void {
    const player = this.players.find((entry) => entry.id === socketId);
    if (player) {
      this.playerReconnectTokens.delete(player.name);
    }
    this.players = this.players.filter((entry) => entry.id !== socketId);
  }

  handleDisconnect(socketId: string): void {
    const player = this.players.find((entry) => entry.id === socketId);
    if (player) {
      player.isConnected = false;
    }
  }

  startGame(): void {
    this.startGameCalls += 1;
    this.status = "PLAYING";
    this.startTime = Date.now();
  }

  endGame(): void {
    this.endGameCalls += 1;
    this.status = "ENDED";
  }

  handleEvent(eventName: string, payload: unknown, socket: { id: string }): void {
    this.handleEventCalls.push({ event: eventName, payload, socketId: socket.id });
  }

  serialize(): Record<string, unknown> {
    return {
      players: this.players,
      settings: this.settings,
      gameMode: this.gameMode,
    };
  }
}

describe("registerGameSocketHandlers integration", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let port: number;
  let games: Map<string, FakeGame>;
  let auditEvents: Array<Record<string, unknown>>;

  const connectClient = async (userId?: string): Promise<ClientSocket> =>
    await new Promise((resolve, reject) => {
      const socket = clientIo(`http://127.0.0.1:${port}`, {
        path: "/socket.io",
        addTrailingSlash: false,
        transports: ["websocket"],
        auth: userId ? { userId } : undefined,
      });

      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", reject);
    });

  beforeEach(async () => {
    games = new Map();
    auditEvents = [];
    httpServer = createServer();
    io = new Server(httpServer, {
      path: "/socket.io",
      addTrailingSlash: false,
    });

    registerGameSocketHandlers(io, {
      db: {
        questionSet: {
          findUnique: async ({ where }) => ({
            id: where.id,
            title: "Test Set",
            questions: [],
          }),
        },
        classroom: {
          findFirst: async () => null,
        },
      },
      gameManager: {
        getGame: (pin) => games.get(pin),
        createGame: (mode, pin, hostId, _setId, settings) => {
          const game = new FakeGame(pin, hostId, settings);
          game.gameMode = mode;
          games.set(pin, game);
          return game;
        },
        findGameBySocket: (socketId) => {
          for (const game of games.values()) {
            if (game.players.some((player) => player.id === socketId)) {
              return game;
            }
          }
          return undefined;
        },
        findGameByHostSocket: (socketId) => {
          for (const game of games.values()) {
            if (game.isHostSocket(socketId)) {
              return game;
            }
          }
          return undefined;
        },
      },
      randomId: (() => {
        let sequence = 0;
        return () => `token-${++sequence}`;
      })(),
      resolveSocketUserId: async (socket) => {
        const userId = socket.handshake.auth.userId;
        return typeof userId === "string" ? userId : null;
      },
      canHostQuestionSet: async (userId, setId) => {
        if (userId === "admin-1") {
          return true;
        }

        return userId === "teacher-1" && setId === "set-1";
      },
      canAccessClassroom: async (userId, classId) =>
        (userId === "teacher-1" && classId === "class-1") ||
        (userId === "student-user-1" && classId === "class-1"),
      canPublishClassroomEvent: async (userId, classId, eventType) => {
        if (classId !== "class-1") {
          return false;
        }

        if (eventType === "POINT_UPDATE") {
          return userId === "teacher-1";
        }

        return userId === "teacher-1" || userId === "student-user-1";
      },
      auditLog: (event) => {
        auditEvents.push(event as Record<string, unknown>);
      },
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => {
        const address = httpServer.address();
        if (!address || typeof address === "string") {
          throw new Error("Failed to bind test socket server");
        }
        port = address.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  it("supports join -> disconnect -> reconnect -> leave for players with issued tokens", async () => {
    const host = await connectClient("teacher-1");
    host.emit("create-game", { setId: "set-1", hostId: "spoofed-host", settings: { allowLateJoin: true }, mode: "GOLD_QUEST" });
    const gameCreated = await new Promise<{ pin: string }>((resolve) => host.once("game-created", resolve));

    const player = await connectClient();
    player.emit("join-game", { pin: gameCreated.pin, nickname: "Alice" });
    const joined = await new Promise<{ reconnectToken: string }>((resolve) => player.once("joined-success", resolve));

    expect(joined.reconnectToken).toBe("token-2");
    expect(games.get(gameCreated.pin)?.hostId).toBe("teacher-1");

    player.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const reconnectedPlayer = await connectClient();
    reconnectedPlayer.emit("join-game", {
      pin: gameCreated.pin,
      nickname: "Alice",
      reconnectToken: joined.reconnectToken,
    });

    const rejoined = await new Promise<{ reconnectToken: string }>((resolve) => reconnectedPlayer.once("joined-success", resolve));
    expect(rejoined.reconnectToken).toBe(joined.reconnectToken);

    const game = games.get(gameCreated.pin);
    expect(game?.players).toHaveLength(1);
    expect(game?.players[0]?.isConnected).toBe(true);

    reconnectedPlayer.emit("leave-game", { pin: gameCreated.pin });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(game?.players).toHaveLength(0);
    expect(game?.getPlayerReconnectToken("Alice")).toBeUndefined();

    host.disconnect();
    reconnectedPlayer.disconnect();
  });

  it("allows only the host socket to start the game and supports host reconnect", async () => {
    const host = await connectClient("teacher-1");
    host.emit("create-game", { setId: "set-1", hostId: "spoofed-host", settings: { allowLateJoin: true }, mode: "GOLD_QUEST" });
    const gameCreated = await new Promise<{ pin: string; hostReconnectToken: string }>((resolve) => host.once("game-created", resolve));

    const player = await connectClient();
    player.emit("join-game", { pin: gameCreated.pin, nickname: "Bob" });
    await new Promise((resolve) => player.once("joined-success", resolve));

    player.emit("start-game", { pin: gameCreated.pin });
    const denied = await new Promise<{ message: string }>((resolve) => player.once("error", resolve));
    expect(denied.message).toBe("Only the host can start the game");

    host.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const reconnectedHost = await connectClient();
    reconnectedHost.emit("reconnect-host", {
      pin: gameCreated.pin,
      reconnectToken: gameCreated.hostReconnectToken,
    });

    await new Promise((resolve) => reconnectedHost.once("host-reconnected", resolve));
    reconnectedHost.emit("start-game", { pin: gameCreated.pin });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const game = games.get(gameCreated.pin);
    expect(game?.startGameCalls).toBe(1);
    expect(game?.status).toBe("PLAYING");

    reconnectedHost.disconnect();
    player.disconnect();
  });

  it("rejects create-game when the socket is not backed by an authenticated host session", async () => {
    const host = await connectClient();

    host.emit("create-game", {
      setId: "set-1",
      hostId: "spoofed-host",
      settings: { allowLateJoin: true },
      mode: "GOLD_QUEST",
    });

    const denied = await new Promise<{ message: string }>((resolve) => host.once("error", resolve));
    expect(denied.message).toBe("Unauthorized");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "socket.game.create.denied",
        metadata: expect.objectContaining({ reason: "unauthorized_host" }),
      })
    );

    host.disconnect();
  });

  it("rejects create-game when the host does not own the requested set", async () => {
    const host = await connectClient("teacher-1");

    host.emit("create-game", {
      setId: "set-owned-by-someone-else",
      hostId: "spoofed-host",
      settings: { allowLateJoin: true },
      mode: "GOLD_QUEST",
    });

    const denied = await new Promise<{ message: string }>((resolve) => host.once("error", resolve));
    expect(denied.message).toBe("Unauthorized question set access");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        actorUserId: "teacher-1",
        action: "socket.game.create.denied",
        metadata: expect.objectContaining({ reason: "unauthorized_question_set" }),
      })
    );

    host.disconnect();
  });

  it("allows only classroom members to join and broadcast classroom events", async () => {
    const teacher = await connectClient("teacher-1");
    const student = await connectClient("student-user-1");
    const outsider = await connectClient("outsider-user");

    teacher.emit("join-classroom", "class-1");
    student.emit("join-classroom", "class-1");
    outsider.emit("join-classroom", "class-1");

    const outsiderDenied = await new Promise<{ message: string }>((resolve) => outsider.once("error", resolve));
    expect(outsiderDenied.message).toBe("Unauthorized classroom access");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        actorUserId: "teacher-1",
        action: "socket.classroom.joined",
        targetId: "class-1",
      })
    );
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        actorUserId: "student-user-1",
        action: "socket.classroom.joined",
        targetId: "class-1",
      })
    );
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "socket.classroom.join.denied",
        targetId: "class-1",
      })
    );

    const teacherReceived = new Promise<{ type: string; data: { action: string } }>((resolve) =>
      teacher.once("classroom-event", resolve)
    );

    student.emit("classroom-update", {
      classId: "class-1",
      type: "BOARD_UPDATE",
      data: { action: "allowed" },
    });

    const classroomEvent = await teacherReceived;
    expect(classroomEvent).toEqual({
      type: "BOARD_UPDATE",
      data: { action: "allowed" },
    });
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        actorUserId: "student-user-1",
        action: "socket.classroom.updated",
        targetId: "class-1",
        metadata: expect.objectContaining({ type: "BOARD_UPDATE" }),
      })
    );

    outsider.emit("classroom-update", {
      classId: "class-1",
      type: "BOARD_UPDATE",
      data: { action: "blocked" },
    });

    const updateDenied = await new Promise<{ message: string }>((resolve) => outsider.once("error", resolve));
    expect(updateDenied.message).toBe("Unauthorized classroom access");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "socket.classroom.update.denied",
        targetId: "class-1",
        metadata: expect.objectContaining({ reason: "unauthorized_classroom_access" }),
      })
    );

    const noLeak = await Promise.race([
      new Promise((resolve) => teacher.once("classroom-event", resolve)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 50)),
    ]);
    expect(noLeak).toBeNull();

    teacher.disconnect();
    student.disconnect();
    outsider.disconnect();
  });

  it("rejects invalid classroom event types and point updates from non-teachers", async () => {
    const teacher = await connectClient("teacher-1");
    const student = await connectClient("student-user-1");

    teacher.emit("join-classroom", "class-1");
    student.emit("join-classroom", "class-1");

    student.emit("classroom-update", {
      classId: "class-1",
      type: "POINT_UPDATE",
      data: { studentId: "student-1", behaviorPoints: 99 },
    });

    const pointDenied = await new Promise<{ message: string }>((resolve) => student.once("error", resolve));
    expect(pointDenied.message).toBe("Unauthorized classroom event");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        actorUserId: "student-user-1",
        action: "socket.classroom.update.denied",
        targetId: "class-1",
        metadata: expect.objectContaining({ reason: "unauthorized_event", type: "POINT_UPDATE" }),
      })
    );

    student.emit("classroom-update", {
      classId: "class-1",
      type: "FAKE_EVENT",
      data: { noop: true },
    });

    const invalidDenied = await new Promise<{ message: string }>((resolve) => student.once("error", resolve));
    expect(invalidDenied.message).toBe("Invalid classroom event");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "socket.classroom.update.denied",
        targetId: "class-1",
        metadata: expect.objectContaining({ reason: "invalid_event_type", type: "FAKE_EVENT" }),
      })
    );

    const studentReceived = new Promise<{
      type: string;
      data: { studentId: string; behaviorPoints: number };
    }>((resolve) => student.once("classroom-event", resolve));

    teacher.emit("classroom-update", {
      classId: "class-1",
      type: "POINT_UPDATE",
      data: { studentId: "student-1", behaviorPoints: 77 },
    });

    await expect(studentReceived).resolves.toEqual({
      type: "POINT_UPDATE",
      data: { studentId: "student-1", behaviorPoints: 77 },
    });

    teacher.disconnect();
    student.disconnect();
  });

  it("requires sockets to join the classroom before they can broadcast updates", async () => {
    const teacher = await connectClient("teacher-1");

    teacher.emit("classroom-update", {
      classId: "class-1",
      type: "BOARD_UPDATE",
      data: { action: "before-join" },
    });

    const denied = await new Promise<{ message: string }>((resolve) => teacher.once("error", resolve));
    expect(denied.message).toBe("Join the classroom before sending updates");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        actorUserId: "teacher-1",
        action: "socket.classroom.update.denied",
        targetId: "class-1",
        metadata: expect.objectContaining({ reason: "not_joined" }),
      })
    );

    teacher.disconnect();
  });

  it("forwards submit-negamon-answer to the game engine when pin matches NEGAMON_BATTLE room", async () => {
    const host = await connectClient("teacher-1");
    host.emit("create-game", {
      setId: "set-1",
      hostId: "spoofed-host",
      settings: { allowLateJoin: true },
      mode: "NEGAMON_BATTLE",
    });
    const gameCreated = await new Promise<{ pin: string }>((resolve) => host.once("game-created", resolve));

    const player = await connectClient();
    player.emit("join-game", { pin: gameCreated.pin, nickname: "NegAlice" });
    await new Promise<void>((resolve) => player.once("joined-success", () => resolve()));

    host.emit("start-game", { pin: gameCreated.pin });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const game = games.get(gameCreated.pin);
    expect(game?.status).toBe("PLAYING");
    expect(game?.gameMode).toBe("NEGAMON_BATTLE");

    player.emit("submit-negamon-answer", {
      pin: gameCreated.pin,
      questionId: "q1",
      answerIndex: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(game?.handleEventCalls).toEqual([
      expect.objectContaining({
        event: "submit-negamon-answer",
        payload: expect.objectContaining({
          pin: gameCreated.pin,
          questionId: "q1",
          answerIndex: 0,
        }),
        socketId: player.id,
      }),
    ]);

    host.disconnect();
    player.disconnect();
  });

  it("rejects Negamon submit with wrong pin and emits audit", async () => {
    const host = await connectClient("teacher-1");
    host.emit("create-game", {
      setId: "set-1",
      hostId: "spoofed-host",
      settings: { allowLateJoin: true },
      mode: "NEGAMON_BATTLE",
    });
    const gameCreated = await new Promise<{ pin: string }>((resolve) => host.once("game-created", resolve));

    const player = await connectClient();
    player.emit("join-game", { pin: gameCreated.pin, nickname: "BobNeg" });
    await new Promise<void>((resolve) => player.once("joined-success", () => resolve()));

    host.emit("start-game", { pin: gameCreated.pin });
    await new Promise((resolve) => setTimeout(resolve, 20));

    player.emit("submit-negamon-answer", {
      pin: "wrong-pin",
      questionId: "q1",
      answerIndex: 0,
    });

    const err = await new Promise<{ message: string }>((resolve) => player.once("error", resolve));
    expect(err.message).toBe("Invalid game code");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "socket.negamon.answer.denied",
        targetId: gameCreated.pin,
        metadata: expect.objectContaining({ reason: "invalid_pin" }),
      })
    );

    host.disconnect();
    player.disconnect();
  });

  it("rejects new join to NEGAMON_BATTLE while PLAYING", async () => {
    const host = await connectClient("teacher-1");
    host.emit("create-game", {
      setId: "set-1",
      hostId: "spoofed-host",
      settings: { allowLateJoin: true },
      mode: "NEGAMON_BATTLE",
    });
    const gameCreated = await new Promise<{ pin: string }>((resolve) => host.once("game-created", resolve));

    const p1 = await connectClient();
    p1.emit("join-game", { pin: gameCreated.pin, nickname: "P1" });
    await new Promise<void>((resolve) => p1.once("joined-success", () => resolve()));

    host.emit("start-game", { pin: gameCreated.pin });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const p2 = await connectClient();
    p2.emit("join-game", { pin: gameCreated.pin, nickname: "Latecomer" });

    const denied = await new Promise<{ message: string }>((resolve) => p2.once("error", resolve));
    expect(denied.message).toBe("Negamon Battle already started — new players cannot join mid-match");

    host.disconnect();
    p1.disconnect();
    p2.disconnect();
  });

  it("rate-limits submit-negamon-answer and audits denial", async () => {
    resetRateLimitStore();

    const host = await connectClient("teacher-1");
    host.emit("create-game", {
      setId: "set-1",
      hostId: "spoofed-host",
      settings: { allowLateJoin: true },
      mode: "NEGAMON_BATTLE",
    });
    const gameCreated = await new Promise<{ pin: string }>((resolve) => host.once("game-created", resolve));

    const player = await connectClient();
    player.emit("join-game", { pin: gameCreated.pin, nickname: "Spammer" });
    await new Promise<void>((resolve) => player.once("joined-success", () => resolve()));

    host.emit("start-game", { pin: gameCreated.pin });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const payload = { pin: gameCreated.pin, questionId: "q1", answerIndex: 0 };
    for (let i = 0; i < 24; i++) {
      player.emit("submit-negamon-answer", payload);
    }
    await new Promise((resolve) => setTimeout(resolve, 30));

    const game = games.get(gameCreated.pin);
    expect(game?.handleEventCalls.length).toBe(24);

    player.emit("submit-negamon-answer", payload);
    const rateErr = await new Promise<{ message: string }>((resolve) => player.once("error", resolve));
    expect(rateErr.message).toBe("Too many submissions. Slow down.");
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "socket.negamon.answer.denied",
        metadata: expect.objectContaining({ reason: "rate_limited" }),
      })
    );

    host.disconnect();
    player.disconnect();
  });
});
