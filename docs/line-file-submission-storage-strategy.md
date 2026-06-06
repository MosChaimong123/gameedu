# LINE File Submission Storage Strategy

Status: draft for Phase 7

## Goal

Support future LINE file and image submissions without blocking the current text-only workflow.

## Scope

- Student sends image, PDF, or supported document through LINE
- GameEdu stores metadata for teacher review and export
- Binary payload is stored outside the main database
- Existing text submission flow remains unchanged

## Recommended Design

1. Keep `AssignmentSubmission` as the canonical teacher-facing submission record.
2. Store rich LINE attachment metadata in `AssignmentSubmission.content` or a dedicated attachment model.
3. Store file bytes in configured object storage, not in Prisma JSON or Mongo document blobs.
4. Preserve enough source metadata to trace the original LINE message and re-download only when needed.

## Data Shape

Recommended future attachment record:

```ts
type LineSubmissionAttachment = {
  id: string;
  submissionId: string;
  lineMessageId: string;
  lineContentProvider: "line";
  kind: "image" | "file" | "audio" | "video";
  originalFilename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  checksumSha256: string;
  storageProvider: "s3" | "r2" | "gcs" | "local";
  storageKey: string;
  uploadedAt: string;
};
```

Minimum metadata to preserve:

- `lineMessageId`
- `checksumSha256`
- `mimeType`
- `byteSize`
- `originalFilename`
- `storageKey`
- `uploadedAt`

## Storage Layout

Recommended object key pattern:

```text
line-submissions/{classroomId}/{assignmentId}/{studentId}/{submissionId}/{attachmentId}
```

Benefits:

- Easy cleanup by classroom or assignment
- Stable path even if classroom or student names change
- No unsafe user-provided filename in object key

## Upload Flow

1. Webhook receives LINE message event with attachment-capable message type.
2. Server creates or reuses the target `AssignmentSubmission`.
3. Server downloads binary content from LINE using message id.
4. Server computes SHA-256 checksum before final write.
5. Server uploads the binary to object storage.
6. Server stores attachment metadata linked to the submission.
7. Server replies in LINE with a teacher-review message.

## Validation Rules

- Reject unsupported MIME types by assignment policy
- Enforce per-file size limit before upload completes
- Reject duplicate upload when the same `checksumSha256` already exists for the same submission and message id
- Sanitize displayed filename but keep original in metadata for audit

## Export Expectations

CSV exports should include:

- `hasAttachment`
- `attachmentCount`
- `attachmentKinds`
- `attachmentStorageKeys` or a teacher-safe derived archive path
- `lineMessageId`
- `attachmentChecksumSha256`

Do not export signed download URLs in CSV.

## Security Notes

- Never trust LINE filename or MIME type alone
- Recompute checksum server-side
- Prefer short-lived signed URLs for teacher downloads
- Do not expose raw storage keys to students
- Apply classroom ownership checks before download or export

## Rollout Plan

1. Add attachment metadata schema
2. Add storage adapter interface
3. Support image upload first
4. Add teacher preview/download UI
5. Extend CSV export
6. Add retention and cleanup job

## Non-Goals For Current Phase

- OCR or AI grading for images
- Student download center for LINE attachments
- Full archive ZIP generation
