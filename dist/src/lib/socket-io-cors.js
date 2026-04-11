"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSocketIoCorsOrigin = resolveSocketIoCorsOrigin;
/**
 * Resolves Socket.io CORS `origin` option.
 * - Dev: reflect request origin (`true`) so localhost / LAN IPs work.
 * - Prod: use `SOCKET_IO_CORS_ORIGIN` (comma-separated) or fall back to `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`.
 */
function resolveSocketIoCorsOrigin() {
    var _a, _b, _c;
    const dev = process.env.NODE_ENV !== "production";
    const explicit = (_a = process.env.SOCKET_IO_CORS_ORIGIN) === null || _a === void 0 ? void 0 : _a.trim();
    if (explicit) {
        if (explicit === "*") {
            if (!dev) {
                console.warn("[socket.io] SOCKET_IO_CORS_ORIGIN=* in production is insecure; set explicit origins.");
            }
            return "*";
        }
        const list = explicit
            .split(",")
            .map((s) => s.trim().replace(/\/$/, ""))
            .filter(Boolean);
        if (list.length === 1) {
            return list[0];
        }
        return list;
    }
    if (dev) {
        return true;
    }
    const primary = ((_b = process.env.NEXTAUTH_URL) === null || _b === void 0 ? void 0 : _b.trim().replace(/\/$/, "")) ||
        ((_c = process.env.NEXT_PUBLIC_APP_URL) === null || _c === void 0 ? void 0 : _c.trim().replace(/\/$/, ""));
    if (primary) {
        return [primary];
    }
    console.warn("[socket.io] Production: set SOCKET_IO_CORS_ORIGIN or NEXTAUTH_URL to restrict origins. Using origin reflection.");
    return true;
}
