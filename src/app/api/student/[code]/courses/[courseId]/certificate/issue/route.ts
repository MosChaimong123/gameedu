import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import {
    buildCourseCertificatePayload,
    evaluateCourseCertificateEligibility,
    summarizeIssuedCourseCertificate,
} from "@/lib/courses/course-certificate"
import { isCourseContentV1, type CourseContentV1 } from "@/lib/courses/course-content"
import { buildCourseProgressSnapshot } from "@/lib/courses/course-progress"
import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; courseId: string }> }

async function getCourseStudentState(code: string, courseId: string) {
    const trimmedCode = code.trim()
    if (!trimmedCode || !courseId) {
        return { error: createAppErrorResponse("INVALID_PAYLOAD", "Student code and courseId are required", 400) }
    }

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({
                loginCode: candidate,
            })),
        },
        select: {
            id: true,
            classId: true,
            name: true,
        },
    })
    if (!student) {
        return { error: createAppErrorResponse("NOT_FOUND", "Student not found", 404) }
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
                    content: true,
                },
            },
        },
    })
    if (!assignment || !isCourseContentV1(assignment.course.content)) {
        return { error: createAppErrorResponse("NOT_FOUND", "Course not found", 404) }
    }

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
        },
        orderBy: [{ assessmentId: "asc" }, { completedAt: "desc" }],
    })

    return {
        trimmedCode,
        student,
        assignment,
        content: assignment.course.content as CourseContentV1,
        progress: buildCourseProgressSnapshot({
            content: assignment.course.content,
            progress,
            passedAssessmentIds: assessmentAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.assessmentId),
        }),
        assessmentAttempts,
    }
}

export async function GET(_req: Request, { params }: Params) {
    try {
        const { code, courseId } = await params
        const state = await getCourseStudentState(code, courseId)
        if ("error" in state) return state.error

        const issued = await db.courseCertificate.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId: state.student.id,
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
        const eligibility = evaluateCourseCertificateEligibility({
            content: state.content,
            completedLessonIds: state.progress.completedLessonIds,
            assessmentAttempts: state.assessmentAttempts.map((attempt) => ({
                assessmentId: attempt.assessmentId,
                passed: attempt.passed,
            })),
        })

        return NextResponse.json({
            eligibility,
            issued: summarizeIssuedCourseCertificate(issued),
            config: state.content.certificate ?? null,
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_CERTIFICATE_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch course certificate", 500)
    }
}

export async function POST(_req: Request, { params }: Params) {
    try {
        const { code, courseId } = await params
        const state = await getCourseStudentState(code, courseId)
        if ("error" in state) return state.error

        const existing = await db.courseCertificate.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId: state.student.id,
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
        if (existing) {
            return NextResponse.json({
                certificate: summarizeIssuedCourseCertificate(existing),
                alreadyIssued: true,
            })
        }

        const eligibility = evaluateCourseCertificateEligibility({
            content: state.content,
            completedLessonIds: state.progress.completedLessonIds,
            assessmentAttempts: state.assessmentAttempts.map((attempt) => ({
                assessmentId: attempt.assessmentId,
                passed: attempt.passed,
            })),
        })
        if (!eligibility.eligible) {
            return createAppErrorResponse("FORBIDDEN", "Course certificate requirements are not met", 403)
        }

        const payload = buildCourseCertificatePayload({
            content: state.content,
            courseId,
            courseTitle: state.assignment.course.title,
            studentName: state.student.name,
            studentId: state.student.id,
            completedLessonIds: state.progress.completedLessonIds,
            assessmentAttempts: state.assessmentAttempts,
        })
        if (!payload) {
            return createAppErrorResponse("NOT_FOUND", "Course certificate is not enabled", 404)
        }

        const behaviorPointReward = Math.max(0, payload.rewardSnapshot?.behaviorPoints ?? 0)
        const achievementId = payload.rewardSnapshot?.achievementId ?? null

        const certificate = await db.$transaction(async (tx) => {
            const created = await tx.courseCertificate.create({
                data: {
                    courseId,
                    studentId: state.student.id,
                    classId: state.student.classId,
                    title: payload.title,
                    description: payload.description,
                    certificateCode: payload.certificateCode,
                    criteriaSnapshot: payload.criteriaSnapshot,
                    rewardSnapshot: payload.rewardSnapshot,
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    certificateCode: true,
                    issuedAt: true,
                },
            })

            if (behaviorPointReward > 0) {
                await tx.student.update({
                    where: { id: state.student.id },
                    data: {
                        behaviorPoints: { increment: behaviorPointReward },
                    },
                })
                await tx.pointHistory.create({
                    data: {
                        studentId: state.student.id,
                        value: behaviorPointReward,
                        reason: `Course certificate reward: ${state.assignment.course.title}`,
                    },
                })
            }

            if (achievementId) {
                await tx.studentAchievement.upsert({
                    where: {
                        studentId_achievementId: {
                            studentId: state.student.id,
                            achievementId,
                        },
                    },
                    create: {
                        studentId: state.student.id,
                        achievementId,
                        goldRewarded: behaviorPointReward,
                    },
                    update: {},
                })
            }

            return created
        })

        await sendNotification({
            studentId: state.student.id,
            type: "SUCCESS",
            link: `/student/${state.trimmedCode}?tab=courses`,
            title: "รับใบรับรองคอร์สแล้ว",
            message: `คุณได้รับใบรับรองจากคอร์ส ${state.assignment.course.title} เรียบร้อยแล้ว`,
        })

        return NextResponse.json({
            certificate: summarizeIssuedCourseCertificate(certificate),
            reward: payload.rewardSnapshot,
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_CERTIFICATE_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to issue course certificate", 500)
    }
}
