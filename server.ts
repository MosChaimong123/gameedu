
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

type RegisterHandlersDeps = Parameters<typeof registerGameSocketHandlers>[1];

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
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
        cors: { origin: "*" }
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
                secret: process.env.AUTH_SECRET,
            });
            return typeof token?.id === "string" ? token.id : null;
        },
        canAccessClassroom: async (userId, classId) => {
            const classroom = await db.classroom.findUnique({
                where: { id: classId },
                select: {
                    teacherId: true,
                    students: {
                        where: { userId },
                        select: { id: true },
                        take: 1,
                    },
                },
            });

            if (!classroom) {
                return false;
            }

            return classroom.teacherId === userId || classroom.students.length > 0;
        },
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
