export function getSafeAuthCallbackPath(
    callbackUrl: string | null | undefined,
    origin: string | null | undefined
): string | null {
    if (!callbackUrl) {
        return null;
    }

    const trimmed = callbackUrl.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return trimmed;
    }

    if (!origin) {
        return null;
    }

    try {
        const base = new URL(origin);
        const target = new URL(trimmed, base);
        if (target.origin !== base.origin) {
            return null;
        }
        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return null;
    }
}

export function appendCallbackUrl(path: string, callbackUrl: string | null | undefined): string {
    const trimmed = callbackUrl?.trim();
    if (!trimmed) {
        return path;
    }

    const glue = path.includes("?") ? "&" : "?";
    return `${path}${glue}callbackUrl=${encodeURIComponent(trimmed)}`;
}
