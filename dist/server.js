"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("@next/env");
(0, env_1.loadEnvConfig)(process.cwd()); // โหลด .env.local ก่อน import อื่นใดทั้งหมด
const env_2 = require("./src/lib/env");
(0, env_2.normalizePublicUrlEnvsInProcess)();
const Sentry = __importStar(require("@sentry/nextjs"));
const sentry_pii_1 = require("./src/lib/observability/sentry-pii");
// Custom-server boot path: instrumentation.ts is also called by Next, but
// Socket.IO handlers run before the Next request pipeline takes over, so we
// initialize Sentry here too. Sentry's SDK is a no-op without DSN.
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
    const tracesSampleRate = (() => {
        var _a;
        const raw = (_a = process.env.SENTRY_TRACES_SAMPLE_RATE) === null || _a === void 0 ? void 0 : _a.trim();
        if (!raw)
            return 0.05;
        const n = Number(raw);
        if (!Number.isFinite(n))
            return 0.05;
        return Math.min(1, Math.max(0, n));
    })();
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: ((_a = process.env.SENTRY_ENVIRONMENT) === null || _a === void 0 ? void 0 : _a.trim()) ||
            process.env.NODE_ENV ||
            "production",
        release: ((_b = process.env.SENTRY_RELEASE) === null || _b === void 0 ? void 0 : _b.trim()) || undefined,
        tracesSampleRate,
        sendDefaultPii: false,
        beforeSend: sentry_pii_1.scrubSentryEvent,
    });
}
const node_http_1 = require("node:http");
const node_crypto_1 = require("node:crypto");
const next_1 = __importDefault(require("next"));
const jwt_1 = require("next-auth/jwt");
const socket_io_1 = require("socket.io");
const manager_1 = require("./src/lib/game-engine/manager");
const db_1 = require("./src/lib/db"); // Use Singleton
const register_game_socket_handlers_1 = require("./src/lib/socket/register-game-socket-handlers");
const socket_io_cors_1 = require("./src/lib/socket-io-cors");
const mongo_admin_1 = require("./src/lib/ops/mongo-admin");
const env_3 = require("./src/lib/env");
const resource_access_1 = require("./src/lib/authorization/resource-access");
const plan_access_1 = require("./src/lib/plan/plan-access");
const roles_1 = require("./src/lib/roles");
const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
// Custom server ค่าเริ่มต้นจะใช้ Turbopack (TURBOPACK=auto) — บน Windows แคชเสียหายหรือบั๊ก Rust อาจ panic;
// บังคับ Webpack ใน dev เพื่อความเสถียร (ดู terminal: turbo-persistence static_sorted_file)
const app = (0, next_1.default)({ dev, hostname, port, webpack: true });
const handler = app.getRequestHandler();
app.prepare().then(async () => {
    const env = (0, env_3.validateServerEnv)();
    await (0, mongo_admin_1.ensureOperationalIndexes)();
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
        cors: { origin: (0, socket_io_cors_1.resolveSocketIoCorsOrigin)() },
    });
    // Inject IO into Game Manager (Critical for recovered games)
    manager_1.gameManager.setIO(io);
    (0, register_game_socket_handlers_1.registerGameSocketHandlers)(io, {
        db: db_1.db,
        gameManager: manager_1.gameManager,
        randomId: node_crypto_1.randomUUID,
        resolveSocketUserId: async (socket) => {
            const headers = Object.fromEntries(Object.entries(socket.handshake.headers).flatMap(([key, value]) => {
                if (typeof value === "string") {
                    return [[key, value]];
                }
                if (Array.isArray(value)) {
                    return [[key, value.join(",")]];
                }
                return [];
            }));
            const publicUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
            const secureCookie = process.env.NODE_ENV === "production" || publicUrl.startsWith("https://");
            const token = await (0, jwt_1.getToken)({
                req: { headers },
                secret: (0, env_3.resolveAuthSecret)(),
                secureCookie,
            });
            return typeof (token === null || token === void 0 ? void 0 : token.id) === "string" ? token.id : null;
        },
        canHostQuestionSet: (userId, setId) => (0, resource_access_1.canHostQuestionSetForUser)(db_1.db, userId, setId),
        canAccessClassroom: (userId, classId) => (0, resource_access_1.canUserAccessClassroom)(db_1.db, userId, classId),
        canPublishClassroomEvent: (userId, classId, eventType) => (0, resource_access_1.canUserPublishClassroomSocketEvent)(db_1.db, userId, classId, eventType),
        resolveLivePlayerCapForHost: async (hostId) => {
            const user = await db_1.db.user.findUnique({
                where: { id: hostId },
                select: { plan: true, role: true, planStatus: true, planExpiry: true },
            });
            const role = (user === null || user === void 0 ? void 0 : user.role) && (0, roles_1.isAppRole)(user.role) ? user.role : "USER";
            return (0, plan_access_1.getLimitsForUser)(role, user === null || user === void 0 ? void 0 : user.plan, user === null || user === void 0 ? void 0 : user.planStatus, user === null || user === void 0 ? void 0 : user.planExpiry).maxLiveGamePlayers;
        },
    });
    io.on("connection", (socket) => {
        socket.on("error", (err) => {
            console.error("[socket.io] connection error", err);
            Sentry.captureException(err, {
                tags: { component: "socket.io", scope: "connection" },
            });
        });
    });
    io.engine.on("connection_error", (err) => {
        var _a, _b, _c, _d, _e, _f;
        // Engine.IO attaches `req` to the error; logging the raw object spams logs / Sentry.
        const e = err;
        const originHeader = (_b = (_a = e.req) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.origin;
        const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
        const summary = {
            message: (_c = e.message) !== null && _c !== void 0 ? _c : (err instanceof Error ? err.message : String(err)),
            code: e.code,
            context: e.context,
            method: (_d = e.req) === null || _d === void 0 ? void 0 : _d.method,
            url: (_e = e.req) === null || _e === void 0 ? void 0 : _e.url,
            origin: typeof origin === "string" ? origin : undefined,
        };
        console.error("[socket.io] engine connection_error", summary);
        Sentry.captureMessage(`socket.io engine: ${summary.message}`, {
            level: "warning",
            tags: { component: "socket.io", scope: "engine", code: String((_f = summary.code) !== null && _f !== void 0 ? _f : "") },
            extra: summary,
        });
    });
    httpServer
        .once("error", (err) => {
        console.error(err);
        Sentry.captureException(err, {
            tags: { component: "http", scope: "listen" },
            level: "fatal",
        });
        process.exit(1);
    })
        .listen(port, () => {
        var _a, _b;
        const appUrl = (_b = (_a = env.NEXT_PUBLIC_APP_URL) !== null && _a !== void 0 ? _a : env.NEXTAUTH_URL) !== null && _b !== void 0 ? _b : `http://${hostname}:${port}`;
        const socketCorsOrigin = (0, socket_io_cors_1.resolveSocketIoCorsOrigin)();
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`[startup] appUrl=${appUrl} rateLimitStore=${(0, env_3.resolveRateLimitStore)()} auditLogSink=${(0, env_3.resolveAuditLogSink)()}`);
        console.log(`[startup] socketIoCors=${Array.isArray(socketCorsOrigin) ? socketCorsOrigin.join(",") : String(socketCorsOrigin)} readyPath=/api/ready healthPath=/api/health`);
    });
});
