import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2BucketName, getR2Client } from "@/lib/storage/r2-client";
import { getR2PublicBaseUrl, isR2Configured } from "@/lib/storage/r2-env";

export function extractR2ObjectKeyFromUrl(
    url: string,
    env: NodeJS.ProcessEnv = process.env
): string | null {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const publicBase = getR2PublicBaseUrl(env);
    if (!publicBase) return null;

    if (trimmed.startsWith(`${publicBase}/`)) {
        return trimmed.slice(publicBase.length + 1);
    }

    try {
        const parsed = new URL(trimmed);
        const base = new URL(publicBase);
        if (parsed.hostname === base.hostname) {
            return parsed.pathname.replace(/^\//, "");
        }
    } catch {
        return null;
    }

    return null;
}

export async function deleteBoardAssetFromR2(
    url: string,
    env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
    if (!isR2Configured(env)) {
        return false;
    }

    const key = extractR2ObjectKeyFromUrl(url, env);
    if (!key || !key.startsWith("board/")) {
        return false;
    }

    const client = getR2Client(env);
    const bucket = getR2BucketName(env);

    try {
        await client.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            })
        );
        return true;
    } catch (error) {
        console.warn("[storage] Failed to delete R2 object:", key, error);
        return false;
    }
}

export async function deleteBoardAssetsFromR2(
    urls: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<void> {
    const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
    await Promise.all(unique.map((url) => deleteBoardAssetFromR2(url, env)));
}
