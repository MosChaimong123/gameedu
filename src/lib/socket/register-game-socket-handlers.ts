import type { Server, Socket } from "socket.io";
import type { GameQuestion, GameSettings } from "../types/game";

type GameMode = "GOLD_QUEST" | "CLASSIC" | "CRYPTO_HACK";

type SocketPlayerPayload = {
  id?: string;
  name: string;
  avatar?: string;
  isConnected?: boolean;
  score?: number;
};

type GameLike = {
  pin: string;
  hostId: string;
  gameMode: string;
  status: "LOBBY" | "PLAYING" | "ENDED";
  settings: Partial<GameSettings>;
  players: Array<{ id: string; name: string; isConnected?: boolean }>;
  startTime?: number;
  registerHostConnection: (socketId: string, reconnectToken: string) => void;
  reconnectHost: (socketId: string, reconnectToken: string) => boolean;
  isHostSocket: (socketId: string) => boolean;
  registerPlayerReconnectToken: (playerName: string, reconnectToken: string) => void;
  getPlayerReconnectToken: (playerName: string) => string | undefined;
  canReconnectPlayer: (playerName: string, reconnectToken?: string) => boolean;
  addPlayer: (player: SocketPlayerPayload, socket: Socket) => void;
  handleReconnection: (player: SocketPlayerPayload, socket: Socket) => void;
  startGame: () => void;
  endGame: () => void;
  removePlayer: (socketId: string) => void;
  handleDisconnect: (socketId: string) => void;
  handleEvent: (eventName: string, payload: unknown, socket: Socket) => void;
  serialize: () => unknown;
};

type GameManagerLike = {
  getGame: (pin: string) => GameLike | undefined;
  createGame: (
    mode: GameMode,
    pin: string,
    hostId: string,
    setId: string,
    settings: GameSettings,
    questions: GameQuestion[],
    io: Server
  ) => GameLike;
  findGameBySocket: (socketId: string) => GameLike | undefined;
  findGameByHostSocket: (socketId: string) => GameLike | undefined;
};

type DbLike = {
  questionSet: {
    findUnique: (args: { where: { id: string } }) => Promise<{ questions: unknown } | null>;
  };
};

type RegisterHandlersDeps = {
  db: DbLike;
  gameManager: GameManagerLike;
  randomId?: () => string;
  resolveSocketUserId?: (socket: Socket) => Promise<string | null>;
  canAccessClassroom?: (userId: string, classId: string) => Promise<boolean>;
};

const defaultSettings: GameSettings = {
  winCondition: "TIME",
  timeLimitMinutes: 7,
  goldGoal: 1000000,
  allowLateJoin: true,
  showInstructions: true,
  useRandomNames: false,
  allowStudentAccounts: true,
} satisfies GameSettings;

