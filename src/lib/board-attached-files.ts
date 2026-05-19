export type BoardAttachedFile = {
    url: string;
    name: string;
};

export const MAX_BOARD_ATTACHED_FILES = 20;

export function parseBoardAttachedFiles(
    attachedFiles: unknown,
    fileUrl?: string | null,
    fileName?: string | null
): BoardAttachedFile[] {
    if (Array.isArray(attachedFiles)) {
        const parsed = attachedFiles
            .map((entry) => {
                if (!entry || typeof entry !== "object") {
                    return null;
                }
                const record = entry as { url?: unknown; name?: unknown };
                const url = typeof record.url === "string" ? record.url.trim() : "";
                if (!url) {
                    return null;
                }
                const name =
                    typeof record.name === "string" && record.name.trim()
                        ? record.name.trim()
                        : "file";
                return { url, name };
            })
            .filter((entry): entry is BoardAttachedFile => entry !== null);

        if (parsed.length > 0) {
            return parsed;
        }
    }

    const legacyUrl = fileUrl?.trim();
    if (legacyUrl) {
        return [
            {
                url: legacyUrl,
                name: fileName?.trim() || "file",
            },
        ];
    }

    return [];
}

export function normalizeAttachedFilesInput(
    files: BoardAttachedFile[] | undefined,
    fallback?: { fileUrl?: string; fileName?: string }
): BoardAttachedFile[] {
    const normalized = (files ?? [])
        .map((file) => ({
            url: file.url.trim(),
            name: file.name.trim() || "file",
        }))
        .filter((file) => file.url);

    if (normalized.length > 0) {
        return normalized.slice(0, MAX_BOARD_ATTACHED_FILES);
    }

    const fileUrl = fallback?.fileUrl?.trim();
    if (!fileUrl) {
        return [];
    }

    return [
        {
            url: fileUrl,
            name: fallback?.fileName?.trim() || "file",
        },
    ];
}
