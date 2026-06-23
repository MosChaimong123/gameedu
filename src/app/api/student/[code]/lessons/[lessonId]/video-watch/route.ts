import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; lessonId: string }> }

// GET /api/student/[code]/lessons/[lessonId]/video-watch
// ดึงสถานะการดูวิดีโอทุก topic ของบทเรียนนี้สำหรับนักเรียน
export async function GET(_req: Request, { params }: Params) {
    try {
        const { code, lessonId } = await params

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

        const watches = await db.topicVideoWatch.findMany({
            where: { studentId: student.id, lessonId },
            select: {
                topicId: true,
                mediaId: true,
                watchedSeconds: true,
                totalSeconds: true,
                completedAt: true,
            },
        })

        return NextResponse.json({
            watches: watches.map((w) => ({
                topicId: w.topicId,
                mediaId: w.mediaId,
                watchedSeconds: w.watchedSeconds,
                totalSeconds: w.totalSeconds,
                percent: w.totalSeconds > 0 ? Math.round((w.watchedSeconds / w.totalSeconds) * 100) : 0,
                completed: w.completedAt !== null,
            })),
        })
    } catch (error) {
        console.error("[TOPIC_VIDEO_WATCH_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch video watch status", 500)
    }
}
