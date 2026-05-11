"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGameSocketHandlers = registerGameSocketHandlers;
const audit_log_1 = require("@/lib/security/audit-log");
const rate_limit_1 = require("@/lib/security/rate-limit");
const student_login_code_1 = require("@/lib/student-login-code");
const socket_error_messages_1 = require("@/lib/socket-error-messages");
const negamon_battle_host_enabled_1 = require("@/lib/negamon-battle-host-enabled");
const allowedClassroomEventTypes = new Set([
    "BOARD_UPDATE",
    "POINT_UPDATE",
]);
const defaultSettings = {
    winCondition: "TIME",
    timeLimitMinutes: 7,
    goldGoal: 1000000,
    allowLateJoin: true,
    showInstructions: true,
    useRandomNames: false,
    allowStudentAccounts: true,
};
function cleanOptionalString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
function registerGameSocketHandlers(io, deps) {
    const { db, gameManager, randomId = () => crypto.randomUUID(), resolveSocketUserId = async () => null, resolveLivePlayerCapForHost, canHostQuestionSet = async () => false, canAccessClassroom = async () => false, canPublishClassroomEvent = async () => false, auditLog = audit_log_1.logAuditEvent, } = deps;
    io.on("connection", (socket) => {
        const joinedClassrooms = new Set();
        socket.on("create-game", async ({ setId, settings, mode, rewardClassroomId, }) => {
            var _a;
            if (typeof setId !== "string" || setId.length === 0) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_INVALID_QUESTION_SET });
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
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_UNAUTHORIZED });
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
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_UNAUTHORIZED_QUESTION_SET });
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
                    socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_SET_NOT_FOUND });
                    return;
                }
                const rawMode = (mode || "GOLD_QUEST");
                const normalizedMode = rawMode === "CRYPTO_HACK"
                    ? "CRYPTO_HACK"
                    : rawMode === "NEGAMON_BATTLE"
                        ? "NEGAMON_BATTLE"
                        : "GOLD_QUEST";
                if (normalizedMode === "NEGAMON_BATTLE" && !(0, negamon_battle_host_enabled_1.isNegamonBattleHostEnabled)()) {
                    socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_NEGAMON_BATTLE_HOST_DISABLED });
                    return;
                }
                const sanitized = settings && typeof settings === "object" ? { ...settings } : {};
                delete sanitized.negamonRewardClassroomId;
                let gameSettings = { ...defaultSettings, ...sanitized };
                let planMaxLivePlayers = Number.POSITIVE_INFINITY;
                if (resolveLivePlayerCapForHost) {
                    try {
                        planMaxLivePlayers = await resolveLivePlayerCapForHost(hostId);
                    }
                    catch (err) {
                        console.error("[socket] resolveLivePlayerCapForHost failed", err);
                    }
                }
                gameSettings = { ...gameSettings, planMaxLivePlayers };
                if (normalizedMode === "NEGAMON_BATTLE" &&
                    typeof rewardClassroomId === "string" &&
                    rewardClassroomId.trim().length > 0) {
                    const classroom = await db.classroom.findFirst({
                        where: { id: rewardClassroomId.trim(), teacherId: hostId },
                        select: { id: true },
                    });
                    if (classroom) {
                        gameSettings = { ...gameSettings, negamonRewardClassroomId: classroom.id };
                    }
                }
                const game = gameManager.createGame(normalizedMode, pin, hostId, setId, gameSettings, set.questions, io);
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
                        negamonRewardClassroomId: (_a = gameSettings.negamonRewardClassroomId) !== null && _a !== void 0 ? _a : null,
                    },
                });
                socket.join(pin);
                socket.emit("game-created", { pin, hostReconnectToken });
            }
            catch {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS });
            }
        });
        socket.on("reconnect-host", ({ pin, reconnectToken }) => {
            const game = gameManager.getGame(pin);
            if (!game) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_GAME_NOT_FOUND });
                return;
            }
            if (!game.reconnectHost(socket.id, reconnectToken)) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_HOST_RECONNECTION_DENIED });
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
            }
            else if (game.status === "ENDED") {
                socket.emit("game-over", { players: game.players });
            }
        });
        socket.on("join-game", async ({ pin, nickname, reconnectToken, studentId, studentCode }) => {
            var _a, _b;
            const game = gameManager.getGame(pin);
            if (!game) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_GAME_NOT_FOUND });
                return;
            }
            const cleanStudentId = cleanOptionalString(studentId);
            const cleanStudentCode = cleanOptionalString(studentCode);
            let verifiedStudent = null;
            if (game.gameMode === "NEGAMON_BATTLE" &&
                game.settings.negamonRewardClassroomId &&
                cleanStudentCode &&
                ((_a = deps.db.student) === null || _a === void 0 ? void 0 : _a.findFirst)) {
                verifiedStudent = await deps.db.student.findFirst({
                    where: {
                        ...(cleanStudentId ? { id: cleanStudentId } : {}),
                        classId: game.settings.negamonRewardClassroomId,
                        OR: (0, student_login_code_1.getStudentLoginCodeVariants)(cleanStudentCode).map((candidate) => ({
                            loginCode: candidate,
                        })),
                    },
                    select: { id: true, loginCode: true, name: true, nickname: true },
                });
                if (!verifiedStudent) {
                    socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_INVALID_STUDENT_CODE });
                    return;
                }
            }
            const joinedNickname = ((_b = verifiedStudent === null || verifiedStudent === void 0 ? void 0 : verifiedStudent.nickname) === null || _b === void 0 ? void 0 : _b.trim()) || (verifiedStudent === null || verifiedStudent === void 0 ? void 0 : verifiedStudent.name) || nickname;
            const existingPlayer = verifiedStudent
                ? game.players.find((player) => player.studentId === verifiedStudent.id || player.name === joinedNickname)
                : game.players.find((player) => player.name === nickname);
            if (game.status === "ENDED") {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_GAME_LOCKED });
                return;
            }
            if (!existingPlayer && game.status !== "LOBBY" && !game.settings.allowLateJoin) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_GAME_LOCKED });
                return;
            }
            if (game.status === "PLAYING" &&
                !existingPlayer &&
                game.gameMode === "NEGAMON_BATTLE") {
                socket.emit("error", {
                    message: socket_error_messages_1.SOCKET_ERROR_NEGAMON_MID_MATCH,
                });
                return;
            }
            if (existingPlayer) {
                if (!game.canReconnectPlayer(existingPlayer.name, reconnectToken)) {
                    socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_NICKNAME_IN_USE });
                    return;
                }
                game.handleReconnection(existingPlayer, socket);
                if (reconnectToken) {
                    game.registerPlayerReconnectToken(existingPlayer.name, reconnectToken);
                }
                socket.join(pin);
                socket.emit("joined-success", {
                    pin,
                    nickname: existingPlayer.name,
                    gameMode: game.gameMode,
                    reconnectToken: game.getPlayerReconnectToken(existingPlayer.name),
                    studentId: existingPlayer.studentId,
                    studentCode: existingPlayer.studentCode,
                });
                if (game.status === "PLAYING") {
                    socket.emit("game-started", {
                        startTime: game.startTime,
                        settings: game.settings,
                        gameMode: game.gameMode,
                    });
                    socket.emit("game-state-update", game.serialize());
                }
                return;
            }
            if (nickname === "HOST")
                return;
            const capRaw = game.settings.planMaxLivePlayers;
            const playerCap = typeof capRaw === "number" && Number.isFinite(capRaw) && capRaw > 0
                ? capRaw
                : Number.POSITIVE_INFINITY;
            if (game.players.length >= playerCap) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_LOBBY_FULL });
                return;
            }
            const newReconnectToken = randomId();
            socket.join(pin);
            game.registerPlayerReconnectToken(joinedNickname, newReconnectToken);
            game.addPlayer({
                id: socket.id,
                name: joinedNickname,
                studentId: verifiedStudent === null || verifiedStudent === void 0 ? void 0 : verifiedStudent.id,
                studentCode: verifiedStudent === null || verifiedStudent === void 0 ? void 0 : verifiedStudent.loginCode,
                isConnected: true,
                score: 0,
            }, socket);
            socket.emit("joined-success", {
                pin,
                nickname: joinedNickname,
                gameMode: game.gameMode,
                reconnectToken: newReconnectToken,
                studentId: verifiedStudent === null || verifiedStudent === void 0 ? void 0 : verifiedStudent.id,
                studentCode: verifiedStudent === null || verifiedStudent === void 0 ? void 0 : verifiedStudent.loginCode,
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
            if (!game)
                return;
            if (game.status === "PLAYING") {
                socket.emit("game-started", {
                    startTime: game.startTime,
                    settings: game.settings,
                    gameMode: game.gameMode,
                });
                socket.emit("game-state-update", game.serialize());
            }
            else if (game.status === "ENDED") {
                socket.emit("game-over", { players: game.players });
            }
        });
        socket.on("start-game", ({ pin }) => {
            const game = gameManager.getGame(pin);
            if (!game)
                return;
            if (!game.isHostSocket(socket.id)) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_ONLY_HOST_CAN_START });
                return;
            }
            game.startGame();
        });
        socket.on("end-game", ({ pin }) => {
            const game = gameManager.getGame(pin);
            if (!game)
                return;
            if (!game.isHostSocket(socket.id)) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_ONLY_HOST_CAN_END });
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
        const forwardPlayerGameEvent = (eventName, payload) => {
            const game = gameManager.findGameBySocket(socket.id);
            if (!game) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_PLAY_NOT_IN_GAME });
                return;
            }
            const pin = payload === null || payload === void 0 ? void 0 : payload.pin;
            if (typeof pin !== "string" || pin.length === 0 || pin !== game.pin) {
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_PLAY_ROOM_PIN_MISMATCH });
                return;
            }
            game.handleEvent(eventName, payload, socket);
        };
        socket.on("open-chest", (payload) => forwardPlayerGameEvent("open-chest", payload));
        socket.on("request-question", (payload) => forwardPlayerGameEvent("request-question", payload));
        socket.on("submit-answer", (payload) => forwardPlayerGameEvent("submit-answer", payload));
        socket.on("select-password", (payload) => forwardPlayerGameEvent("select-password", payload));
        socket.on("request-hack-options", (payload) => forwardPlayerGameEvent("request-hack-options", payload));
        socket.on("attempt-hack", (payload) => forwardPlayerGameEvent("attempt-hack", payload));
        socket.on("request-rewards", (payload) => forwardPlayerGameEvent("request-rewards", payload));
        socket.on("select-box", (payload) => forwardPlayerGameEvent("select-box", payload));
        socket.on("task-complete", (payload) => forwardPlayerGameEvent("task-complete", payload));
        socket.on("submit-negamon-answer", (payload) => {
            const game = gameManager.findGameBySocket(socket.id);
            if (!game || game.gameMode !== "NEGAMON_BATTLE")
                return;
            const pin = payload === null || payload === void 0 ? void 0 : payload.pin;
            if (typeof pin !== "string" || pin.length === 0 || pin !== game.pin) {
                auditLog({
                    action: "socket.negamon.answer.denied",
                    targetType: "game",
                    targetId: game.pin,
                    status: "rejected",
                    metadata: { reason: "invalid_pin", socketId: socket.id },
                });
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_INVALID_GAME_CODE });
                return;
            }
            const rateLimitOpts = {
                bucket: "negamon_submit_answer",
                key: socket.id,
                limit: 24,
                windowMs: 60000,
            };
            void (async () => {
                let rate;
                try {
                    rate = await (0, rate_limit_1.consumeRateLimitWithStore)(rateLimitOpts);
                }
                catch (err) {
                    console.error("[socket] negamon_submit_answer rate limit store failed", err);
                    rate = (0, rate_limit_1.consumeRateLimit)(rateLimitOpts);
                }
                if (!rate.allowed) {
                    auditLog({
                        action: "socket.negamon.answer.denied",
                        targetType: "game",
                        targetId: game.pin,
                        status: "rejected",
                        metadata: { reason: "rate_limited", socketId: socket.id },
                    });
                    socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_TOO_MANY_SUBMISSIONS });
                    return;
                }
                const still = gameManager.findGameBySocket(socket.id);
                if (!still || still.gameMode !== "NEGAMON_BATTLE" || still.pin !== game.pin)
                    return;
                still.handleEvent("submit-negamon-answer", payload, socket);
            })();
        });
        socket.on("use-interaction", (payload) => forwardPlayerGameEvent("use-interaction", payload));
        socket.on("join-classroom", async (classId) => {
            if (typeof classId !== "string" || classId.length === 0)
                return;
            const userId = await resolveSocketUserId(socket);
            if (!userId || !(await canAccessClassroom(userId, classId))) {
                auditLog({
                    actorUserId: userId,
                    action: "socket.classroom.join.denied",
                    targetType: "classroom",
                    targetId: classId,
                    metadata: { socketId: socket.id },
                });
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS });
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
            var _a;
            const { classId, type } = payload || {};
            if (typeof classId !== "string" || classId.length === 0 || typeof type !== "string") {
                return;
            }
            if (!allowedClassroomEventTypes.has(type)) {
                auditLog({
                    action: "socket.classroom.update.denied",
                    targetType: "classroom",
                    targetId: classId,
                    metadata: { reason: "invalid_event_type", type, socketId: socket.id },
                });
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_INVALID_CLASSROOM_EVENT });
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
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS });
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
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_JOIN_CLASSROOM_FIRST });
                return;
            }
            if (!(await canPublishClassroomEvent(userId, classId, type))) {
                auditLog({
                    actorUserId: userId,
                    action: "socket.classroom.update.denied",
                    targetType: "classroom",
                    targetId: classId,
                    metadata: { reason: "unauthorized_event", type, socketId: socket.id },
                });
                socket.emit("error", { message: socket_error_messages_1.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_EVENT });
                return;
            }
            const data = (_a = payload === null || payload === void 0 ? void 0 : payload.data) !== null && _a !== void 0 ? _a : Object.fromEntries(Object.entries(payload || {}).filter(([key]) => key !== "classId" && key !== "type"));
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
