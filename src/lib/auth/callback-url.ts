const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const POST_AUTH_ROUTE_FAMILIES = ["/dashboard", "/admin", "/student/home"] as const;
const RAW_CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;
const ENCODED_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;

function hasUnsafeUrlSyntax(value: string, rejectEncodedPathSeparators: boolean): boolean {
    let candidate = value;

    // Check more than one encoding layer because callbackUrl itself is commonly
    // nested inside another query string before reaching this boundary.
    for (let depth = 0; depth < 3; depth += 1) {
        if (
            RAW_CONTROL_OR_BACKSLASH.test(candidate) ||
            ENCODED_CONTROL.test(candidate) ||
            (rejectEncodedPathSeparators && ENCODED_PATH_SEPARATOR.test(candidate))
        ) {
            return true;
        }

        try {
            const decoded = decodeURIComponent(candidate);
            if (decoded === candidate) {
                return false;
            }
            candidate = decoded;
        } catch {
            return true;
        }
    }

    return (
        RAW_CONTROL_OR_BACKSLASH.test(candidate) ||
        ENCODED_CONTROL.test(candidate) ||
        (rejectEncodedPathSeparators && ENCODED_PATH_SEPARATOR.test(candidate))
    );
}

function isAllowedPostAuthPath(pathname: string): boolean {
    return POST_AUTH_ROUTE_FAMILIES.some(
        (family) => pathname === family || pathname.startsWith(`${family}/`)
    );
}

export function getSafeSameOriginPath(
    value: string | null | undefined,
    origin: string | null | undefined
): string | null {
    if (!value || !origin) {
        return null;
    }

    if (hasUnsafeUrlSyntax(value, false)) {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("//")) {
        return null;
    }

    try {
        const base = new URL(origin);
        if (
            !HTTP_PROTOCOLS.has(base.protocol) ||
            base.username !== "" ||
            base.password !== ""
        ) {
            return null;
        }

        const target = new URL(trimmed, base);
        if (
            !HTTP_PROTOCOLS.has(target.protocol) ||
            target.username !== "" ||
            target.password !== "" ||
            target.origin !== base.origin
        ) {
            return null;
        }

        if (
            hasUnsafeUrlSyntax(target.pathname, true) ||
            hasUnsafeUrlSyntax(target.search, false) ||
            hasUnsafeUrlSyntax(target.hash, false)
        ) {
            return null;
        }

        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return null;
    }
}

export function getSafeAuthCallbackPath(
    callbackUrl: string | null | undefined,
    origin: string | null | undefined
): string | null {
    if (!callbackUrl || !origin || hasUnsafeUrlSyntax(callbackUrl, true)) {
        return null;
    }

    const path = getSafeSameOriginPath(callbackUrl, origin);
    if (!path) {
        return null;
    }

    const pathname = new URL(path, origin).pathname;
    return isAllowedPostAuthPath(pathname) ? path : null;
}

export function appendCallbackUrl(path: string, callbackUrl: string | null | undefined): string {
    const trimmed = callbackUrl?.trim();
    if (!trimmed) {
        return path;
    }

    const glue = path.includes("?") ? "&" : "?";
    return `${path}${glue}callbackUrl=${encodeURIComponent(trimmed)}`;
}
