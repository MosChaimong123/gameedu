"use client"

import { useCallback, useEffect, useState } from "react"

import type { Language } from "@/lib/translations"
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages"

import { extractCurriculumLessons, isLessonContentV2 } from "./student-lesson-player-model"
import type { AssignedLesson, CurriculumLesson } from "./student-lesson-player.types"

type Translate = (key: string, params?: Record<string, string | number>) => string

type UseStudentLessonDataInput = {
    code: string
    lessonId: string
    courseId: string | null
    language: Language
    t: Translate
}

export function useStudentLessonData({ code, lessonId, courseId, language, t }: UseStudentLessonDataInput) {
    const [assignment, setAssignment] = useState<AssignedLesson | null>(null)
    const [curriculumLessons, setCurriculumLessons] = useState<CurriculumLesson[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [completing, setCompleting] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [completeError, setCompleteError] = useState<string | null>(null)
    const [acknowledgingTopicId, setAcknowledgingTopicId] = useState<string | null>(null)
    const [acknowledgementError, setAcknowledgementError] = useState<string | null>(null)

    const loadAssignment = useCallback(async () => {
        const response = await fetch(`/api/student/${code}/lessons/${lessonId}`)
        if (!response.ok) {
            throw new Error(response.status === 404 ? t("lessonLoadNotFound") : t("lessonLoadError"))
        }
        const data = (await response.json()) as AssignedLesson
        if (!isLessonContentV2(data.lesson.content)) {
            throw new Error(t("lessonLegacyUnavailable"))
        }
        setAssignment(data)
        setCompleted(Boolean(data.progressSummary?.isCompleted || data.completions.length > 0))
        return data
    }, [code, lessonId, t])

    useEffect(() => {
        setLoading(true)
        setFetchError(null)
        loadAssignment()
            .catch((error: Error) => setFetchError(error.message))
            .finally(() => setLoading(false))
    }, [loadAssignment])

    useEffect(() => {
        fetch(`/api/student/${code}/lessons`)
            .then((response) => (response.ok ? response.json() : []))
            .then((data: AssignedLesson[]) => setCurriculumLessons(extractCurriculumLessons(data)))
            .catch(() => {})
    }, [code])

    const acknowledgeTopic = useCallback(
        async (topicId: string | null) => {
            if (!topicId || acknowledgingTopicId) return
            setAcknowledgingTopicId(topicId)
            setAcknowledgementError(null)
            try {
                const response = await fetch(
                    `/api/student/${code}/lessons/${lessonId}/topics/${topicId}/content-acknowledgement`,
                    { method: "POST" }
                )
                if (!response.ok) {
                    setAcknowledgementError(t("lessonTopicAcknowledgeError"))
                    return
                }
                await loadAssignment()
            } catch {
                setAcknowledgementError(t("lessonTopicAcknowledgeError"))
            } finally {
                setAcknowledgingTopicId(null)
            }
        },
        [acknowledgingTopicId, code, lessonId, loadAssignment, t]
    )

    const persistCourseLesson = useCallback(async () => {
        if (!courseId) return
        window.localStorage.setItem(`course-progress:${code}:${courseId}:lesson`, lessonId)
        await fetch(`/api/student/${code}/courses/${courseId}/progress`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentLessonId: lessonId }),
        }).catch(() => {})
    }, [code, courseId, lessonId])

    const markComplete = useCallback(async () => {
        if (!assignment) return
        setCompleting(true)
        setCompleteError(null)
        try {
            const endpoint = courseId
                ? `/api/student/${code}/courses/${courseId}/complete`
                : `/api/student/${code}/lessons/${lessonId}/complete`
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(courseId ? { lessonId } : {}),
            })
            if (!response.ok) {
                setCompleteError(
                    await getLocalizedErrorMessageFromResponse(response, "lessonCompleteError", t, language)
                )
                return
            }
            setCompleted(true)
            setAssignment((previous) =>
                previous
                    ? {
                          ...previous,
                          completions: [{ completedAt: new Date().toISOString(), quizScore: null }],
                          progressSummary: previous.progressSummary
                              ? {
                                    ...previous.progressSummary,
                                    isCompleted: true,
                                    completionEligible: true,
                                    nextRequiredAction: "NONE",
                                    percent: 100,
                                }
                              : previous.progressSummary,
                      }
                    : previous
            )
            setCurriculumLessons((previous) =>
                previous.map((lesson) =>
                    lesson.lessonId === lessonId ? { ...lesson, isCompleted: true } : lesson
                )
            )
            await persistCourseLesson()
        } catch {
            setCompleteError(t("lessonCompleteError"))
        } finally {
            setCompleting(false)
        }
    }, [assignment, code, courseId, language, lessonId, persistCourseLesson, t])

    return {
        acknowledgementError,
        acknowledgeTopic,
        acknowledgingTopicId,
        assignment,
        completeError,
        completed,
        completing,
        curriculumLessons,
        fetchError,
        loadAssignment,
        loading,
        markComplete,
    }
}
