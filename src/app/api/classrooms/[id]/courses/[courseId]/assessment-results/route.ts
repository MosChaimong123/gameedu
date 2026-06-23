import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { getCourseAssessmentById, parseCourseAssessmentQuestions } from "@/lib/courses/course-assessment"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { isTeacherOrAdmin } from "@/lib/role-guards"

type Params = { params: Promise<{ id: string; courseId: string }> }

export async function GET(_req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id: classId, courseId } = await params
        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { id: true, teacherId: true },
        })
        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404)
        }
        if (classroom.teacherId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const courseAssignment = await db.courseAssignment.findFirst({
            where: {
                classId,
                courseId,
            },
            select: {
                id: true,
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
        const courseContent = courseAssignment.course.content
        const students = await db.student.findMany({
            where: { classId },
            select: {
                id: true,
                name: true,
                nickname: true,
                loginCode: true,
            },
            orderBy: { name: "asc" },
        })
        const searchParams = new URL(_req.url).searchParams
        const statusFilter = searchParams.get("status")
        const selectedAssessmentId = searchParams.get("assessmentId")

        const attempts = await db.courseAssessmentAttempt.findMany({
            where: {
                classId,
                courseId,
                ...(selectedAssessmentId ? { assessmentId: selectedAssessmentId } : {}),
            },
            select: {
                id: true,
                assessmentId: true,
                studentId: true,
                score: true,
                maxScore: true,
                passed: true,
                attemptNumber: true,
                answers: true,
                completedAt: true,
            },
            orderBy: [{ assessmentId: "asc" }, { completedAt: "desc" }],
        })
        const questionSetIds = Array.from(
            new Set(
                (courseContent.assessments ?? [])
                    .filter((assessment) => !selectedAssessmentId || assessment.id === selectedAssessmentId)
                    .map((assessment) => assessment.questionSetId)
                    .filter((value): value is string => Boolean(value))
            )
        )
        const questionSets =
            questionSetIds.length > 0
                ? await db.questionSet.findMany({
                      where: { id: { in: questionSetIds } },
                      select: {
                          id: true,
                          title: true,
                          questions: true,
                      },
                  })
                : []
        const questionSetById = new Map(questionSets.map((set) => [set.id, set]))
        const studentById = new Map(students.map((student) => [student.id, student]))
        const studentCount = students.length

        const assessments = (courseContent.assessments ?? [])
            .filter((assessment) => !selectedAssessmentId || assessment.id === selectedAssessmentId)
            .map((assessment) => {
                const assessmentAttempts = attempts.filter((attempt) => attempt.assessmentId === assessment.id)
                const attemptsByStudentId = new Map<string, typeof assessmentAttempts>()
                for (const attempt of assessmentAttempts) {
                    const current = attemptsByStudentId.get(attempt.studentId) ?? []
                    current.push(attempt)
                    attemptsByStudentId.set(attempt.studentId, current)
                }

                const questionSet = assessment.questionSetId ? questionSetById.get(assessment.questionSetId) ?? null : null
                const parsedQuestions = questionSet ? parseCourseAssessmentQuestions(questionSet.questions) : null
                const studentResults = students
                    .map((student) => {
                        const rows = attemptsByStudentId.get(student.id) ?? []
                        const latestAttempt = rows[0] ?? null
                        const hasPassed = rows.some((attempt) => attempt.passed)
                        const status = hasPassed ? "PASSED" : latestAttempt ? "FAILED" : "NOT_STARTED"
                        return {
                            studentId: student.id,
                            studentName: student.name,
                            studentNickname: student.nickname,
                            studentLoginCode: student.loginCode,
                            attemptCount: rows.length,
                            hasPassed,
                            status,
                            latestAttempt: latestAttempt
                                ? {
                                      id: latestAttempt.id,
                                      score: latestAttempt.score,
                                      maxScore: latestAttempt.maxScore,
                                      passed: latestAttempt.passed,
                                      attemptNumber: latestAttempt.attemptNumber,
                                      completedAt: latestAttempt.completedAt,
                                  }
                                : null,
                            intervention:
                                status === "FAILED"
                                    ? "REVIEW_NOW"
                                    : status === "NOT_STARTED"
                                      ? "REMIND_TO_START"
                                      : "NONE",
                        }
                    })
                    .filter((student) => {
                        if (statusFilter === "passed") return student.status === "PASSED"
                        if (statusFilter === "failed") return student.status === "FAILED"
                        if (statusFilter === "not_started") return student.status === "NOT_STARTED"
                        return true
                    })

                const submittedCount = attemptsByStudentId.size
                const passedCount = Array.from(attemptsByStudentId.values()).filter((rows) => rows.some((attempt) => attempt.passed)).length
                const failedCount = Array.from(attemptsByStudentId.values()).filter((rows) => rows.length > 0 && !rows.some((attempt) => attempt.passed)).length
                const notStartedCount = Math.max(0, studentCount - submittedCount)

                const questionInsights =
                    parsedQuestions?.map((question, index) => {
                        let responseCount = 0
                        let incorrectCount = 0
                        for (const attempt of assessmentAttempts) {
                            if (!Array.isArray(attempt.answers)) continue
                            const answer = attempt.answers[index]
                            if (!Number.isInteger(answer)) continue
                            responseCount += 1
                            if (answer !== question.correctAnswer) incorrectCount += 1
                        }
                        return {
                            questionId: question.id,
                            question: question.question,
                            responseCount,
                            incorrectCount,
                            accuracyPercent: responseCount > 0 ? Math.round(((responseCount - incorrectCount) / responseCount) * 100) : null,
                        }
                    }).sort((left, right) => right.incorrectCount - left.incorrectCount).slice(0, 5) ?? []

                return {
                    ...assessment,
                    moduleTitle: assessment.moduleId
                        ? courseContent.modules.find((module) => module.id === assessment.moduleId)?.title ?? null
                        : null,
                    existsInCourse: Boolean(getCourseAssessmentById(courseContent, assessment.id)),
                    questionSetTitle: questionSet?.title ?? null,
                    totalQuestions: parsedQuestions?.length ?? 0,
                    summary: {
                        studentCount,
                        submittedCount,
                        passedCount,
                        failedCount,
                        notStartedCount,
                    },
                    questionInsights,
                    students: studentResults,
                }
            })

        const summary = {
            assessmentCount: assessments.length,
            studentCount,
            submittedCount: assessments.reduce((sum, assessment) => sum + assessment.summary.submittedCount, 0),
            passedCount: assessments.reduce((sum, assessment) => sum + assessment.summary.passedCount, 0),
            failedCount: assessments.reduce((sum, assessment) => sum + assessment.summary.failedCount, 0),
            notStartedCount: assessments.reduce((sum, assessment) => sum + assessment.summary.notStartedCount, 0),
        }

        return NextResponse.json({
            course: {
                id: courseAssignment.course.id,
                title: courseAssignment.course.title,
            },
            summary,
            assessments,
        })
    } catch (error) {
        console.error("[CLASSROOM_COURSE_ASSESSMENT_RESULTS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to load course assessment results", 500)
    }
}
