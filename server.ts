
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd()); // โหลด .env.local ก่อน import อื่นใดทั้งหมด

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import next from "next";
import { getToken } from "next-auth/jwt";
import { Server } from "socket.io";
import { gameManager } from "./src/lib/game-engine/manager";
import { db } from "./src/lib/db"; // Use Singleton
import { registerGameSocketHandlers } from "./src/lib/socket/register-game-socket-handlers";
import { resolveSocketIoCorsOrigin } from "./src/lib/socket-io-cors";
import { ensureOperationalIndexes } from "./src/lib/ops/mongo-admin";
import { resolveAuditLogSink, resolveAuthSecret, resolveRateLimitStore, validateServerEnv } from "./src/lib/env";
import {
    canHostQuestionSetForUser,
    canUserAccessClassroom,
    canUserPublishClassroomSocketEvent,
} from "./src/lib/authorization/resource-access";

type RegisterHandlersDeps = Parameters<typeof registerGameSocketHandlers>[1];

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
// Custom server ค่าเริ่มต้นจะใช้ Turbopack (TURBOPACK=auto) — บน Windows แคชเสียหายหรือบั๊ก Rust อาจ panic;
// บังคับ Webpack ใน dev เพื่อความเสถียร (ดู terminal: turbo-persistence static_sorted_file)
const app = next({ dev, hostname, port, webpack: true });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
    const env = validateServerEnv();
    await ensureOperationalIndexes();

    // Attempt to recover active games from DB
    await gameManager.recoverGames();

    const httpServer = createServer((req, res) => {
        if (req.url?.startsWith("/socket.io")) {
            return;
        }
        handler(req, res);
    });
    const io = new Server(httpServer, {
        path: "/socket.io",
        addTrailingSlash: false,
        cors: { origin: resolveSocketIoCorsOrigin() },
    });

    // Inject IO into Game Manager (Critical for recovered games)
    gameManager.setIO(io);

    registerGameSocketHandlers(io, {
        db: db as unknown as RegisterHandlersDeps["db"],
        gameManager: gameManager as unknown as RegisterHandlersDeps["gameManager"],
        randomId: randomUUID,
        resolveSocketUserId: async (socket) => {
            const headers = Object.fromEntries(
                Object.entries(socket.handshake.headers).flatMap(([key, value]) => {
                    if (typeof value === "string") {
                        return [[key, value]];
                    }
                    if (Array.isArray(value)) {
                        return [[key, value.join(",")]];
                    }
                    return [];
                })
            );
            const token = await getToken({
                req: { headers },
                secret: resolveAuthSecret(),
            });
            return typeof token?.id === "string" ? token.id : null;
        },
        canHostQuestionSet: (userId, setId) =>
            canHostQuestionSetForUser(db, userId, setId),
        canAccessClassroom: (userId, classId) => canUserAccessClassroom(db, userId, classId),
        canPublishClassroomEvent: (userId, classId, eventType) =>
            canUserPublishClassroomSocketEvent(db, userId, classId, eventType),
    });


    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            const appUrl = env.NEXT_PUBLIC_APP_URL ?? env.NEXTAUTH_URL ?? `http://${hostname}:${port}`;
            const socketCorsOrigin = resolveSocketIoCorsOrigin();
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(
                `[startup] appUrl=${appUrl} rateLimitStore=${resolveRateLimitStore()} auditLogSink=${resolveAuditLogSink()}`
            );
            console.log(
                `[startup] socketIoCors=${Array.isArray(socketCorsOrigin) ? socketCorsOrigin.join(",") : String(socketCorsOrigin)} readyPath=/api/ready healthPath=/api/health`
            );
        });
});
