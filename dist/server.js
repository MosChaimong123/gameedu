"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const manager_1 = require("./src/lib/game-engine/manager");
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = (0, next_1.default)({ dev, hostname, port });
const handler = app.getRequestHandler();
app.prepare().then(async () => {
    // Attempt to recover active games from DB
    await manager_1.gameManager.recoverGames();
    const httpServer = (0, node_http_1.createServer)((req, res) => {
        var _a;
        if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith("/socket.io")) {
            return;
        }
        handler(req, res);
    });
    const io = new socket_io_1.Server(httpServer, {
        path: "/socket.io",
        addTrailingSlash: false,
        cors: { origin: "*" }
    });
    // Inject IO into Game Manager (Critical for recovered games)
    manager_1.gameManager.setIO(io);
    io.on("connection", (socket) => {
        // --- Host Creating Game ---
        socket.on("create-game", ({ setId, hostId, settings, mode }) => {
            // ... (Generate Pin)
            let pin = Math.floor(100000 + Math.random() * 900000).toString();
            // ... (Collision check)
            let attempts = 0;
            while (manager_1.gameManager.getGame(pin) && attempts < 10) {
                pin = Math.floor(100000 + Math.random() * 900000).toString();
                attempts++;
            }
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient();
            prisma.questionSet.findUnique({
                where: { id: setId },
            }).then((set) => {
                if (!set) {
                    socket.emit("error", { message: "Set not found" });
                    return;
                }
                const game = manager_1.gameManager.createGame(mode || "GOLD_QUEST", pin, hostId, setId, settings || {
                    winCondition: "TIME",
                    timeLimitMinutes: 7,
                    goldGoal: 1000000,
                    allowLateJoin: true,
                    showInstructions: true,
                    useRandomNames: false,
                    allowStudentAccounts: true
                }, set.questions, io);
                socket.join(pin); // Host joins "room" pin
                socket.emit("game-created", { pin });
                console.log(`Game created: ${pin} for Set: ${set.title}`);
            }).catch((err) => {
                console.error("Error fetching set:", err);
                socket.emit("error", { message: "Failed to load questions" });
            });
        });
        // --- Player Joining ---
        socket.on("join-game", ({ pin, nickname }) => {
            const game = manager_1.gameManager.getGame(pin);
            if (!game) {
                socket.emit("error", { message: "Game not found" });
                return;
            }
            if (game.status !== "LOBBY" && !game.settings.allowLateJoin) {
                socket.emit("error", { message: "Game is locked" });
                return;
            }
            // Handle Reconnection
            const existingPlayer = game.players.find(p => p.name === nickname);
            if (existingPlayer) {
                if (nickname === "HOST") {
                    socket.join(pin);
                    socket.emit("player-joined", { players: game.players });
                    return;
                }
                game.handleReconnection(existingPlayer, socket);
                socket.join(pin);
                socket.emit("joined-success", { pin, nickname });
                return;
            }
            // New Player
            if (nickname === "HOST")
                return; // Security check
            // Create Player Object (Generic BasePlayer initially)
            // The specific engine (GoldQuestEngine) will add extra props in addPlayer
            const newPlayer = {
                id: socket.id,
                name: nickname,
                isConnected: true,
                score: 0
            };
            socket.join(pin);
            // The engine handles "player-joined" emit
            game.addPlayer(newPlayer, socket);
            socket.emit("joined-success", { pin, nickname });
            // Sync state if late join
            if (game.status === "PLAYING") {
                socket.emit("game-started", {
                    startTime: game.startTime,
                    settings: game.settings
                });
                socket.emit("game-state-update", game.serialize());
            }
        });
        // --- Generic Game Commands ---
        socket.on("get-game-state", ({ pin }) => {
            const game = manager_1.gameManager.getGame(pin);
            if (!game)
                return;
            if (game.status === "PLAYING") {
                socket.emit("game-started", {
                    startTime: game.startTime,
                    settings: game.settings
                });
                socket.emit("game-state-update", game.serialize());
            }
            else if (game.status === "ENDED") {
                socket.emit("game-over", { players: game.players });
            }
        });
        socket.on("start-game", ({ pin }) => {
            const game = manager_1.gameManager.getGame(pin);
            if (game)
                game.startGame();
        });
        socket.on("end-game", ({ pin }) => {
            const game = manager_1.gameManager.getGame(pin);
            if (game)
                game.endGame();
        });
        socket.on("disconnect", () => {
            // We need to find which game this socket was in
            // Ideally we map socketId -> GameId but meant for simplicity we scan
            // Or we let the game engines handle it if they knew their sockets?
            // Since we don't have a global socket map here easily exposed yet:
            // We won't do O(N) scan on every disconnect for now unless critical.
            // AbstractGameEngine.handleDisconnect logic is implemented but not called here efficiently yet.
            // For now, let's skip expensive scan. Reconnect handles the logic.
        });
        // --- Delegate Game Specific Events ---
        const forwardToGame = (eventName, payload) => {
            const pin = payload.pin; // Most payloads should have pin
            if (pin) {
                const game = manager_1.gameManager.getGame(pin);
                if (game)
                    game.handleEvent(eventName, payload, socket);
            }
            else {
                // Fallback: Try to find game by player socket if pin missing
                // This is expensive O(Games * Players), avoid if possible
            }
        };
        socket.on("open-chest", (payload) => forwardToGame("open-chest", payload));
        // Delegate specific events where we know the payload has PIN
        socket.on("request-question", (payload) => forwardToGame("request-question", payload));
        socket.on("submit-answer", (payload) => forwardToGame("submit-answer", payload));
        // --- Crypto Hack Events (Critical Fix) ---
        socket.on("select-password", (payload) => forwardToGame("select-password", payload));
        socket.on("request-hack-options", (payload) => forwardToGame("request-hack-options", payload));
        socket.on("attempt-hack", (payload) => forwardToGame("attempt-hack", payload));
        // Use findGameBySocket for these as they might lack PIN in payload currently
        socket.on("request-rewards", (payload) => {
            const game = manager_1.gameManager.findGameBySocket(socket.id);
            if (game)
                game.handleEvent("request-rewards", payload, socket);
        });
        socket.on("select-box", (payload) => {
            const game = manager_1.gameManager.findGameBySocket(socket.id);
            if (game)
                game.handleEvent("select-box", payload, socket);
        });
        socket.on("task-complete", (payload) => {
            const game = manager_1.gameManager.findGameBySocket(socket.id);
            if (game)
                game.handleEvent("task-complete", payload, socket);
        });
        // Special handling for payloads missing PIN (use-interaction)
        socket.on("use-interaction", (payload) => {
            const game = manager_1.gameManager.findGameBySocket(socket.id);
            if (game) {
                game.handleEvent("use-interaction", payload, socket);
            }
            else {
                console.log("[Server] Could not find game for interaction event from socket", socket.id);
            }
        });
    });
    httpServer
        .once("error", (err) => {
        console.error(err);
        process.exit(1);
    })
        .listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
