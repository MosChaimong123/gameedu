/** Resolve relative /uploads paths for img/video/src in the browser or server. */
export function resolveBoardMediaUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed.startsWith("/")) {
        return trimmed;
    }

    if (typeof window !== "undefined") {
        return `${window.location.origin}${trimmed}`;
    }

    const base =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        "";
    if (!base) {
        return trimmed;
    }

    return `${base.replace(/\/$/, "")}${trimmed}`;
}

export function isPdfFileName(name: string): boolean {
    return name.toLowerCase().endsWith(".pdf");
}

export function isImageFileName(name: string): boolean {
    return /\.(jpe?g|png|gif|webp|svg)$/i.test(name);
}
