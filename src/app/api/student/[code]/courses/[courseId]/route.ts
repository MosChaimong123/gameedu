import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { evaluateCourseCertificateEligibility, summarizeIssuedCourseCertificate } from "@/lib/courses/course-certificate"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { buildCourseProgressSnapshot } from "@/lib/courses/course-progress"
import { db } from "@/lib/db"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; courseId: string }> }

export async function GET(_req: Request, { params }: Params) {
    try {
        const { code, courseId } = await params
        const trimmedCode = code.trim()
        if (!trimmedCode || !courseId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student code and courseId are required", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({
                    loginCode: candidate,
                })),
            },
            select: { id: true, classId: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const assignment = await db.courseAssignment.findFirst({
            where: {
                classId: student.classId,
                courseId,
                status: "ACTIVE",
                course: { status: "PUBLISHED" },
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        description: true,
                        coverImageUrl: true,
                        content: true,
                    },
                },
            },
        })
        if (!assignment || !isCourseContentV1(assignment.course.content)) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }

        const lessonIds = Array.from(
            new Set(assignment.course.content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId)))
        )
        const lessons = lessonIds.length > 0
            ? await db.lesson.findMany({
                  where: { id: { in: lessonIds }, status: "PUBLISHED" },
                  select: {
                      id: true,
                      title: true,
                      subject: true,
                      gradeLevel: true,
                      description: true,
                      content: true,
                  },
              })
            : []
        const lessonsById = new Map(lessons.filter((lesson) => isLessonContentV2(lesson.content)).map((lesson) => [lesson.id, lesson]))
        const progress = await db.courseProgress.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId: student.id,
                },
            },
            select: {
                id: true,
                completedLessonIds: true,
                currentLessonId: true,
                percent: true,
                startedAt: true,
                lastOpenedAt: true,
                completedAt: true,
            },
        })
        const assessmentAttempts = await db.courseAssessmentAttempt.findMany({
            where: {
                courseId,
                studentId: student.id,
            },
            select: {
                assessmentId: true,
                passed: true,
                score: true,
                maxScore: true,
                attemptNumber: true,
                completedAt: true,
            },
            orderBy: [{ assessmentId: "asc" }, { completedAt: "desc" }],
        })
        const issuedCertificate = await db.courseCertificate.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId: student.id,
                },
            },
            select: {
                id: true,
                title: true,
                description: true,
                certificateCode: true,
                issuedAt: true,
            },
        })
        const passedAssessmentIds = assessmentAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.assessmentId)
        const normalizedProgress = buildCourseProgressSnapshot({
            content: assignment.course.content,
            progress,
            passedAssessmentIds,
        })
        const certificateEligibility = evaluateCourseCertificateEligibility({
            content: assignment.course.content,
            completedLessonIds: normalizedProgress.completedLessonIds,
            assessmentAttempts: assessmentAttempts.map((attempt) => ({
                assessmentId: attempt.assessmentId,
                passed: attempt.passed,
            })),
        })

        return NextResponse.json({
            ...assignment,
            studentId: student.id,
            progress: normalizedProgress,
            orderedLessons: assignment.course.content.modules.map((module) => ({
                id: module.id,
                title: module.title,
                description: module.description,
                order: module.order,
                lessons: module.lessons
                    .flatMap((ref) => {
                        const lesson = lessonsById.get(ref.lessonId)
                        return lesson ? [{ ref, lesson }] : []
                    }),
            })),
            certificate: {
                config: assignment.course.content.certificate ?? null,
                eligibility: certificateEligibility,
                issued: summarizeIssuedCourseCertificate(issuedCertificate),
            },
            assessmentAttempts,
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch student course", 500)
    }
}
