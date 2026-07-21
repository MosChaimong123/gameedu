"use client"

import { useCallback, useEffect, useState } from "react"

import type { VideoWatchReport, VideoWatchStatus } from "./student-lesson-player.types"

export function videoWatchKey(topicId: string, mediaId: string) {
    return `${topicId}:${mediaId}`
}

export function useTopicVideoProgress(studentCode: string, lessonId: string) {
    const [watchMap, setWatchMap] = useState<Map<string, VideoWatchStatus>>(new Map())

    useEffect(() => {
        fetch(`/api/student/${studentCode}/lessons/${lessonId}/video-watch`)
            .then((response) =>
                response.ok
                    ? (response.json() as Promise<{
                          watches: Array<{
                              topicId: string
                              mediaId: string
                              percent: number
                              completed: boolean
                          }>
                      }>)
                    : null
            )
            .then((data) => {
                if (!data) return
                const next = new Map<string, VideoWatchStatus>()
                for (const watch of data.watches) {
                    next.set(videoWatchKey(watch.topicId, watch.mediaId), {
                        percent: watch.percent,
                        completed: watch.completed,
                    })
                }
                setWatchMap(next)
            })
            .catch(() => {})
    }, [lessonId, studentCode])

    const reportWatch = useCallback(
        async (
            topicId: string,
            mediaId: string,
            ranges: [number, number][],
            totalSeconds: number
        ): Promise<VideoWatchReport | null> => {
            if (!topicId || ranges.length === 0 || totalSeconds <= 0) return null
            try {
                const response = await fetch(
                    `/api/student/${studentCode}/lessons/${lessonId}/topics/${topicId}/video-watch`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mediaId, watchedRanges: ranges, totalSeconds }),
                    }
                )
                if (!response.ok) return null
                const result = (await response.json()) as VideoWatchReport
                setWatchMap((previous) => {
                    const next = new Map(previous)
                    next.set(videoWatchKey(topicId, mediaId), {
                        percent: result.percent,
                        completed: result.completed,
                    })
                    return next
                })
                return result
            } catch {
                return null
            }
        },
        [lessonId, studentCode]
    )

    return { watchMap, reportWatch }
}
