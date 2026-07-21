import type { LessonMediaBlock } from "@/lib/lessons/lesson-content"
import type { TeachingMediaReference } from "@/lib/teaching-media-reference"

export type RenderLessonSection = {
    id: string
    heading: string
    content: string
    media?: LessonMediaBlock[]
}

export type RenderLessonTopic = {
    id: string
    title: string
    description?: string
    documents?: TeachingMediaReference[]
    media?: LessonMediaBlock[]
    objectives: string[]
    sections: RenderLessonSection[]
}

export type RenderLessonContent = {
    objectives: string[]
    sections: RenderLessonSection[]
    topics: RenderLessonTopic[]
    documents: TeachingMediaReference[]
    allMedia: LessonMediaBlock[]
    heroMedia: LessonMediaBlock | null
    heroMediaId: string | null
    heroTopicId: string | null
    mediaTopicMap: Record<string, string>
    estimatedMinutes?: number
}

export type AssignedLesson = {
    id: string
    lesson: {
        id: string
        title: string
        subject: string | null
        gradeLevel: string | null
        content: unknown
    }
    completions: Array<{ completedAt: string; quizScore: number | null }>
    assessmentStatus?: {
        available: boolean
        title: string | null
        passScore: number | null
        attempted: boolean
        hasPassed: boolean
        attemptCount: number
        pendingAssessmentIds?: string[]
        latestAttempt: {
            score: number
            maxScore: number
            passed: boolean
            attemptNumber: number
            completedAt: string
        } | null
    }
    progressSummary?: {
        isCompleted: boolean
        contentCompleted: boolean
        requiredAssessmentPassed: boolean
        completionEligible: boolean
        nextRequiredAction: "NONE" | "CONTENT" | "ASSESSMENT"
        percent: number
        totalTopics: number
        completedTopics: number
        resumeTopicId: string | null
        resumeMode: "CONTENT" | "ASSESSMENT" | "REVIEW" | "DONE"
        completedVideoTopicIds: string[]
        pendingVideoTopicIds: string[]
        acknowledgedTopicIds: string[]
        pendingAcknowledgementTopicIds: string[]
        passedTopicAssessmentIds: string[]
        pendingTopicAssessmentIds: string[]
        failedTopicAssessmentIds: string[]
        totalTrackableVideoTopics: number
        completedTrackableVideoTopics: number
        topicStatuses: Array<{
            topicId: string
            hasVideoRequirement: boolean
            hasAssessmentRequirement: boolean
            hasAcknowledgementRequirement: boolean
            acknowledged: boolean
            contentCompleted: boolean
            assessmentCompleted: boolean
            completed: boolean
            nextRequiredAction: "NONE" | "CONTENT" | "ASSESSMENT"
            assessmentId: string | null
        }>
        assessmentStatus: {
            available: boolean
            totalAssessments: number
            passedAssessments: number
            pendingAssessmentIds: string[]
            passedAssessmentIds: string[]
            failedAssessmentIds: string[]
        }
    }
}

export type CurriculumTopic = {
    id: string
    title: string
    sectionCount: number
    hasAssessment: boolean
}

export type CurriculumLesson = {
    lessonId: string
    title: string
    estimatedMinutes?: number
    isCompleted: boolean
    unitTitle?: string
    topics: CurriculumTopic[]
}

export type StudentLessonTab = "content" | "objectives" | "docs" | "assessment"

export type VideoWatchStatus = { percent: number; completed: boolean }

export type VideoWatchReport = {
    percent: number
    completed: boolean
    justCompleted: boolean
}
