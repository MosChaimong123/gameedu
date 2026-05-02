import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";

const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
]);

const DOCUMENT_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.rar",
    "application/x-7z-compressed",
]);

const ALLOWED_MIME_TYPES = new Set([
    ...IMAGE_MIME_TYPES,
    ...VIDEO_MIME_TYPES,
    ...DOCUMENT_MIME_TYPES,
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const SAFE_FILE_EXTENSIONS: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "application/vnd.rar": ".rar",
    "application/x-7z-compressed": ".7z",
};

function getMaxSizeForMimeType(mimeType: string) {
    if (IMAGE_MIME_TYPES.has(mimeType)) return MAX_IMAGE_BYTES;
    if (VIDEO_MIME_TYPES.has(mimeType)) return MAX_VIDEO_BYTES;
    return MAX_DOCUMENT_BYTES;
}

export async function POST(request: NextRequest) {
    let actorUserId: string | undefined;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            logAuditEvent({
                action: "upload.denied",
                status: "rejected",
                targetType: "upload",
                metadata: { reason: "unauthorized", client: getRequestClientIdentifier(request) },
            });
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }
        actorUserId = session.user.id;

        const rateLimit = await consumeRateLimitWithStore({
            bucket: "upload:post",
            key: buildRateLimitKey(getRequestClientIdentifier(request), session.user.id),
            limit: 15,
            windowMs: 60_000,
        });

        if (!rateLimit.allowed) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: "upload.denied",
                status: "rejected",
                targetType: "upload",
                metadata: { reason: "rate_limited", client: getRequestClientIdentifier(request) },
            });
            return createRateLimitResponse(rateLimit.retryAfterSeconds);
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: "upload.denied",
                status: "rejected",
                targetType: "upload",
                metadata: { reason: "missing_file" },
            });
            return createAppErrorResponse("NO_FILE", "No file uploaded", 400);
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: "upload.denied",
                status: "rejected",
                targetType: "upload",
                metadata: { reason: "unsupported_type", mimeType: file.type },
            });
            return createAppErrorResponse("UNSUPPORTED_FILE_TYPE", "Unsupported file type", 415);
        }

        const maxAllowedSize = getMaxSizeForMimeType(file.type);
        if (file.size > maxAllowedSize) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: "upload.denied",
                status: "rejected",
                targetType: "upload",
                metadata: { reason: "file_too_large", mimeType: file.type, size: file.size },
            });
            return createAppErrorResponse("FILE_TOO_LARGE", "File too large", 413);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch {
            // Directory might already exist
        }

        const fileExtension = SAFE_FILE_EXTENSIONS[file.type];
        const fileName = `${crypto.randomUUID()}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const url = `/uploads/${fileName}`;
        logAuditEvent({
            actorUserId,
            action: "upload.succeeded",
            targetType: "upload",
            targetId: fileName,
            metadata: {
                originalFileName: file.name,
                mimeType: file.type,
                size: file.size,
            },
        });

        return NextResponse.json({ 
            url, 
            fileName,
            originalFileName: file.name,
            size: file.size,
            type: file.type
        });
    } catch (error) {
        logAuditEvent({
            actorUserId,
            action: "upload.failed",
            status: "error",
            targetType: "upload",
            metadata: {
                reason: error instanceof Error ? error.message : "unknown_error",
            },
        });
        console.error("Upload error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
