/**
 * Base URL for the Socket.io client.
 * When NEXT_PUBLIC_SOCKET_URL points at another host than the page (e.g. old
 * *.onrender.com while users visit a custom domain), cookies for NextAuth are
 * not sent and create-game fails with unauthorized. Prefer the page origin in
 * that case — the app serves Socket.io from the same Node server as Next.
 */
export function resolveSocketClientBaseUrl(): string {
    if (typeof window === "undefined") {
        return (process.env.NEXT_PUBLIC_SOCKET_URL?.trim().replace(/\/$/, "") ||
            process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
            "") as string;
    }

    const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim().replace(/\/$/, "") || "";
    if (!explicit) {
        return window.location.origin;
    }

    try {
        const envHost = new URL(explicit).hostname;
        if (envHost !== window.location.hostname) {
            console.warn(
                "[socket] NEXT_PUBLIC_SOCKET_URL host differs from page host; using page origin so auth cookies are sent.",
                { configured: explicit, page: window.location.origin }
            );
            return window.location.origin;
        }
        return explicit;
    } catch {
        return window.location.origin;
    }
}
