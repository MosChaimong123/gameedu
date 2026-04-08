import type { Server, Socket } from "socket.io";
import type { ClassroomSocketEventType } from "@/lib/authorization/resource-access";
import type { GameQuestion, GameSettings } from "../types/game";
import { logAuditEvent } from "@/lib/security/audit-log";
import { consumeRateLimit, consumeRateLimitWithStore } from "@/lib/security/rate-limit";

type GameMode = "GOLD_QUEST" | "CLASSIC" | "CRYPTO_HACK" | "NEGAMON_BATTLE";

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
  classroom: {
    findFirst: (args: {
      where: { id: string; teacherId: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

type RegisterHandlersDeps = {
  db: DbLike;
  gameManager: GameManagerLike;
  randomId?: () => string;
  resolveSocketUserId?: (socket: Socket) => Promise<string | null>;
  canHostQuestionSet?: (userId: string, setId: string) => Promise<boolean>;
  canAccessClassroom?: (userId: string, classId: string) => Promise<boolean>;
  canPublishClassroomEvent?: (
    userId: string,
    classId: string,
    eventType: ClassroomSocketEventType
  ) => Promise<boolean>;
  auditLog?: typeof logAuditEvent;
};

const allowedClassroomEventTypes = new Set<ClassroomSocketEventType>([
  "BOARD_UPDATE",
  "POINT_UPDATE",
]);

const defaultSettings: GameSettings = {
  winCondition: "TIME",
  timeLimitMinutes: 7,
  goldGoal: 1000000,
  allowLateJoin: true,
  showInstructions: true,
  useRandomNames: false,
  allowStudentAccounts: true,
} satisfies GameSettings;

const SOCKET_ERR_UNAUTHORIZED = "Unauthorized";
const SOCKET_ERR_UNAUTHORIZED_CLASSROOM_ACCESS = "Unauthorized classroom access";
const SOCKET_ERR_UNAUTHORIZED_CLASSROOM_EVENT = "Unauthorized classroom event";
const SOCKET_ERR_UNAUTHORIZED_QUESTION_SET = "Unauthorized question set access";

export function registerGameSocketHandlers(io: Server, deps: RegisterHandlersDeps): void {
  const {
    db,
    gameManager,
    randomId = () => crypto.randomUUID(),
    resolveSocketUserId = async () => null,
    canHostQuestionSet = async () => false,
    canAccessClassroom = async () => false,
    canPublishClassroomEvent = async () => false,
    auditLog = logAuditEvent,
  } = deps;

  io.on("connection", (socket) => {
    const joinedClassrooms = new Set<string>();

    socket.on(
      "create-game",
      async ({
        setId,
        settings,
        mode,
        rewardClassroomId,
      }: {
        setId?: string;
        settings?: Partial<GameSettings>;
        mode?: string;
        /** เฉพาะ Negamon — เซิร์ฟเวอร์ตรวจว่า host เป็นเจ้าของห้องก่อนเก็บใน settings */
        rewardClassroomId?: string;
      }) => {
        if (typeof setId !== "string" || setId.length === 0) {
          socket.emit("error", { message: "Invalid question set" });
          return;
        }

        const hostId = await resolveSocketUserId(socket);
        if (!hostId) {
          auditLog({
            action: "socket.game.create.denied",
            targetType: "questionSet",
            targetId: setId,
            metadata: { reason: "unauthorized_host", socketId: socket.id },
          });
          socket.emit("error", { message: SOCKET_ERR_UNAUTHORIZED });
          return;
        }

        if (!(await canHostQuestionSet(hostId, setId))) {
          auditLog({
            actorUserId: hostId,
            action: "socket.game.create.denied",
            targetType: "questionSet",
            targetId: setId,
            metadata: { reason: "unauthorized_question_set", socketId: socket.id },
          });
          socket.emit("error", { message: SOCKET_ERR_UNAUTHORIZED_QUESTION_SET });
          return;
        }

        let pin = Math.floor(100000 + Math.random() * 900000).toString();
        let attempts = 0;
        while (gameManager.getGame(pin) && attempts < 10) {
          pin = Math.floor(100000 + Math.random() * 900000).toString();
          attempts++;
        }

        try {
          const set = await db.questionSet.findUnique({
            where: { id: setId },
          });
          if (!set) {
            socket.emit("error", { message: "Set not found" });
            return;
          }

          const rawMode = (mode || "GOLD_QUEST") as string;
          const normalizedMode: GameMode =
            rawMode === "CRYPTO_HACK"
              ? "CRYPTO_HACK"
              : rawMode === "NEGAMON_BATTLE"
                ? "NEGAMON_BATTLE"
                : "GOLD_QUEST";

          const sanitized: Partial<GameSettings> =
            settings && typeof settings === "object" ? { ...settings } : {};
          delete (sanitized as Record<string, unknown>).negamonRewardClassroomId;

          let gameSettings: GameSettings = { ...defaultSettings, ...sanitized };

          if (
            normalizedMode === "NEGAMON_BATTLE" &&
            typeof rewardClassroomId === "string" &&
            rewardClassroomId.trim().length > 0
          ) {
            const classroom = await db.classroom.findFirst({
              where: { id: rewardClassroomId.trim(), teacherId: hostId },
              select: { id: true },
            });
            if (classroom) {
              gameSettings = { ...gameSettings, negamonRewardClassroomId: classroom.id };
            }
          }

          const game = gameManager.createGame(
            normalizedMode,
            pin,
            hostId,
            setId,
            gameSettings,
            set.questions as GameQuestion[],
            io
          );
          const hostReconnectToken = randomId();
          game.registerHostConnection(socket.id, hostReconnectToken);
          auditLog({
            actorUserId: hostId,
            action: "socket.game.created",
            targetType: "game",
            targetId: pin,
            metadata: {
              setId,
              gameMode: normalizedMode,
              socketId: socket.id,
              negamonRewardClassroomId: gameSettings.negamonRewardClassroomId ?? null,
            },
          });

          socket.join(pin);
          socket.emit("game-created", { pin, hostReconnectToken });
        } catch {
          socket.emit("error", { message: "Failed to load questions" });
        }
      }
    );

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

      if (
        game.status === "PLAYING" &&
        !existingPlayer &&
        game.gameMode === "NEGAMON_BATTLE"
      ) {
        socket.emit("error", {
          message: "Negamon Battle already started — new players cannot join mid-match",
        });
        return;
      }

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
    socket.on("submit-negamon-answer", (payload) => {
      const game = gameManager.findGameBySocket(socket.id);
      if (!game || game.gameMode !== "NEGAMON_BATTLE") return;

      const pin = payload?.pin;
      if (typeof pin !== "string" || pin.length === 0 || pin !== game.pin) {
        auditLog({
          action: "socket.negamon.answer.denied",
          targetType: "game",
          targetId: game.pin,
          status: "rejected",
          metadata: { reason: "invalid_pin", socketId: socket.id },
        });
        socket.emit("error", { message: "Invalid game code" });
        return;
      }

      const rateLimitOpts = {
        bucket: "negamon_submit_answer",
        key: socket.id,
        limit: 24,
        windowMs: 60_000,
      } as const;

      void (async () => {
        let rate: { allowed: boolean };
        try {
          rate = await consumeRateLimitWithStore(rateLimitOpts);
        } catch (err) {
          console.error("[socket] negamon_submit_answer rate limit store failed", err);
          rate = consumeRateLimit(rateLimitOpts);
        }

        if (!rate.allowed) {
          auditLog({
            action: "socket.negamon.answer.denied",
            targetType: "game",
            targetId: game.pin,
            status: "rejected",
            metadata: { reason: "rate_limited", socketId: socket.id },
          });
          socket.emit("error", { message: "Too many submissions. Slow down." });
          return;
        }

        const still = gameManager.findGameBySocket(socket.id);
        if (!still || still.gameMode !== "NEGAMON_BATTLE" || still.pin !== game.pin) return;

        still.handleEvent("submit-negamon-answer", payload, socket);
      })();
    });
    socket.on("use-interaction", (payload) => {
      const game = gameManager.findGameBySocket(socket.id);
      if (game) game.handleEvent("use-interaction", payload, socket);
    });

    socket.on("join-classroom", async (classId) => {
      if (typeof classId !== "string" || classId.length === 0) return;

      const userId = await resolveSocketUserId(socket);
      if (!userId || !(await canAccessClassroom(userId, classId))) {
        auditLog({
          actorUserId: userId,
          action: "socket.classroom.join.denied",
          targetType: "classroom",
          targetId: classId,
          metadata: { socketId: socket.id },
        });
        socket.emit("error", { message: SOCKET_ERR_UNAUTHORIZED_CLASSROOM_ACCESS });
        return;
      }

      socket.join(`classroom-${classId}`);
      joinedClassrooms.add(classId);
      auditLog({
        actorUserId: userId,
        action: "socket.classroom.joined",
        targetType: "classroom",
        targetId: classId,
        metadata: { socketId: socket.id },
      });
    });

    socket.on("leave-classroom", (classId) => {
      if (typeof classId === "string" && classId.length > 0) {
        socket.leave(`classroom-${classId}`);
        joinedClassrooms.delete(classId);
      }
    });

    socket.on("classroom-update", async (payload) => {
      const { classId, type } = payload || {};
      if (typeof classId !== "string" || classId.length === 0 || typeof type !== "string") {
        return;
      }

      if (!allowedClassroomEventTypes.has(type as ClassroomSocketEventType)) {
        auditLog({
          action: "socket.classroom.update.denied",
          targetType: "classroom",
          targetId: classId,
          metadata: { reason: "invalid_event_type", type, socketId: socket.id },
        });
        socket.emit("error", { message: "Invalid classroom event" });
        return;
      }

      const userId = await resolveSocketUserId(socket);
      if (!userId || !(await canAccessClassroom(userId, classId))) {
        auditLog({
          actorUserId: userId,
          action: "socket.classroom.update.denied",
          targetType: "classroom",
          targetId: classId,
          metadata: { reason: "unauthorized_classroom_access", type, socketId: socket.id },
        });
        socket.emit("error", { message: SOCKET_ERR_UNAUTHORIZED_CLASSROOM_ACCESS });
        return;
      }

      if (!joinedClassrooms.has(classId)) {
        auditLog({
          actorUserId: userId,
          action: "socket.classroom.update.denied",
          targetType: "classroom",
          targetId: classId,
          metadata: { reason: "not_joined", type, socketId: socket.id },
        });
        socket.emit("error", { message: "Join the classroom before sending updates" });
        return;
      }

      if (!(await canPublishClassroomEvent(userId, classId, type as ClassroomSocketEventType))) {
        auditLog({
          actorUserId: userId,
          action: "socket.classroom.update.denied",
          targetType: "classroom",
          targetId: classId,
          metadata: { reason: "unauthorized_event", type, socketId: socket.id },
        });
        socket.emit("error", { message: SOCKET_ERR_UNAUTHORIZED_CLASSROOM_EVENT });
        return;
      }

      const data =
        payload?.data ??
        Object.fromEntries(
          Object.entries(payload || {}).filter(([key]) => key !== "classId" && key !== "type")
        );

      socket.to(`classroom-${classId}`).emit("classroom-event", { type, data });
      auditLog({
        actorUserId: userId,
        action: "socket.classroom.updated",
        targetType: "classroom",
        targetId: classId,
        metadata: { type, socketId: socket.id },
      });
    });
  });
}
