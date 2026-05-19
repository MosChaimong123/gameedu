import { S3Client } from "@aws-sdk/client-s3";
import { isR2Configured } from "@/lib/storage/r2-env";

let cachedClient: S3Client | null = null;

export function getR2Client(env: NodeJS.ProcessEnv = process.env): S3Client {
    if (!isR2Configured(env)) {
        throw new Error("R2 is not configured");
    }

    if (!cachedClient) {
        const accountId = env.R2_ACCOUNT_ID!.trim();
        cachedClient = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
                secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
            },
        });
    }

    return cachedClient;
}

export function getR2BucketName(env: NodeJS.ProcessEnv = process.env): string {
    return env.R2_BUCKET_NAME!.trim();
}
