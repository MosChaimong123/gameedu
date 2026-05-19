import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { loadWorksheetTakeContext, WORKSHEET_ERR_BAD_REQUEST } from "@/lib/worksheet-take-context";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const FILE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
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

function fileMatchesAllowedType(fileType: string, allowedType: "any" | "document" | "image" | "audio" | "video") {
  if (allowedType === "any") {
    return (
      IMAGE_MIME_TYPES.has(fileType) ||
      VIDEO_MIME_TYPES.has(fileType) ||
      AUDIO_MIME_TYPES.has(fileType) ||
      DOCUMENT_MIME_TYPES.has(fileType)
    );
  }
  if (allowedType === "document") return DOCUMENT_MIME_TYPES.has(fileType);
  if (allowedType === "image") return IMAGE_MIME_TYPES.has(fileType);
  if (allowedType === "audio") return AUDIO_MIME_TYPES.has(fileType);
  return VIDEO_MIME_TYPES.has(fileType);
}

function getMaxSizeForMimeType(mimeType: string) {
  if (IMAGE_MIME_TYPES.has(mimeType)) return MAX_IMAGE_BYTES;
  if (VIDEO_MIME_TYPES.has(mimeType)) return MAX_VIDEO_BYTES;
  if (AUDIO_MIME_TYPES.has(mimeType)) return MAX_AUDIO_BYTES;
  return MAX_DOCUMENT_BYTES;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;

  try {
    const formData = await request.formData();
    const studentCode = String(formData.get("studentCode") ?? "").trim();
    const itemId = String(formData.get("itemId") ?? "").trim();
    const file = formData.get("file");

    if (!studentCode || !itemId || !(file instanceof File)) {
      return createAppErrorResponse("INVALID_PAYLOAD", WORKSHEET_ERR_BAD_REQUEST, 400);
    }

    const ctx = await loadWorksheetTakeContext(id, assignmentId, studentCode);
    if (ctx.kind !== "ok") {
      const status = ctx.kind === "already_submitted" ? 409 : ctx.status;
      const code = status === 404 ? "NOT_FOUND" : status === 403 ? "FORBIDDEN" : "INVALID_PAYLOAD";
      const message = ctx.kind === "already_submitted" ? "Worksheet already submitted" : ctx.message;
      return createAppErrorResponse(code, message, status);
    }

    const item = ctx.worksheet.pages.flatMap((page) => page.items).find((entry) => entry.id === itemId);
    if (!item || (item.type !== "file_upload" && item.type !== "speaking")) {
      return createAppErrorResponse("INVALID_PAYLOAD", WORKSHEET_ERR_BAD_REQUEST, 400);
    }

    if (item.type === "file_upload" && !fileMatchesAllowedType(file.type, item.allowedType)) {
      return createAppErrorResponse("UNSUPPORTED_FILE_TYPE", "Unsupported file type", 415);
    }
    if (item.type === "speaking" && !AUDIO_MIME_TYPES.has(file.type)) {
      return createAppErrorResponse("UNSUPPORTED_FILE_TYPE", "Unsupported file type", 415);
    }
    if (file.size > getMaxSizeForMimeType(file.type)) {
      return createAppErrorResponse("FILE_TOO_LARGE", "File too large", 413);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "worksheet-submissions");
    await mkdir(uploadDir, { recursive: true });

    const extension = FILE_EXTENSION_BY_MIME[file.type] ?? path.extname(file.name) || ".bin";
    const fileName = `${assignmentId}-${ctx.studentId}-${itemId}-${crypto.randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, bytes);

    return NextResponse.json({
      url: `/uploads/worksheet-submissions/${fileName}`,
      fileName,
      originalFileName: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("[WORKSHEET_UPLOAD]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
