// Load test for the live game socket server.
// Simulates N players joining a game PIN concurrently, then (optionally)
// answering questions on a loop — mirroring the real client in
// src/app/play/page.tsx and src/app/play/game/use-play-game-socket.ts.
//
// Usage:
//   node scripts/load-test-game.mjs --url http://localhost:3000 --pin 123456 --players 40
//   node scripts/load-test-game.mjs --url https://www.teachplayedu.com --pin 123456 --players 60 --ramp 3000 --play
//
// Flags:
//   --url      Server base URL (default http://localhost:3000)
//   --pin      Game PIN to join (required) — create a game in the host UI first
//   --players  Number of simulated players (default 40)
//   --ramp     Spread connections over N ms instead of all-at-once (default 0)
//   --play     Keep answering questions after joining (load-tests gameplay, not just lobby)
//   --duration How long to keep the --play loop running, in seconds (default 60)

import { io } from "socket.io-client";

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    if (i === -1) return fallback;
    const v = process.argv[i + 1];
    return v && !v.startsWith("--") ? v : true; // bare flag => true
}

const URL = arg("url", "http://localhost:3000");
const PIN = arg("pin", null);
const PLAYERS = parseInt(arg("players", "40"), 10);
const RAMP_MS = parseInt(arg("ramp", "0"), 10);
const PLAY = arg("play", false) === true;
const DURATION_S = parseInt(arg("duration", "60"), 10);

if (!PIN) {
    console.error("Missing --pin. Create a game in the host UI, then pass its PIN.");
    process.exit(1);
}

const stats = {
    connected: 0,
    joined: 0,
    errors: 0,
    connectErrors: 0,
    joinLatencies: [], // ms from connect -> joined-success
};

const sockets = [];

function spawnPlayer(index) {
    const nickname = `bot_${index}_${Math.random().toString(36).slice(2, 6)}`;
    const connectStart = Date.now();

    const socket = io(URL, {
        path: "/socket.io",
        transports: ["websocket"], // skip long-polling to mirror a stable client
        reconnection: false,
        timeout: 20000,
    });
    sockets.push(socket);

    socket.on("connect", () => {
        stats.connected++;
        socket.emit("join-game", { pin: PIN, nickname });
    });

    socket.once("joined-success", () => {
        stats.joined++;
        stats.joinLatencies.push(Date.now() - connectStart);
    });

    socket.on("error", (e) => {
        stats.errors++;
        if (stats.errors <= 5) console.error(`[player ${index}] error:`, e?.message ?? e);
    });

    socket.on("connect_error", (e) => {
        stats.connectErrors++;
        if (stats.connectErrors <= 5) console.error(`[player ${index}] connect_error:`, e?.message ?? e);
    });

    if (PLAY) {
        // When the server pushes a question, answer after a human-ish delay.
        const answer = () => {
            const choice = Math.floor(Math.random() * 4);
            socket.emit("submit-answer", { answer: choice });
        };
        socket.on("new-question", () => setTimeout(answer, 500 + Math.random() * 2500));
        socket.on("question", () => setTimeout(answer, 500 + Math.random() * 2500));
        // Ask for the first question like the real client does.
        socket.once("game-started", () => socket.emit("request-question"));
    }
}

function pct(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function report(final = false) {
    const lat = stats.joinLatencies;
    const avg = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
    console.log(
        `${final ? "FINAL " : ""}connected=${stats.connected}/${PLAYERS} ` +
        `joined=${stats.joined} errors=${stats.errors} connErrors=${stats.connectErrors} ` +
        `joinLatency avg=${avg}ms p95=${pct(lat, 95)}ms max=${lat.length ? Math.max(...lat) : 0}ms`
    );
}

console.log(`Load test → ${URL}  pin=${PIN}  players=${PLAYERS}  ramp=${RAMP_MS}ms  play=${PLAY}`);

for (let i = 0; i < PLAYERS; i++) {
    const delay = RAMP_MS ? Math.floor((RAMP_MS * i) / PLAYERS) : 0;
    setTimeout(() => spawnPlayer(i), delay);
}

const interval = setInterval(() => report(false), 2000);

const runMs = (PLAY ? DURATION_S * 1000 : 8000) + RAMP_MS;
setTimeout(() => {
    clearInterval(interval);
    report(true);
    sockets.forEach((s) => s.close());
    process.exit(0);
}, runMs);
