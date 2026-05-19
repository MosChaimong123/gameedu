export type UploadStorageMode = "local" | "r2" | "auto";

export function isR2Configured(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(
        env.R2_ACCOUNT_ID?.trim() &&
            env.R2_ACCESS_KEY_ID?.trim() &&
            env.R2_SECRET_ACCESS_KEY?.trim() &&
            env.R2_BUCKET_NAME?.trim() &&
            env.R2_PUBLIC_BASE_URL?.trim()
    );
}

export function getUploadStorageMode(env: NodeJS.ProcessEnv = process.env): UploadStorageMode {
    const explicit = env.UPLOAD_STORAGE?.trim().toLowerCase();
    if (explicit === "local" || explicit === "r2") {
        return explicit;
    }
    return isR2Configured(env) ? "r2" : "local";
}

export function getR2PublicBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
    return (env.R2_PUBLIC_BASE_URL?.trim() ?? "").replace(/\/$/, "");
}

export function getR2PublicHost(env: NodeJS.ProcessEnv = process.env): string | null {
    const base = getR2PublicBaseUrl(env);
    if (!base) return null;
    try {
        return new URL(base).hostname;
    } catch {
        return null;
    }
}
