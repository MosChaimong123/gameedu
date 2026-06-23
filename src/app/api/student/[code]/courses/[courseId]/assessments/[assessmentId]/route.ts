import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { getCourseAssessmentById, parseCourseAssessmentQuestions, toCourseAssessmentQuestionViews } from "@/lib/courses/course-assessment"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; courseId: string; assessmentId: string }> }

export async function GET(_req: Request, { params }: Params) {
    try {
        const { code, courseId, assessmentId } = await params

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
            select: { id: true, title: true, questions: true },
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
            select: {
                id: true,
                score: true,
                maxScore: true,
                passed: true,
                attemptNumber: true,
                completedAt: true,
            },
        })

        return NextResponse.json({
            assessment: {
                ...assessment,
                courseId,
                courseTitle: courseAssignment.course.title,
                questionSetTitle: questionSet.title,
                totalQuestions: questions.length,
            },
            attempt: existingAttempt,
            questions: toCourseAssessmentQuestionViews(questions),
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_ASSESSMENT_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to load course assessment", 500)
    }
}
