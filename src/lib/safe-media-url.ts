import { getR2PublicHost } from "@/lib/storage/r2-env";

export const BOARD_ERR_INVALID_MEDIA = "boardErrInvalidMedia";

/** Paths returned by POST /api/upload — single segment under /uploads/ */
const UPLOAD_MEDIA_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;

/** R2 board assets: board/{classId|general}/{uuid}.ext */
const R2_BOARD_MEDIA_PATH = /^\/board\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/;

export function assertSafeHttpUrl(value: string | undefined): void {
    if (!value) {
        return;
    }

    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
}

function assertSafeR2BoardUrl(value: string, env: NodeJS.ProcessEnv = process.env): void {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    if (parsed.protocol !== "https:") {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    const allowedHost = getR2PublicHost(env);
    if (!allowedHost || parsed.hostname !== allowedHost) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }

    if (!R2_BOARD_MEDIA_PATH.test(parsed.pathname)) {
        throw new Error(BOARD_ERR_INVALID_MEDIA);
    }
}

/** Uploaded files (/uploads/...), R2 board URLs, or absolute http(s) URLs. */
export function assertSafeUploadedMediaUrl(
    value: string | undefined,
    env: NodeJS.ProcessEnv = process.env
): void {
    if (!value) {
        return;
    }

    const trimmed = value.trim();
    if (UPLOAD_MEDIA_PATH.test(trimmed)) {
        return;
    }

    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
        let parsed: URL;
        try {
            parsed = new URL(trimmed);
        } catch {
            throw new Error(BOARD_ERR_INVALID_MEDIA);
        }

        if (R2_BOARD_MEDIA_PATH.test(parsed.pathname)) {
            assertSafeR2BoardUrl(trimmed, env);
            return;
        }

        assertSafeHttpUrl(trimmed);
        return;
    }

    throw new Error(BOARD_ERR_INVALID_MEDIA);
}

export function isUploadMediaPath(value: string): boolean {
    return UPLOAD_MEDIA_PATH.test(value.trim());
}

export function isR2BoardMediaUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
    const trimmed = value.trim();
    if (!getR2PublicHost(env)) {
        return false;
    }
    try {
        assertSafeR2BoardUrl(trimmed, env);
        return true;
    } catch {
        return false;
    }
}
