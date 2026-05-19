import { parseBoardAttachedFiles } from "@/lib/board-attached-files";

type BoardPostMediaSource = {
    image?: string | null;
    images?: string[] | null;
    fileUrl?: string | null;
    fileName?: string | null;
    attachedFiles?: unknown;
    videoUrl?: string | null;
};

export function collectBoardPostMediaUrls(post: BoardPostMediaSource): string[] {
    const urls = new Set<string>();

    const push = (value: string | null | undefined) => {
        const trimmed = value?.trim();
        if (trimmed) urls.add(trimmed);
    };

    push(post.image);
    push(post.videoUrl);
    push(post.fileUrl);

    for (const image of post.images ?? []) {
        push(image);
    }

    const attached = parseBoardAttachedFiles(post.attachedFiles, post.fileUrl, post.fileName);
    for (const file of attached) {
        push(file.url);
    }

    return [...urls];
}
