/**
 * Origin for redirects the browser will follow (`Location` header).
 *
 * On some hosts (e.g. Render + custom Node server), `Request#url` can be
 * `https://0.0.0.0:PORT/...` — that is not a valid browser destination.
 * Prefer public URL env vars configured for Auth.js / the app.
 */
export function resolveBrowserRedirectOrigin(requestUrl: string): string {
    const fromEnv =
        process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
        process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") ||
        process.env.AUTH_URL?.trim().replace(/\/$/, "");
    if (fromEnv) {
        return fromEnv;
    }
    try {
        const u = new URL(requestUrl);
        if (u.hostname === "0.0.0.0") {
            u.hostname = "localhost";
        }
        return u.origin;
    } catch {
        return "http://localhost:3000";
    }
}