export function registerGameSocketHandlers(io: Server, deps: RegisterHandlersDeps): void {
  const {
    db,
    gameManager,
    randomId = () => crypto.randomUUID(),
    resolveSocketUserId = async () => null,
    canAccessClassroom = async () => false,
  } = deps;

  io.on("connection", (socket) => {
    socket.on("create-game", async ({ setId, settings, mode }) => {
      const hostId = await resolveSocketUserId(socket);
      if (!hostId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      let pin = Math.floor(100000 + Math.random() * 900000).toString();
      let attempts = 0;
      while (gameManager.getGame(pin) && attempts < 10) {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        attempts++;
      }

      db.questionSet.findUnique({
        where: { id: setId },
      }).then((set) => {
        if (!set) {
          socket.emit("error", { message: "Set not found" });
          return;
        }

        const rawMode = (mode || "GOLD_QUEST") as string;
        const normalizedMode: GameMode =
          rawMode === "CRYPTO_HACK" ? "CRYPTO_HACK" : "GOLD_QUEST";

        const game = gameManager.createGame(
          normalizedMode,
          pin,
          hostId,
          setId,
          settings || defaultSettings,
          set.questions as GameQuestion[],
          io
        );
        const hostReconnectToken = randomId();
        game.registerHostConnection(socket.id, hostReconnectToken);

        socket.join(pin);
        socket.emit("game-created", { pin, hostReconnectToken });
      }).catch(() => {
        socket.emit("error", { message: "Failed to load questions" });
      });
    });

    socket.on("reconnect-host", ({ pin, reconnectToken }) => {
      const game = gameManager.getGame(pin);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      if (!game.reconnectHost(socket.id, reconnectToken)) {
        socket.emit("error", { message: "Host reconnection denied" });
        return;
      }

      socket.join(pin);
      socket.emit("host-reconnected", {
        pin,
        gameMode: game.gameMode,
        status: game.status,
      });

      if (game.status === "PLAYING") {
        socket.emit("game-started", {
          startTime: game.startTime,
          settings: game.settings,
          gameMode: game.gameMode,
        });
        socket.emit("game-state-update", game.serialize());
      } else if (game.status === "ENDED") {
        socket.emit("game-over", { players: game.players });
      }
    });

    socket.on("join-game", ({ pin, nickname, reconnectToken }) => {
      const game = gameManager.getGame(pin);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      if (game.status !== "LOBBY" && !game.settings.allowLateJoin) {
        socket.emit("error", { message: "Game is locked" });
        return;
      }

      const existingPlayer = game.players.find((player) => player.name === nickname);
      if (existingPlayer) {
        if (!game.canReconnectPlayer(nickname, reconnectToken)) {
          socket.emit("error", { message: "Nickname already in use" });
          return;
        }

        game.handleReconnection(existingPlayer, socket);
        socket.join(pin);
        socket.emit("joined-success", {
          pin,
          nickname,
          gameMode: game.gameMode,
          reconnectToken: game.getPlayerReconnectToken(nickname),
        });
        return;
      }

      if (nickname === "HOST") return;

      const newReconnectToken = randomId();
      socket.join(pin);
      game.registerPlayerReconnectToken(nickname, newReconnectToken);
      game.addPlayer({
        id: socket.id,
        name: nickname,
        isConnected: true,
        score: 0,
      }, socket);

      socket.emit("joined-success", {
        pin,
        nickname,
        gameMode: game.gameMode,
        reconnectToken: newReconnectToken,
      });

      if (game.status === "PLAYING") {
        socket.emit("game-started", {
          startTime: game.startTime,
          settings: game.settings,
          gameMode: game.gameMode,
        });
        socket.emit("game-state-update", game.serialize());
      }
    });

    socket.on("get-game-state", ({ pin }) => {
      const game = gameManager.getGame(pin);
      if (!game) return;

      if (game.status === "PLAYING") {
        socket.emit("game-started", {
          startTime: game.startTime,
          settings: game.settings,
          gameMode: game.gameMode,
        });
        socket.emit("game-state-update", game.serialize());
      } else if (game.status === "ENDED") {
        socket.emit("game-over", { players: game.players });
      }
    });

    socket.on("start-game", ({ pin }) => {
      const game = gameManager.getGame(pin);
      if (!game) return;
      if (!game.isHostSocket(socket.id)) {
        socket.emit("error", { message: "Only the host can start the game" });
        return;
      }
      game.startGame();
    });

    socket.on("end-game", ({ pin }) => {
      const game = gameManager.getGame(pin);
      if (!game) return;
      if (!game.isHostSocket(socket.id)) {
        socket.emit("error", { message: "Only the host can end the game" });
        return;
      }
      game.endGame();
    });

    socket.on("leave-game", ({ pin }) => {
      const game = gameManager.getGame(pin);
      if (game) {
        game.removePlayer(socket.id);
        socket.leave(pin);
      }
    });

    socket.on("disconnect", () => {
      const playerGame = gameManager.findGameBySocket(socket.id);
      if (playerGame) {
        playerGame.handleDisconnect(socket.id);
        return;
      }

      gameManager.findGameByHostSocket(socket.id);
    });

    const forwardToGame = (eventName: string, payload: { pin?: string }) => {
      const pin = payload.pin;
      if (!pin) return;
      const game = gameManager.getGame(pin);
      if (game) game.handleEvent(eventName, payload, socket);
    };

    socket.on("open-chest", (payload) => forwardToGame("open-chest", payload));
    socket.on("request-question", (payload) => forwardToGame("request-question", payload));
    socket.on("submit-answer", (payload) => forwardToGame("submit-answer", payload));
    socket.on("select-password", (payload) => forwardToGame("select-password", payload));
    socket.on("request-hack-options", (payload) => forwardToGame("request-hack-options", payload));
    socket.on("attempt-hack", (payload) => forwardToGame("attempt-hack", payload));

    socket.on("request-rewards", (payload) => {
      const game = gameManager.findGameBySocket(socket.id);
      if (game) game.handleEvent("request-rewards", payload, socket);
    });
    socket.on("select-box", (payload) => {
      const game = gameManager.findGameBySocket(socket.id);
      if (game) game.handleEvent("select-box", payload, socket);
    });
    socket.on("task-complete", (payload) => {
      const game = gameManager.findGameBySocket(socket.id);
      if (game) game.handleEvent("task-complete", payload, socket);
    });
    socket.on("use-interaction", (payload) => {
      const game = gameManager.findGameBySocket(socket.id);
      if (game) game.handleEvent("use-interaction", payload, socket);
    });

    socket.on("join-classroom", async (classId) => {
      if (!classId) return;

      const userId = await resolveSocketUserId(socket);
      if (!userId || !(await canAccessClassroom(userId, classId))) {
        socket.emit("error", { message: "Unauthorized classroom access" });
        return;
      }

      socket.join(`classroom-${classId}`);
    });

    socket.on("leave-classroom", (classId) => {
      if (classId) {
        socket.leave(`classroom-${classId}`);
      }
    });

    socket.on("classroom-update", async (payload) => {
      const { classId, type } = payload || {};
      if (!classId || !type) return;

      const userId = await resolveSocketUserId(socket);
      if (!userId || !(await canAccessClassroom(userId, classId))) {
        socket.emit("error", { message: "Unauthorized classroom access" });
        return;
      }

      const data =
        payload?.data ??
        Object.fromEntries(
          Object.entries(payload || {}).filter(([key]) => key !== "classId" && key !== "type")
        );

      socket.to(`classroom-${classId}`).emit("classroom-event", { type, data });
    });
  });
}
