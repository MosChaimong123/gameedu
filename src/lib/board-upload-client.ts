export const MAX_BOARD_ALBUM_IMAGES = 20;
export const BOARD_UPLOAD_CONCURRENCY = 3;

export type BoardUploadProgress = {
    current: number;
    total: number;
    fileName: string;
};

export type BoardUploadResult = {
    url: string;
    originalFileName?: string;
    fileName?: string;
    size?: number;
    type?: string;
};

export type BoardUploadByteProgress = {
    loaded: number;
    total: number;
    percent: number;
};

export type BoardFileUploadOptions = {
    classId?: string;
    signal?: AbortSignal;
    onByteProgress?: (progress: BoardUploadByteProgress) => void;
};

function parseUploadErrorMessage(status: number, body: unknown): string {
    if (body && typeof body === "object" && "error" in body) {
        const error = (body as { error?: { message?: unknown } }).error;
        if (typeof error?.message === "string") return error.message;
    }
    return `Upload failed (${status})`;
}

export function uploadBoardFileWithProgress(
    file: File,
    options: BoardFileUploadOptions = {}
): Promise<BoardUploadResult> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);
        if (options.classId) {
            formData.append("classId", options.classId);
        }

        const abortUpload = () => {
            xhr.abort();
        };

        if (options.signal) {
            if (options.signal.aborted) {
                reject(new DOMException("Upload cancelled", "AbortError"));
                return;
            }
            options.signal.addEventListener("abort", abortUpload, { once: true });
        }

        xhr.upload.addEventListener("progress", (event) => {
            if (!options.onByteProgress) return;
            const total = event.lengthComputable ? event.total : file.size;
            const loaded = event.loaded;
            const percent =
                total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
            options.onByteProgress({ loaded, total, percent });
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const parsed = JSON.parse(xhr.responseText) as BoardUploadResult;
                    options.onByteProgress?.({
                        loaded: file.size,
                        total: file.size,
                        percent: 100,
                    });
                    resolve(parsed);
                } catch {
                    reject(new Error("Upload response was not valid JSON"));
                }
                return;
            }

            let body: unknown;
            try {
                body = JSON.parse(xhr.responseText);
            } catch {
                body = null;
            }
            reject(new Error(parseUploadErrorMessage(xhr.status, body)));
        });

        xhr.addEventListener("error", () => {
            reject(new Error("Upload failed (network error)"));
        });

        xhr.addEventListener("abort", () => {
            reject(new DOMException("Upload cancelled", "AbortError"));
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
    });
}

export async function defaultBoardFileUpload(
    file: File,
    classIdOrOptions?: string | BoardFileUploadOptions,
    signal?: AbortSignal
): Promise<BoardUploadResult> {
    const options: BoardFileUploadOptions =
        typeof classIdOrOptions === "string"
            ? { classId: classIdOrOptions, signal }
            : { ...classIdOrOptions, signal: classIdOrOptions?.signal ?? signal };

    return uploadBoardFileWithProgress(file, options);
}

export async function uploadBoardFilesParallel(
    files: File[],
    options: {
        classId?: string;
        concurrency?: number;
        signal?: AbortSignal;
        onProgress?: (progress: BoardUploadProgress) => void;
        upload?: (file: File, signal?: AbortSignal) => Promise<BoardUploadResult>;
    } = {}
): Promise<BoardUploadResult[]> {
    const total = files.length;
    if (total === 0) return [];

    const concurrency = options.concurrency ?? BOARD_UPLOAD_CONCURRENCY;
    const uploadFn =
        options.upload ??
        ((file, signal) => defaultBoardFileUpload(file, options.classId, signal));

    const results: BoardUploadResult[] = new Array(total);
    let nextIndex = 0;
    let completed = 0;

    const worker = async () => {
        while (nextIndex < total) {
            if (options.signal?.aborted) {
                throw new DOMException("Upload cancelled", "AbortError");
            }

            const index = nextIndex;
            nextIndex += 1;
            const file = files[index]!;

            options.onProgress?.({
                current: completed + 1,
                total,
                fileName: file.name,
            });

            results[index] = await uploadFn(file, options.signal);
            completed += 1;
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(concurrency, total) }, () => worker())
    );

    return results;
}
