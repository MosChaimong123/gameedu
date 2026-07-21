import { db } from "@/lib/db"
import {
    buildLessonAssessmentAttemptSourceMeta,
    matchesLessonAssessmentAttempt,
    normalizeLessonAssessmentReward,
    parseLessonAssessmentQuestions,
    scoreLessonAssessmentAttempt,
} from "@/lib/lessons/lesson-assessment"
import {
    buildLessonCertificatePayload,
    buildLessonCertificateSourceMeta,
    matchesLessonCertificate,
    summarizeIssuedLessonCertificate,
} from "@/lib/lessons/lesson-certificate"
import { getTopicAssessmentByTopicId, isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { sendNotification } from "@/lib/notifications"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

export type SubmitTopicAssessmentAttemptResult =
    | { ok: false; code: "INVALID_PAYLOAD" | "NOT_FOUND" | "FORBIDDEN"; message: string; status: number }
    | { ok: true; body: unknown }

export async function submitTopicAssessmentAttempt(input: {
    code: string
    lessonId: string
    topicId: string
    answers: unknown
}): Promise<SubmitTopicAssessmentAttemptResult> {
    const trimmedCode = input.code.trim()
    const trimmedTopicId = input.topicId.trim()
    if (!trimmedCode) {
        return { ok: false, code: "INVALID_PAYLOAD", message: "Student code is required", status: 400 }
    }
    if (!trimmedTopicId) {
        return { ok: false, code: "INVALID_PAYLOAD", message: "Topic id is required", status: 400 }
    }
    if (!Array.isArray(input.answers)) {
        return { ok: false, code: "INVALID_PAYLOAD", message: "answers must be an array", status: 400 }
    }

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({ loginCode: candidate })),
        },
        select: { id: true, classId: true, name: true },
    })
    if (!student) {
        return { ok: false, code: "NOT_FOUND", message: "Student not found", status: 404 }
    }

    const assignment = await db.lessonAssignment.findUnique({
        where: { lessonId_classId: { lessonId: input.lessonId, classId: student.classId } },
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
        return { ok: false, code: "NOT_FOUND", message: "Lesson not found or not published", status: 404 }
    }

    const topicEntry = getTopicAssessmentByTopicId(assignment.lesson.content, trimmedTopicId)
    const assessment = topicEntry?.assessment
    if (!topicEntry || !assessment?.questionSetId) {
        return { ok: false, code: "NOT_FOUND", message: "Topic assessment not found", status: 404 }
    }

    const existingAttempts = await db.lessonAssessmentAttempt.findMany({
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
            passed: true,
            attemptNumber: true,
        },
        orderBy: { completedAt: "desc" },
    })
    const topicAttempts = existingAttempts.filter((attempt) =>
        matchesLessonAssessmentAttempt({
            attempt,
            assessment,
            topicId: topicEntry.topicId,
        })
    )
    if (assessment.allowRetake === false && topicAttempts.length > 0) {
        return { ok: false, code: "FORBIDDEN", message: "Topic assessment retake is disabled", status: 403 }
    }

    const questionSet = await db.questionSet.findUnique({
        where: { id: assessment.questionSetId },
        select: { questions: true },
    })
    if (!questionSet) {
        return { ok: false, code: "NOT_FOUND", message: "Question set not found", status: 404 }
    }

    const parsedQuestions = parseLessonAssessmentQuestions(questionSet.questions)
    if (!parsedQuestions) {
        return { ok: false, code: "INVALID_PAYLOAD", message: "Question set data is invalid", status: 400 }
    }

    const result = scoreLessonAssessmentAttempt({
        assessment,
        questions: parsedQuestions,
        answers: input.answers as number[],
    })
    if (!result.ok) {
        return { ok: false, code: "INVALID_PAYLOAD", message: result.error, status: 400 }
    }

    const alreadyPassed = topicAttempts.some((attempt) => attempt.passed)
    const rewardSnapshot = normalizeLessonAssessmentReward(assessment.reward)
    const shouldAwardFirstPass = result.passed && !alreadyPassed
    const sourceMeta = buildLessonAssessmentAttemptSourceMeta({
        assessment,
        topicId: topicEntry.topicId,
    })

    const transactionResult = await db.$transaction(async (tx) => {
        const createdAttempt = await tx.lessonAssessmentAttempt.create({
            data: {
                lessonId: assignment.lesson.id,
                questionSetId: assessment.questionSetId,
                assessmentSourceType: sourceMeta.assessmentSourceType,
                topicId: sourceMeta.topicId,
                topicAssessmentId: sourceMeta.topicAssessmentId,
                studentId: student.id,
                classId: student.classId,
                score: result.score,
                maxScore: result.maxScore,
                passed: result.passed,
                attemptNumber: (topicAttempts[0]?.attemptNumber ?? 0) + 1,
                answers: input.answers as number[],
                rewardGrantedAt: shouldAwardFirstPass && rewardSnapshot ? new Date() : null,
                rewardSnapshot: shouldAwardFirstPass && rewardSnapshot ? rewardSnapshot : null,
            },
            select: {
                id: true,
                score: true,
                maxScore: true,
                passed: true,
                attemptNumber: true,
                rewardGrantedAt: true,
                rewardSnapshot: true,
                certificateIssuedAt: true,
                completedAt: true,
            },
        })

        if (shouldAwardFirstPass && rewardSnapshot) {
            const studentUpdateData: {
                behaviorPoints?: { increment: number }
                gold?: { increment: number }
            } = {}

            if (rewardSnapshot.behaviorPoints > 0) studentUpdateData.behaviorPoints = { increment: rewardSnapshot.behaviorPoints }
            if (rewardSnapshot.gold > 0) studentUpdateData.gold = { increment: rewardSnapshot.gold }
            if (Object.keys(studentUpdateData).length > 0) {
                await tx.student.update({ where: { id: student.id }, data: studentUpdateData })
            }
            if (rewardSnapshot.behaviorPoints > 0) {
                await tx.pointHistory.create({
                    data: {
                        studentId: student.id,
                        value: rewardSnapshot.behaviorPoints,
                        reason: `Topic assessment reward: ${assignment.lesson.title} / ${topicEntry.topicTitle}`,
                    },
                })
            }
            if (rewardSnapshot.achievementId) {
                await tx.studentAchievement.upsert({
                    where: {
                        studentId_achievementId: {
                            studentId: student.id,
                            achievementId: rewardSnapshot.achievementId,
                        },
                    },
                    create: {
                        studentId: student.id,
                        achievementId: rewardSnapshot.achievementId,
                        goldRewarded: rewardSnapshot.gold,
                    },
                    update: {},
                })
            }
        }

        let issuedCertificate = null as {
            id: string
            title: string
            description: string | null
            certificateCode: string
            issuedAt: Date
            certificateScope?: string | null
            topicId?: string | null
            topicAssessmentId?: string | null
            criteriaSnapshot?: unknown
        } | null
        if (shouldAwardFirstPass && assessment.certificate?.enabled) {
            const certificateSourceMeta = buildLessonCertificateSourceMeta({ assessment, topicId: topicEntry.topicId })
            const existingCertificates = await tx.lessonCertificate.findMany({
                where: { lessonId: assignment.lesson.id, studentId: student.id },
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
            const existingCertificate =
                existingCertificates.find((certificate) =>
                    matchesLessonCertificate({ certificate, assessment, topicId: topicEntry.topicId })
                ) ?? null

            if (existingCertificate) {
                issuedCertificate = existingCertificate
                await tx.lessonAssessmentAttempt.update({
                    where: { id: createdAttempt.id },
                    data: { certificateIssuedAt: existingCertificate.issuedAt },
                })
            } else {
                const certificatePayload = buildLessonCertificatePayload({
                    lessonId: assignment.lesson.id,
                    lessonTitle: `${assignment.lesson.title} - ${topicEntry.topicTitle}`,
                    studentId: student.id,
                    studentName: student.name,
                    assessment,
                    attempt: createdAttempt,
                    rewardSnapshot,
                    topicId: topicEntry.topicId,
                    topicTitle: topicEntry.topicTitle,
                })
                if (certificatePayload) {
                    issuedCertificate = await tx.lessonCertificate.create({
                        data: {
                            lessonId: assignment.lesson.id,
                            studentId: student.id,
                            classId: student.classId,
                            certificateScope: certificateSourceMeta.certificateScope,
                            topicId: certificateSourceMeta.topicId,
                            topicAssessmentId: certificateSourceMeta.topicAssessmentId,
                            title: certificatePayload.title,
                            description: certificatePayload.description,
                            certificateCode: certificatePayload.certificateCode,
                            criteriaSnapshot: certificatePayload.criteriaSnapshot,
                            rewardSnapshot: certificatePayload.rewardSnapshot,
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
                    })
                    await tx.lessonAssessmentAttempt.update({
                        where: { id: createdAttempt.id },
                        data: { certificateIssuedAt: issuedCertificate.issuedAt },
                    })
                }
            }
        }

        return {
            createdAttempt: {
                ...createdAttempt,
                certificateIssuedAt: issuedCertificate?.issuedAt ?? createdAttempt.certificateIssuedAt,
            },
            reward: shouldAwardFirstPass ? rewardSnapshot : null,
            certificate: issuedCertificate,
        }
    })

    if (shouldAwardFirstPass) {
        const rewardParts = transactionResult.reward
            ? [
                  (transactionResult.reward.behaviorPoints ?? 0) > 0 ? `+${transactionResult.reward.behaviorPoints} เนเธ•เนเธก` : null,
                  (transactionResult.reward.gold ?? 0) > 0 ? `+${transactionResult.reward.gold} เธ—เธญเธ` : null,
                  transactionResult.reward.achievementTitle ? `Achievement ${transactionResult.reward.achievementTitle}` : null,
              ].filter(Boolean)
            : []
        const rewardLine = rewardParts.length > 0 ? `เธฃเธฒเธเธงเธฑเธฅ ${rewardParts.join(" / ")}` : "เธเนเธฒเธเนเธเธเธ—เธ”เธชเธญเธเนเธฅเนเธง"
        const certificateLine = transactionResult.certificate ? ` / เนเธเธฃเธฑเธเธฃเธญเธ ${transactionResult.certificate.certificateCode}` : ""

        await sendNotification({
            studentId: student.id,
            type: "SUCCESS",
            link: `/student/${trimmedCode}/lessons/${input.lessonId}`,
            title: "เธชเธญเธเธเนเธฒเธเนเธเธเธ—เธ”เธชเธญเธเธซเธฑเธงเธเนเธญเนเธฅเนเธง",
            message: `${assignment.lesson.title} / ${topicEntry.topicTitle} - ${rewardLine}${certificateLine}`,
        })
    }

    return {
        ok: true,
        body: {
            topic: { id: topicEntry.topicId, title: topicEntry.topicTitle },
            attempt: {
                ...transactionResult.createdAttempt,
                passScore: result.passScore,
                correct: result.correct,
                total: result.total,
            },
            reward: transactionResult.reward,
            certificate: summarizeIssuedLessonCertificate(transactionResult.certificate),
            firstPassAwarded: shouldAwardFirstPass,
        },
    }
}
