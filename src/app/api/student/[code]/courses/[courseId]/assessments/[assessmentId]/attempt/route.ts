import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { getCourseAssessmentById, parseCourseAssessmentQuestions, scoreCourseAssessmentAttempt } from "@/lib/courses/course-assessment"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; courseId: string; assessmentId: string }> }

export async function POST(req: Request, { params }: Params) {
    try {
        const { code, courseId, assessmentId } = await params
        const body = (await req.json()) as { answers?: unknown }
        if (!Array.isArray(body.answers)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "answers must be an array", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true, classId: true, name: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const courseAssignment = await db.courseAssignment.findFirst({
            where: {
                classId: student.classId,
                courseId,
                status: "ACTIVE",
            },
            select: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                    },
                },
            },
        })
        if (!courseAssignment || !isCourseContentV1(courseAssignment.course.content)) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }

        const assessment = getCourseAssessmentById(courseAssignment.course.content, assessmentId)
        if (!assessment || !assessment.questionSetId) {
            return createAppErrorResponse("NOT_FOUND", "Assessment not found", 404)
        }

        const questionSet = await db.questionSet.findUnique({
            where: { id: assessment.questionSetId },
            select: { id: true, questions: true },
        })
        if (!questionSet) {
            return createAppErrorResponse("NOT_FOUND", "Question set not found", 404)
        }

        const questions = parseCourseAssessmentQuestions(questionSet.questions)
        if (!questions || questions.length === 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Assessment question set is invalid", 400)
        }

        const existingAttempt = await db.courseAssessmentAttempt.findUnique({
            where: {
                courseId_assessmentId_studentId: {
                    courseId,
                    assessmentId,
                    studentId: student.id,
                },
            },
            select: { id: true, attemptNumber: true, passed: true },
        })

        if (existingAttempt && assessment.allowRetake === false) {
            return createAppErrorResponse("FORBIDDEN", "Retake is disabled for this assessment", 403)
        }

        const result = scoreCourseAssessmentAttempt({
            assessment,
            questions,
            answers: body.answers as number[],
        })
        if (!result.ok) {
            return createAppErrorResponse("INVALID_PAYLOAD", result.error, 400)
        }

        const completedAt = new Date()
        const attempt = await db.courseAssessmentAttempt.upsert({
            where: {
                courseId_assessmentId_studentId: {
                    courseId,
                    assessmentId,
                    studentId: student.id,
                },
            },
            create: {
                courseId,
                assessmentId,
                questionSetId: questionSet.id,
                studentId: student.id,
                classId: student.classId,
                score: result.score,
                maxScore: result.maxScore,
                passed: result.passed,
                status: "COMPLETED",
                attemptNumber: 1,
                answers: body.answers,
                startedAt: completedAt,
                completedAt,
            },
            update: {
                questionSetId: questionSet.id,
                score: result.score,
                maxScore: result.maxScore,
                passed: result.passed,
                status: "COMPLETED",
                attemptNumber: (existingAttempt?.attemptNumber ?? 0) + 1,
                answers: body.answers,
                completedAt,
            },
        })

        return NextResponse.json({
            attempt: {
                id: attempt.id,
                score: attempt.score,
                maxScore: attempt.maxScore,
                passed: attempt.passed,
                attemptNumber: attempt.attemptNumber,
                completedAt: attempt.completedAt,
            },
            result: {
                score: result.score,
                maxScore: result.maxScore,
                correct: result.correct,
                total: result.total,
                passScore: result.passScore,
                passed: result.passed,
            },
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_ASSESSMENT_ATTEMPT_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to submit course assessment", 500)
    }
}
