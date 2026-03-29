import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Server } from "socket.io";
import { io as clientIo, type Socket as ClientSocket } from "socket.io-client";
import { registerGameSocketHandlers } from "../register-game-socket-handlers";
import type { GameSettings } from "../../types/game";

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

  handleEvent(): void {
    // no-op for integration wiring tests
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
      },
      gameManager: {
        getGame: (pin) => games.get(pin),
        createGame: (_mode, pin, hostId, _setId, settings) => {
          const game = new FakeGame(pin, hostId, settings);
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
      canAccessClassroom: async (userId, classId) =>
        (userId === "teacher-1" && classId === "class-1") ||
        (userId === "student-user-1" && classId === "class-1"),
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

    outsider.emit("classroom-update", {
      classId: "class-1",
      type: "BOARD_UPDATE",
      data: { action: "blocked" },
    });

    const updateDenied = await new Promise<{ message: string }>((resolve) => outsider.once("error", resolve));
    expect(updateDenied.message).toBe("Unauthorized classroom access");

    const noLeak = await Promise.race([
      new Promise((resolve) => teacher.once("classroom-event", resolve)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 50)),
    ]);
    expect(noLeak).toBeNull();

    teacher.disconnect();
    student.disconnect();
    outsider.disconnect();
  });
});
