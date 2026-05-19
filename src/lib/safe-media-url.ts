export const BOARD_ERR_INVALID_MEDIA = "boardErrInvalidMedia";

/** Paths returned by POST /api/upload — single segment under /uploads/ */
const UPLOAD_MEDIA_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;

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

/** Uploaded files (/uploads/...) or absolute http(s) URLs. */
export function assertSafeUploadedMediaUrl(value: string | undefined): void {
    if (!value) {
        return;
    }

    const trimmed = value.trim();
    if (UPLOAD_MEDIA_PATH.test(trimmed)) {
        return;
    }

    assertSafeHttpUrl(trimmed);
}

export function isUploadMediaPath(value: string): boolean {
    return UPLOAD_MEDIA_PATH.test(value.trim());
}
