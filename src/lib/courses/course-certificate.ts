import type { CourseAssessmentAttempt, CourseCertificate } from "@prisma/client"
import type { CourseCertificateConfigV1, CourseContentV1 } from "@/lib/courses/course-content"
import { buildCourseProgressSnapshot } from "@/lib/courses/course-progress"

export type CourseCertificateEligibility = {
    eligible: boolean
    reasons: string[]
    requiredAssessmentIds: string[]
    passedAssessmentIds: string[]
}

export function getCourseCertificateConfig(content: CourseContentV1): CourseCertificateConfigV1 | null {
    return content.certificate?.enabled ? content.certificate : null
}

export function buildCourseCertificateCode(courseId: string, studentId: string) {
    return `TPC-${courseId.slice(-6).toUpperCase()}-${studentId.slice(-6).toUpperCase()}`
}

export function evaluateCourseCertificateEligibility(input: {
    content: CourseContentV1
    completedLessonIds: string[]
    assessmentAttempts: Pick<CourseAssessmentAttempt, "assessmentId" | "passed">[]
}) {
    const certificate = getCourseCertificateConfig(input.content)
    if (!certificate) {
        return {
            eligible: false,
            reasons: ["Certificate is not enabled for this course."],
            requiredAssessmentIds: [],
            passedAssessmentIds: [],
        } satisfies CourseCertificateEligibility
    }

    const reasons: string[] = []
    const requiredAssessmentIds = certificate.requiredAssessmentIds ?? []
    const passedAssessmentIds = input.assessmentAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.assessmentId)
    const passedAssessmentSet = new Set(passedAssessmentIds)

    const progressSnapshot = buildCourseProgressSnapshot({
        content: input.content,
        progress: {
            completedLessonIds: input.completedLessonIds,
        },
        passedAssessmentIds,
    })

    if (!progressSnapshot.courseCompleted) {
        reasons.push("Course completion is required.")
    }

    for (const assessmentId of requiredAssessmentIds) {
        if (!passedAssessmentSet.has(assessmentId)) {
            reasons.push(`Required assessment ${assessmentId} is not passed.`)
        }
    }

    return {
        eligible: reasons.length === 0,
        reasons,
        requiredAssessmentIds,
        passedAssessmentIds,
    } satisfies CourseCertificateEligibility
}

export function buildCourseCertificatePayload(input: {
    content: CourseContentV1
    courseId: string
    courseTitle: string
    studentName: string
    studentId: string
    completedLessonIds: string[]
    assessmentAttempts: Pick<CourseAssessmentAttempt, "assessmentId" | "passed" | "score" | "maxScore">[]
}) {
    const certificate = getCourseCertificateConfig(input.content)
    if (!certificate) return null

    const title = certificate.title?.trim() || input.courseTitle
    const description = certificate.description?.trim() || `Awarded for completing ${input.courseTitle}`
    const criteriaSnapshot = {
        completedLessonIds: input.completedLessonIds,
        requiredAssessmentIds: certificate.requiredAssessmentIds ?? [],
        assessmentAttempts: input.assessmentAttempts.map((attempt) => ({
            assessmentId: attempt.assessmentId,
            passed: attempt.passed,
            score: attempt.score,
            maxScore: attempt.maxScore,
        })),
    }
    const rewardSnapshot = certificate.reward
        ? {
              behaviorPoints: certificate.reward.behaviorPoints ?? 0,
              achievementId: certificate.reward.achievementId ?? null,
              achievementTitle: certificate.reward.achievementTitle ?? null,
          }
        : null

    return {
        title,
        description,
        certificateCode: buildCourseCertificateCode(input.courseId, input.studentId),
        criteriaSnapshot,
        rewardSnapshot,
        studentName: input.studentName,
    }
}

export function summarizeIssuedCourseCertificate(certificate: Pick<CourseCertificate, "id" | "title" | "description" | "certificateCode" | "issuedAt"> | null) {
    if (!certificate) return null
    return {
        id: certificate.id,
        title: certificate.title,
        description: certificate.description ?? null,
        certificateCode: certificate.certificateCode,
        issuedAt: certificate.issuedAt,
    }
}
