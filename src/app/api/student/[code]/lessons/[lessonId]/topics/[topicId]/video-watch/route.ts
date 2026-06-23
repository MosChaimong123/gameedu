import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; lessonId: string; topicId: string }> }

// ─── Range helpers ────────────────────────────────────────────────────────────

type Range = [number, number]

function mergeRanges(ranges: Range[]): Range[] {
    if (ranges.length === 0) return []
    const sorted = [...ranges].sort((a, b) => a[0] - b[0])
    const merged: Range[] = [sorted[0]!]
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1]!
        const current = sorted[i]!
        if (current[0] <= last[1]) {
            last[1] = Math.max(last[1], current[1])
        } else {
            merged.push(current)
        }
    }
    return merged
}

function sumRanges(ranges: Range[]): number {
    return ranges.reduce((sum, [start, end]) => sum + Math.max(0, end - start), 0)
}

function isRangeArray(value: unknown): value is Range[] {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                Array.isArray(item) &&
                item.length === 2 &&
                typeof item[0] === "number" &&
                typeof item[1] === "number" &&
                item[0] >= 0 &&
                item[1] >= item[0]
        )
    )
}

const COMPLETION_THRESHOLD = 0.8

// ─── Route handler ────────────────────────────────────────────────────────────

// PATCH /api/student/[code]/lessons/[lessonId]/topics/[topicId]/video-watch
// บันทึก interval ranges ที่นักเรียนดูวิดีโอจริง — merge กับ ranges เดิมใน DB
export async function PATCH(req: Request, { params }: Params) {
    try {
        const { code, lessonId, topicId } = await params

        const body = await req.json() as {
            mediaId?: unknown
            watchedRanges?: unknown
            totalSeconds?: unknown
        }

        const { mediaId, watchedRanges, totalSeconds } = body

        if (typeof mediaId !== "string" || !mediaId.trim()) {
            return createAppErrorResponse("INVALID_PAYLOAD", "mediaId is required", 400)
        }
        if (!isRangeArray(watchedRanges) || watchedRanges.length === 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "watchedRanges must be a non-empty array of [start, end] pairs", 400)
        }
        if (typeof totalSeconds !== "number" || totalSeconds <= 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "totalSeconds must be a positive number", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(code.trim()).map((candidate) => ({
                    loginCode: candidate,
                })),
            },
            select: { id: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        // ตรวจสอบว่า lesson มีอยู่จริงและ assigned ให้นักเรียนนี้
        const lesson = await db.lesson.findUnique({
            where: { id: lessonId },
            select: { id: true },
        })
        if (!lesson) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found", 404)
        }

        // โหลด record เดิม (ถ้ามี) เพื่อ merge ranges
        const existing = await db.topicVideoWatch.findUnique({
            where: {
                studentId_lessonId_topicId: {
                    studentId: student.id,
                    lessonId,
                    topicId,
                },
            },
            select: { watchedRanges: true, completedAt: true },
        })

        // merge ranges เดิม + ใหม่
        const existingRanges = isRangeArray(existing?.watchedRanges) ? existing.watchedRanges : []
        const merged = mergeRanges([...existingRanges, ...watchedRanges])
        const watchedSeconds = sumRanges(merged)
        const percent = totalSeconds > 0 ? watchedSeconds / totalSeconds : 0
        const nowCompleted = percent >= COMPLETION_THRESHOLD
        const completedAt =
            existing?.completedAt ?? (nowCompleted ? new Date() : null)

        const record = await db.topicVideoWatch.upsert({
            where: {
                studentId_lessonId_topicId: {
                    studentId: student.id,
                    lessonId,
                    topicId,
                },
            },
            create: {
                studentId: student.id,
                lessonId,
                topicId,
                mediaId: mediaId.trim(),
                watchedRanges: merged as unknown as object,
                watchedSeconds,
                totalSeconds,
                completedAt,
            },
            update: {
                mediaId: mediaId.trim(),
                watchedRanges: merged as unknown as object,
                watchedSeconds,
                totalSeconds,
                ...(completedAt ? { completedAt } : {}),
            },
            select: {
                topicId: true,
                mediaId: true,
                watchedSeconds: true,
                totalSeconds: true,
                completedAt: true,
            },
        })

        return NextResponse.json({
            topicId: record.topicId,
            mediaId: record.mediaId,
            watchedSeconds: record.watchedSeconds,
            totalSeconds: record.totalSeconds,
            percent: Math.round(percent * 100),
            completed: record.completedAt !== null,
            justCompleted: nowCompleted && !existing?.completedAt,
        })
    } catch (error) {
        console.error("[TOPIC_VIDEO_WATCH_PATCH]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to save video watch progress", 500)
    }
}
