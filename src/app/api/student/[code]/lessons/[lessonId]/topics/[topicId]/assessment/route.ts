import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import {
    matchesLessonAssessmentAttempt,
    parseLessonAssessmentQuestions,
    toLessonAssessmentQuestionViews,
} from "@/lib/lessons/lesson-assessment"
import {
    matchesLessonCertificate,
    summarizeIssuedLessonCertificate,
} from "@/lib/lessons/lesson-certificate"
import { getTopicAssessmentByTopicId, isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; lessonId: string; topicId: string }> }

export async function GET(_req: Request, { params }: Params) {
    try {
        const { code, lessonId, topicId } = await params
        const trimmedCode = code.trim()
        const trimmedTopicId = topicId.trim()
        if (!trimmedCode) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student code is required", 400)
        }
        if (!trimmedTopicId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Topic id is required", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true, classId: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const assignment = await db.lessonAssignment.findUnique({
            where: { lessonId_classId: { lessonId, classId: student.classId } },
            select: {
                id: true,
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        content: true,
                    },
                },
            },
        })
        if (!assignment || assignment.lesson.status !== "PUBLISHED" || !isLessonContentV2(assignment.lesson.content)) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found or not published", 404)
        }

        const topicEntry = getTopicAssessmentByTopicId(assignment.lesson.content, trimmedTopicId)
        if (!topicEntry?.assessment.questionSetId) {
            return createAppErrorResponse("NOT_FOUND", "Topic assessment not found", 404)
        }

        const questionSet = await db.questionSet.findUnique({
            where: { id: topicEntry.assessment.questionSetId },
            select: { id: true, title: true, questions: true },
        })
        if (!questionSet) {
            return createAppErrorResponse("NOT_FOUND", "Question set not found", 404)
        }

        const parsedQuestions = parseLessonAssessmentQuestions(questionSet.questions)
        if (!parsedQuestions) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Question set data is invalid", 400)
        }

        const attempts = await db.lessonAssessmentAttempt.findMany({
            where: {
                lessonId: assignment.lesson.id,
                studentId: student.id,
            },
            select: {
                id: true,
                questionSetId: true,
                assessmentSourceType: true,
                topicId: true,
                topicAssessmentId: true,
                score: true,
                maxScore: true,
                passed: true,
                attemptNumber: true,
                rewardGrantedAt: true,
                rewardSnapshot: true,
                certificateIssuedAt: true,
                completedAt: true,
            },
            orderBy: { completedAt: "desc" },
        })
        const topicAttempts = attempts.filter((attempt) =>
            matchesLessonAssessmentAttempt({
                attempt,
                assessment: topicEntry.assessment,
                topicId: topicEntry.topicId,
            })
        )

        const latestAttempt = topicAttempts[0] ?? null
        const hasPassed = topicAttempts.some((attempt) => attempt.passed)
        const rewardedAttempt = topicAttempts.find((attempt) => attempt.rewardGrantedAt) ?? null
        const canAttempt = topicEntry.assessment.allowRetake !== false || topicAttempts.length === 0

        const issuedCertificates = topicEntry.assessment.certificate?.enabled
            ? await db.lessonCertificate.findMany({
                  where: {
                      lessonId: assignment.lesson.id,
                      studentId: student.id,
                  },
                  select: {
                      id: true,
                      title: true,
                      description: true,
                      certificateCode: true,
                      issuedAt: true,
                      certificateScope: true,
                      topicId: true,
                      topicAssessmentId: true,
                      criteriaSnapshot: true,
                  },
                  orderBy: { issuedAt: "desc" },
              })
            : []

        const topicCertificate =
            issuedCertificates.find((certificate) =>
                matchesLessonCertificate({
                    certificate,
                    assessment: topicEntry.assessment,
                    topicId: topicEntry.topicId,
                })
            ) ?? null

        return NextResponse.json({
            topic: {
                id: topicEntry.topicId,
                title: topicEntry.topicTitle,
            },
            assessment: {
                id: topicEntry.assessment.id,
                title: topicEntry.assessment.title,
                passScore: topicEntry.assessment.passScore ?? null,
                allowRetake: topicEntry.assessment.allowRetake !== false,
                questionSetId: topicEntry.assessment.questionSetId,
                questionSetTitle: questionSet.title,
                source: topicEntry.assessment.source,
                reward: topicEntry.assessment.reward ?? null,
                certificate: topicEntry.assessment.certificate ?? null,
            },
            questions: toLessonAssessmentQuestionViews(parsedQuestions),
            latestAttempt,
            attemptCount: topicAttempts.length,
            hasPassed,
            canAttempt,
            rewardStatus: rewardedAttempt
                ? {
                      awarded: true,
                      awardedAt: rewardedAttempt.rewardGrantedAt,
                      reward: rewardedAttempt.rewardSnapshot,
                  }
                : {
                      awarded: false,
                      awardedAt: null,
                      reward: null,
                  },
            certificateStatus: {
                enabled: topicEntry.assessment.certificate?.enabled === true,
                issued: Boolean(topicCertificate),
                certificate: summarizeIssuedLessonCertificate(topicCertificate),
            },
        })
    } catch (error) {
        console.error("[STUDENT_TOPIC_ASSESSMENT_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch topic assessment", 500)
    }
}
