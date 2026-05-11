"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandPublicAppOriginVariants = expandPublicAppOriginVariants;
exports.resolveSocketIoCorsOrigin = resolveSocketIoCorsOrigin;
/**
 * Resolves Socket.io CORS `origin` option.
 * - Dev: reflect request origin (`true`) so localhost / LAN IPs work.
 * - Prod: use `SOCKET_IO_CORS_ORIGIN` (comma-separated) or fall back to `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`.
 * - Prod: each HTTPS app origin is expanded with its www ↔ apex pair when applicable (avoids handshake
 *   failures when env lists only one of `https://example.com` / `https://www.example.com`).
 */
function expandPublicAppOriginVariants(origin) {
    const normalized = origin.replace(/\/$/, "");
    try {
        const parsed = new URL(normalized);
        const { protocol, hostname, port } = parsed;
        if (protocol !== "http:" && protocol !== "https:") {
            return [normalized];
        }
        if (hostname === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            return [normalized];
        }
        const portPart = port ? `:${port}` : "";
        const out = new Set([normalized]);
        if (hostname.startsWith("www.")) {
            const apex = hostname.slice(4);
            if (apex) {
                out.add(`${protocol}//${apex}${portPart}`);
            }
        }
        else if (hostname.split(".").length === 2) {
            out.add(`${protocol}//www.${hostname}${portPart}`);
        }
        return [...out];
    }
    catch {
        return [normalized];
    }
}
function mergedExpandedOrigins(origins) {
    const set = new Set();
    for (const o of origins) {
        for (const x of expandPublicAppOriginVariants(o)) {
            set.add(x);
        }
    }
    return [...set];
}
function toCorsOriginReturn(expanded) {
    if (expanded.length === 0) {
        return true;
    }
    if (expanded.length === 1) {
        return expanded[0];
    }
    return expanded;
}
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
        return toCorsOriginReturn(mergedExpandedOrigins(list));
    }
    if (dev) {
        return true;
    }
    const primary = ((_b = process.env.NEXTAUTH_URL) === null || _b === void 0 ? void 0 : _b.trim().replace(/\/$/, "")) ||
        ((_c = process.env.NEXT_PUBLIC_APP_URL) === null || _c === void 0 ? void 0 : _c.trim().replace(/\/$/, ""));
    if (primary) {
        return toCorsOriginReturn(mergedExpandedOrigins([primary]));
    }
    console.warn("[socket.io] Production: set SOCKET_IO_CORS_ORIGIN or NEXTAUTH_URL to restrict origins. Using origin reflection.");
    return true;
}
