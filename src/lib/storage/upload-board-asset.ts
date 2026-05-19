import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2BucketName, getR2Client } from "@/lib/storage/r2-client";
import { getR2PublicBaseUrl } from "@/lib/storage/r2-env";

export type UploadBoardAssetInput = {
    buffer: Buffer;
    contentType: string;
    extension: string;
    classId?: string;
};

export type UploadBoardAssetResult = {
    url: string;
    key: string;
};

export async function uploadBoardAssetToR2(
    input: UploadBoardAssetInput,
    env: NodeJS.ProcessEnv = process.env
): Promise<UploadBoardAssetResult> {
    const client = getR2Client(env);
    const bucket = getR2BucketName(env);
    const publicBase = getR2PublicBaseUrl(env);

    const classSegment = input.classId?.trim() ? sanitizePathSegment(input.classId) : "general";
    const fileName = `${crypto.randomUUID()}${input.extension}`;
    const key = `board/${classSegment}/${fileName}`;

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: input.buffer,
            ContentType: input.contentType,
        })
    );

    return {
        key,
        url: `${publicBase}/${key}`,
    };
}

function sanitizePathSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "general";
}
