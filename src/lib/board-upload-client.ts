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

export async function defaultBoardFileUpload(
    file: File,
    classId?: string,
    signal?: AbortSignal
): Promise<BoardUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    if (classId) {
        formData.append("classId", classId);
    }

    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
            typeof body?.error?.message === "string"
                ? body.error.message
                : `Upload failed (${res.status})`;
        throw new Error(message);
    }

    return res.json();
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
