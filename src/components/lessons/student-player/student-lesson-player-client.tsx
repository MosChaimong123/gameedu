"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    FileText,
    GraduationCap,
    LayoutList,
    Loader2,
    PlayCircle,
    Target,
    X,
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { StudentLessonAssessmentPanel } from "@/components/student/student-lesson-assessment-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    getActiveLessonTopics,
    getLessonTopicVideoMedia,
    type LessonMediaBlock,
} from "@/lib/lessons/lesson-content"
import { resolveLessonRuntimeMeta } from "@/lib/lessons/lesson-runtime-meta"

import { getLessonResumeLabel, isLessonContentV2, normalizeLessonContentForRender, parseLessonResumeMode } from "./student-lesson-player-model"
import { LessonContentPanel, LessonDocumentsPanel, LessonObjectivesPanel } from "./lesson-content-panel"
import { LessonTopicNavigation } from "./lesson-topic-navigation"
import type { CurriculumLesson, StudentLessonTab, VideoWatchStatus } from "./student-lesson-player.types"
import { useStudentLessonData } from "./use-student-lesson-data"
import { useTopicVideoProgress, videoWatchKey } from "./use-topic-video-progress"

// ─── YouTube IFrame API types ─────────────────────────────────────────────────

type YTPlayerInstance = {
    getCurrentTime: () => number
    getDuration: () => number
    destroy: () => void
}

declare global {
    interface Window {
        YT: {
            Player: new (
                el: string | HTMLElement,
                opts: {
                    width?: string | number
                    height?: string | number
                    videoId?: string
                    playerVars?: Record<string, number | string>
                    events?: {
                        onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void
                    }
                }
            ) => YTPlayerInstance
            PlayerState: Record<string, number>
        }
        onYouTubeIframeAPIReady?: () => void
    }
}

// ─── Module-level YouTube API loader (singleton) ──────────────────────────────

let _ytApiPromise: Promise<void> | null = null

function loadYouTubeIframeAPI(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve()
    if (_ytApiPromise) return _ytApiPromise
    _ytApiPromise = new Promise<void>((resolve) => {
        if (window.YT?.Player) { resolve(); return }
        const prev = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => { prev?.(); resolve() }
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const s = document.createElement("script")
            s.src = "https://www.youtube.com/iframe_api"
            document.head.appendChild(s)
        }
    })
    return _ytApiPromise
}

function getYoutubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url)
        const host = parsed.hostname.replace(/^www\./, "")
        if (host === "youtu.be") return parsed.pathname.slice(1).split("?")[0] ?? null
        if (host === "youtube.com" || host === "m.youtube.com") return parsed.searchParams.get("v")
        return null
    } catch {
        return null
    }
}

// ─── VideoPlayerCore — tracking logic + render ────────────────────────────────

function VideoPlayerCore({
    item,
    topicId,
    onReport,
    initialPercent = 0,
    initialCompleted = false,
}: {
    item: LessonMediaBlock
    topicId: string | null
    onReport?: (topicId: string, mediaId: string, ranges: [number, number][], totalSeconds: number) => Promise<{ percent: number; completed: boolean; justCompleted: boolean } | null>
    initialPercent?: number
    initialCompleted?: boolean
}) {
    const reactId = useId()
    const safeContainerId = `ytp${reactId.replace(/:/g, "")}`
    const videoRef = useRef<HTMLVideoElement>(null)
    const ytPlayerRef = useRef<YTPlayerInstance | null>(null)
    const segmentStart = useRef<number | null>(null)
    const pendingRanges = useRef<[number, number][]>([])
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [watchPercent, setWatchPercent] = useState(initialPercent)
    const [watchCompleted, setWatchCompleted] = useState(initialCompleted)
    const [ytReady, setYtReady] = useState(false)

    const canTrack = Boolean(topicId && onReport && item.type === "video")

    const flushRef = useRef<((endTime: number, totalSeconds: number) => Promise<void>) | null>(null)

    const flush = useCallback(
        async (endTime: number, totalSeconds: number, markFull = false, keepTracking = false) => {
            if (!canTrack || !topicId || !onReport) return
            if (segmentStart.current !== null && endTime > segmentStart.current) {
                pendingRanges.current.push([segmentStart.current, endTime])
                // If the video is still playing, keep tracking from here onward
                segmentStart.current = keepTracking ? endTime : null
            }
            // When the video reaches its end, count the whole clip as watched —
            // this matches what the learner expects after the clip finishes playing.
            if (markFull && totalSeconds > 0) {
                pendingRanges.current.push([0, totalSeconds])
            }
            if (pendingRanges.current.length === 0 || totalSeconds <= 0) return
            const toSend = [...pendingRanges.current]
            pendingRanges.current = []
            const result = await onReport(topicId, item.id, toSend, totalSeconds)
            if (result) {
                setWatchPercent(result.percent)
                if (result.completed) setWatchCompleted(true)
            }
        },
        [canTrack, topicId, onReport, item.id]
    )

    // Keep flushRef current so cleanup can call the latest flush
    useEffect(() => { flushRef.current = flush }, [flush])

    const youtubeVideoId = useMemo(
        () => (item.type === "video" ? getYoutubeVideoId(item.url) : null),
        [item]
    )

    // YouTube IFrame API tracking
    useEffect(() => {
        if (!youtubeVideoId || !canTrack) return
        let destroyed = false

        void loadYouTubeIframeAPI().then(() => {
            if (destroyed) return
            setYtReady(true)
            const player = new window.YT.Player(safeContainerId, {
                width: "100%",
                height: "100%",
                videoId: youtubeVideoId,
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onStateChange: (e) => {
                        const state = e.data
                        const t = player.getCurrentTime()
                        const dur = player.getDuration()
                        if (state === 1) {
                            // PLAYING — start segment + heartbeat to report progress live
                            segmentStart.current = t
                            if (heartbeatRef.current) clearInterval(heartbeatRef.current)
                            heartbeatRef.current = setInterval(() => {
                                const ct = player.getCurrentTime()
                                const cd = player.getDuration()
                                void flush(ct, cd, false, true)
                            }, 5000)
                        } else if (state === 2) {
                            // PAUSED
                            if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
                            void flush(t, dur)
                        } else if (state === 0) {
                            // ENDED — count whole clip as watched
                            if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
                            void flush(t, dur, true)
                        }
                    },
                },
            })
            ytPlayerRef.current = player
        })

        return () => {
            destroyed = true
            if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
            if (ytPlayerRef.current) {
                try {
                    const t = ytPlayerRef.current.getCurrentTime?.() ?? 0
                    const dur = ytPlayerRef.current.getDuration?.() ?? 0
                    if (t > 0 && dur > 0) void flushRef.current?.(t, dur)
                } catch { /* ignore */ }
                ytPlayerRef.current.destroy()
                ytPlayerRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [youtubeVideoId, safeContainerId, canTrack])

    // HTML5 video tracking
    const handlePlay = useCallback(() => {
        if (!videoRef.current) return
        segmentStart.current = videoRef.current.currentTime
    }, [])

    const handlePauseOrEnd = useCallback((markFull = false) => {
        if (!videoRef.current) return
        void flush(videoRef.current.currentTime, videoRef.current.duration, markFull)
    }, [flush])

    const lastHtml5Report = useRef(0)
    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return
        const now = videoRef.current.currentTime
        // Report live progress at most once every 5 seconds while playing
        if (now - lastHtml5Report.current >= 5) {
            lastHtml5Report.current = now
            void flush(now, videoRef.current.duration, false, true)
        }
    }, [flush])

    const showProgress = canTrack && item.type === "video"

    if (item.type === "image") {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.title ?? "lesson image"} className="max-h-80 w-full object-cover" />
        )
    }

    return (
        <>
            {youtubeVideoId ? (
                canTrack ? (
                    // IFrame API replaces the inner div — show fallback iframe until API is ready
                    <div className="relative aspect-video w-full bg-black">
                        {!ytReady && (
                            <iframe
                                src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                                title={item.title ?? "lesson video"}
                                className="absolute inset-0 h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                        <div id={safeContainerId} className="absolute inset-0 h-full w-full" />
                    </div>
                ) : (
                    <iframe
                        src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                        title={item.title ?? "lesson video"}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                )
            ) : (
                <video
                    ref={videoRef}
                    controls
                    src={item.url}
                    className="aspect-video w-full bg-black"
                    onPlay={handlePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onPause={() => handlePauseOrEnd(false)}
                    onEnded={() => handlePauseOrEnd(true)}
                />
            )}

            {/* Watch progress bar */}
            {showProgress && (
                <div className="flex items-center gap-2 bg-black/90 px-4 py-1.5">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                watchCompleted ? "bg-emerald-400" : "bg-blue-400"
                            )}
                            style={{ width: `${watchPercent}%` }}
                        />
                    </div>
                    <span className="shrink-0 text-xs font-black text-white/80">
                        {watchCompleted ? "✓ ดูครบแล้ว" : `ดู ${watchPercent}%`}
                    </span>
                </div>
            )}

            {(item.title || item.caption) && (
                <div className="flex gap-2 bg-black/80 px-4 py-2 text-xs text-white/70">
                    <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span>
                        {item.title && <span className="font-black text-white/90">{item.title}</span>}
                        {item.caption && <span className="block text-white/60">{item.caption}</span>}
                    </span>
                </div>
            )}
        </>
    )
}

// Hero wrapper (full-width, black bg)
function TrackedHeroPlayer({
    item,
    topicId,
    onReport,
    watchStatus,
}: {
    item: LessonMediaBlock
    topicId: string | null
    onReport?: (topicId: string, mediaId: string, ranges: [number, number][], totalSeconds: number) => Promise<{ percent: number; completed: boolean; justCompleted: boolean } | null>
    watchStatus?: VideoWatchStatus
}) {
    return (
        <div className="bg-black">
            <VideoPlayerCore
                item={item}
                topicId={topicId}
                onReport={onReport}
                initialPercent={watchStatus?.percent ?? 0}
                initialCompleted={watchStatus?.completed ?? false}
            />
        </div>
    )
}

// ─── Curriculum Sidebar ───────────────────────────────────────────────────────

function CurriculumSidebar({
    lessons,
    currentLessonId,
    studentCode,
    courseId,
    selectedTopicId,
    watchMap,
    onClose,
    onScrollToTopic,
}: {
    lessons: CurriculumLesson[]
    currentLessonId: string
    studentCode: string
    courseId: string | null
    selectedTopicId?: string | null
    watchMap?: Map<string, VideoWatchStatus>
    onClose?: () => void
    onScrollToTopic?: (topicId: string) => void
}) {
    const completedCount = lessons.filter((l) => l.isCompleted).length
    const showLessonHeaders = lessons.length > 1
    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        () => new Set([currentLessonId])
    )

    function toggleLesson(id: string) {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const groups: Array<{ unitTitle: string | null; items: CurriculumLesson[] }> = []
    for (const lesson of lessons) {
        const last = groups[groups.length - 1]
        if (last && last.unitTitle === (lesson.unitTitle ?? null)) {
            last.items.push(lesson)
        } else {
            groups.push({ unitTitle: lesson.unitTitle ?? null, items: [lesson] })
        }
    }

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                    <p className="text-sm font-black text-slate-900">บทเรียนทั้งหมด</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                        เรียนแล้ว {completedCount}/{lessons.length} บท
                    </p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="px-4 py-2.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: lessons.length > 0 ? `${Math.round((completedCount / lessons.length) * 100)}%` : "0%" }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {groups.map((group, gi) => (
                    <div key={gi}>
                        {group.unitTitle && (
                            <div className="border-b border-t border-slate-50 bg-slate-50 px-4 py-1.5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    {group.unitTitle}
                                </p>
                            </div>
                        )}

                        {group.items.map((lesson, li) => {
                            const isCurrent = lesson.lessonId === currentLessonId
                            const isExpanded = expandedIds.has(lesson.lessonId)
                            const lessonHref = `/student/${studentCode}/lessons/${lesson.lessonId}${courseId ? `?courseId=${courseId}` : ""}`
                            const hasTopics = lesson.topics.length > 0

                            return (
                                <div key={lesson.lessonId}>
                                    {showLessonHeaders ? (
                                        <div
                                            className={cn(
                                                "flex items-center gap-2 border-b border-slate-50 px-3 py-2.5 transition-colors",
                                                isCurrent ? "bg-emerald-50" : "hover:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black",
                                                lesson.isCompleted
                                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                                    : isCurrent
                                                      ? "border-emerald-400 bg-white text-emerald-600"
                                                      : "border-slate-200 bg-white text-slate-400"
                                            )}>
                                                {lesson.isCompleted ? "✓" : li + 1}
                                            </div>

                                            {isCurrent ? (
                                                <p className="min-w-0 flex-1 truncate text-xs font-black text-emerald-700">
                                                    {lesson.title}
                                                </p>
                                            ) : (
                                                <Link href={lessonHref} className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 hover:text-emerald-700">
                                                    {lesson.title}
                                                </Link>
                                            )}

                                            {hasTopics && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLesson(lesson.lessonId)}
                                                    className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
                                                >
                                                    {isExpanded
                                                        ? <ChevronUp className="h-3.5 w-3.5" />
                                                        : <ChevronDown className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                    ) : null}

                                    {hasTopics && (!showLessonHeaders || isExpanded) && (
                                        <div className={cn(showLessonHeaders && "border-l-2 border-slate-100 ml-4")}>
                                            {lesson.topics.map((topic, ti) => {
                                                const canScroll = isCurrent && onScrollToTopic
                                                const isActiveTopic = isCurrent && topic.id === selectedTopicId
                                                const vws = isCurrent ? watchMap?.get(topic.id) : undefined
                                                return canScroll ? (
                                                    <LessonTopicNavigation
                                                        key={topic.id}
                                                        active={isActiveTopic}
                                                        index={ti}
                                                        topic={topic}
                                                        watchStatus={vws}
                                                        onSelect={() => {
                                                            onScrollToTopic(topic.id)
                                                            onClose?.()
                                                        }}
                                                    />
                                                ) : (
                                                    <Link
                                                        key={topic.id}
                                                        href={lessonHref}
                                                        className="flex items-center gap-2.5 border-b border-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-50"
                                                    >
                                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
                                                            {ti + 1}
                                                        </span>
                                                        <span className="min-w-0 flex-1 text-xs font-bold leading-snug text-slate-500">
                                                            {topic.title}
                                                        </span>
                                                        {topic.sectionCount > 0 && (
                                                            <span className="shrink-0 text-[10px] text-slate-400">
                                                                {topic.sectionCount} ส่วน
                                                            </span>
                                                        )}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function StudentLessonPlayerClient() {
    const { language, t } = useLanguage()
    const { code, lessonId } = useParams<{ code: string; lessonId: string }>()
    const router = useRouter()
    const searchParams = useSearchParams()
    const courseId = searchParams.get("courseId")?.trim() || null
    const requestedTopicId = searchParams.get("topicId")?.trim() || null
    const requestedResumeMode = parseLessonResumeMode(searchParams.get("resumeMode"))

    const [activeTab, setActiveTab] = useState<StudentLessonTab>("content")
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
    const [selectedVideoMediaId, setSelectedVideoMediaId] = useState<string | null>(null)

    const {
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
    } = useStudentLessonData({ code, lessonId, courseId, language, t })

    const { watchMap, reportWatch } = useTopicVideoProgress(code, lessonId)

    const rawContent = useMemo(() => {
        if (!assignment || !isLessonContentV2(assignment.lesson.content)) return null
        return assignment.lesson.content
    }, [assignment])

    const content = useMemo(() => {
        if (!rawContent) return null
        return normalizeLessonContentForRender(rawContent)
    }, [rawContent])

    // Resume from server summary first, then local cache, then fall back to the first topic.
    useEffect(() => {
        if (content && !selectedTopicId) {
            const resumeTopicId = assignment?.progressSummary?.resumeTopicId ?? null
            const savedTopicId = window.localStorage.getItem(`lesson-progress:${code}:${lessonId}:topic`)
            const nextTopicId =
                content.topics.find((topic) => topic.id === requestedTopicId)?.id ??
                content.topics.find((topic) => topic.id === resumeTopicId)?.id ??
                content.topics.find((topic) => topic.id === savedTopicId)?.id ??
                content.topics[0]?.id ??
                null
            const timeoutId = window.setTimeout(() => setSelectedTopicId(nextTopicId), 0)
            return () => window.clearTimeout(timeoutId)
        }
    }, [assignment?.progressSummary?.resumeTopicId, code, content, lessonId, requestedTopicId, selectedTopicId])

    useEffect(() => {
        if (!selectedTopicId) return
        window.localStorage.setItem(`lesson-progress:${code}:${lessonId}:topic`, selectedTopicId)
    }, [code, lessonId, selectedTopicId])

    useEffect(() => {
        if (!rawContent || !selectedTopicId) return
        let nextTab: StudentLessonTab | null = null
        if (requestedResumeMode === "ASSESSMENT") {
            const selectedTopic = rawContent.topics.find((topic) => topic.id === selectedTopicId)
            if (selectedTopic?.assessment?.questionSetId) {
                nextTab = "assessment"
            }
        }
        if (
            requestedResumeMode === "CONTENT" ||
            requestedResumeMode === "REVIEW" ||
            requestedResumeMode === "DONE"
        ) {
            nextTab = "content"
        }
        if (!nextTab) return
        const timeoutId = window.setTimeout(() => setActiveTab(nextTab), 0)
        return () => window.clearTimeout(timeoutId)
    }, [rawContent, requestedResumeMode, selectedTopicId])

    const lessonMeta = useMemo(() => {
        if (!assignment || !isLessonContentV2(assignment.lesson.content)) return null
        return resolveLessonRuntimeMeta(assignment.lesson.content, assignment.lesson)
    }, [assignment])

    const handleScrollToTopic = useCallback((topicId: string) => {
        setSelectedTopicId(topicId)
        setActiveTab("content")
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

    const nextLesson = useMemo(() => {
        const idx = curriculumLessons.findIndex((l) => l.lessonId === lessonId)
        if (idx === -1 || idx === curriculumLessons.length - 1) return null
        return curriculumLessons[idx + 1] ?? null
    }, [curriculumLessons, lessonId])

    const topicVideoStatusMap = useMemo(() => {
        const statuses = new Map<string, VideoWatchStatus>()
        if (!rawContent) return statuses

        for (const topic of getActiveLessonTopics(rawContent)) {
            const videos = getLessonTopicVideoMedia(topic)
            if (videos.length === 0) continue
            const mediaStatuses = videos.map((media) => watchMap.get(videoWatchKey(topic.id, media.id)))
            const completed = mediaStatuses.every((status) => status?.completed)
            const percent = Math.round(
                mediaStatuses.reduce((sum, status) => sum + (status?.percent ?? 0), 0) / videos.length
            )
            statuses.set(topic.id, { percent, completed })
        }

        return statuses
    }, [rawContent, watchMap])

    const requiredAssessmentPendingCount = assignment?.progressSummary?.pendingTopicAssessmentIds.length ?? 0
    const completionEligible = assignment?.progressSummary?.completionEligible ?? false

    // Wrap reportWatch — refresh progressSummary from server when a topic video is first completed
    const handleReportWatch = useCallback(
        async (topicId: string, mediaId: string, ranges: [number, number][], totalSeconds: number) => {
            const result = await reportWatch(topicId, mediaId, ranges, totalSeconds)
            if (result?.justCompleted) {
                void loadAssignment()
            }
            return result
        },
        [reportWatch, loadAssignment]
    )

    // The server summary is the only completion policy used by the player.
    useEffect(() => {
        if (loading || completed || completing) return
        if (completionEligible) void markComplete()
    }, [loading, completed, completing, completionEligible, markComplete])

    const activeTopicAssessmentForEffect =
        rawContent?.topics.find((topic) => topic.id === (selectedTopicId ?? rawContent?.topics[0]?.id))?.assessment ?? null

    useEffect(() => {
        if (activeTab === "assessment" && !activeTopicAssessmentForEffect?.questionSetId) {
            const timeoutId = window.setTimeout(() => setActiveTab("content"), 0)
            return () => window.clearTimeout(timeoutId)
        }
    }, [activeTab, activeTopicAssessmentForEffect?.questionSetId])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (fetchError || !assignment || !content || !lessonMeta) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
                <p className="text-center font-bold text-slate-500">
                    {fetchError ?? "ไม่พบบทเรียนนี้"}
                </p>
                <Button variant="outline" onClick={() => router.back()}>
                    กลับ
                </Button>
            </div>
        )
    }

    const { lesson } = assignment
    const backHref = courseId ? `/student/${code}/courses/${courseId}` : `/student/${code}`

    // Hero video follows the selected topic — search topic-level media then section media
    const activeTopicForHero = content.topics.find((t) => t.id === (selectedTopicId ?? content.topics[0]?.id))
    const activeTopicAssessment = activeTopicAssessmentForEffect

    const currentTopicId = selectedTopicId ?? content.topics[0]?.id ?? null
    const overallProgressPercent = assignment.progressSummary?.percent ?? (completed ? 100 : 0)
    const lessonProgressPercent = overallProgressPercent
    const totalTopics = assignment.progressSummary?.totalTopics ?? content.topics.length
    const completedTopics = assignment.progressSummary?.completedTopics ?? 0
    const resumeMode = assignment.progressSummary?.resumeMode ?? "REVIEW"
    const currentTopicProgressStatus = assignment.progressSummary?.topicStatuses.find(
        (topic) => topic.topicId === currentTopicId
    )
    const resumeLabel = getLessonResumeLabel(resumeMode)

    const activeTopicSource = rawContent?.topics.find((topic) => topic.id === activeTopicForHero?.id)
    const activeTopicVideos = activeTopicSource ? getLessonTopicVideoMedia(activeTopicSource) : []
    const activeHeroMedia =
        activeTopicVideos.find((media) => media.id === selectedVideoMediaId) ??
        activeTopicVideos[0] ??
        content.heroMedia
    const activeHeroTopicId = activeTopicForHero?.id ?? content.heroTopicId

    const TABS: Array<{ id: StudentLessonTab; label: string; icon: React.ReactNode; badge?: number }> = [
        { id: "content", label: "เนื้อหา", icon: <BookOpen className="h-4 w-4" /> },
        ...(content.objectives.length > 0
            ? [{ id: "objectives" as const, label: "วัตถุประสงค์", icon: <Target className="h-4 w-4" />, badge: content.objectives.length }]
            : []),
        ...(content.documents.length > 0
            ? [{ id: "docs" as const, label: "เอกสาร", icon: <FileText className="h-4 w-4" />, badge: content.documents.length }]
            : []),
    ]

    const nextLessonHref = nextLesson
        ? `/student/${code}/lessons/${nextLesson.lessonId}${courseId ? `?courseId=${courseId}` : ""}`
        : null
    const visibleTabs = activeTopicAssessment?.questionSetId
        ? [...TABS, { id: "assessment" as const, label: "แบบทดสอบ", icon: <Target className="h-4 w-4" />, badge: undefined }]
        : TABS

    return (
        <div className="flex min-h-screen flex-col bg-slate-50/60">

            {/* ── Sticky top progress bar ──────────────────────────────────── */}
            <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
                <div className="flex items-center gap-3 px-4 py-2.5">
                    <Link
                        href={backHref}
                        className="flex shrink-0 items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">กลับ</span>
                    </Link>
                    <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    completed ? "bg-emerald-500" : "bg-emerald-400"
                                )}
                                style={{ width: `${lessonProgressPercent}%` }}
                            />
                        </div>
                    </div>
                    <span className="shrink-0 text-xs font-black text-slate-500">
                        {lessonProgressPercent}%
                    </span>
                    {curriculumLessons.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 lg:hidden"
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            บทเรียน
                        </button>
                    )}
                </div>
            </div>

            {/* ── 2-column layout ──────────────────────────────────────────── */}
            <div className="flex flex-1">

                {/* LEFT: video + content */}
                <div className="flex min-w-0 flex-1 flex-col pb-24">

                    {/* Hero video — follows selected topic; key forces remount on topic change */}
                    {activeHeroMedia && (
                        <>
                            <TrackedHeroPlayer
                                key={activeHeroMedia.id}
                                item={activeHeroMedia}
                                topicId={activeHeroTopicId}
                                onReport={handleReportWatch}
                                watchStatus={activeHeroTopicId
                                    ? watchMap.get(videoWatchKey(activeHeroTopicId, activeHeroMedia.id))
                                    : undefined}
                            />
                            {activeTopicVideos.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
                                    {activeTopicVideos.map((media, index) => {
                                        const status = activeHeroTopicId
                                            ? watchMap.get(videoWatchKey(activeHeroTopicId, media.id))
                                            : undefined
                                        const isSelected = media.id === activeHeroMedia.id
                                        return (
                                            <button
                                                key={media.id}
                                                type="button"
                                                aria-label={media.title ?? String(index + 1)}
                                                title={media.title}
                                                onClick={() => setSelectedVideoMediaId(media.id)}
                                                className={cn(
                                                    "flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-bold transition-colors",
                                                    isSelected
                                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                {status?.completed
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    : <PlayCircle className="h-4 w-4" />}
                                                <span>{media.title ?? index + 1}</span>
                                                {status && !status.completed && status.percent > 0 && (
                                                    <span className="text-[10px] text-slate-400">{status.percent}%</span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* Lesson meta */}
                    <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                                {lessonMeta.subjectLabel}
                            </span>
                            {lessonMeta.gradeLabel && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span>{lessonMeta.gradeLabel}</span>
                                </>
                            )}
                            {lessonMeta.semesterLabel && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span>{lessonMeta.semesterLabel}</span>
                                </>
                            )}
                            {lessonMeta.unitTitle && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="max-w-[180px] truncate">{lessonMeta.unitTitle}</span>
                                </>
                            )}
                            {content.estimatedMinutes ? (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="inline-flex items-center gap-0.5">
                                        <Clock className="h-3 w-3" />
                                        {content.estimatedMinutes} นาที
                                    </span>
                                </>
                            ) : null}
                        </div>
                        <h1 className="mt-1.5 text-lg font-black leading-snug text-slate-900">
                            {lesson.title}
                        </h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {completed && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                                    ✓ เรียนจบแล้ว
                                </span>
                            )}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">ความคืบหน้าบทเรียน</p>
                                <p className="mt-1 text-xl font-black text-slate-900">{overallProgressPercent}%</p>
                                <p className="text-xs font-bold text-slate-500">{resumeLabel}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">หัวข้อที่ผ่าน</p>
                                <p className="mt-1 text-xl font-black text-slate-900">
                                    {completedTopics}/{totalTopics}
                                </p>
                                <p className="text-xs font-bold text-slate-500">ครบตามเงื่อนไขของแต่ละหัวข้อ</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">วิดีโอและแบบทดสอบ</p>
                                <p className="mt-1 text-xl font-black text-slate-900">
                                    {assignment.progressSummary?.completedTrackableVideoTopics ?? 0}/
                                    {assignment.progressSummary?.totalTrackableVideoTopics ?? 0}
                                </p>
                                <p className="text-xs font-bold text-slate-500">
                                    วิดีโอครบ · แบบทดสอบค้าง {requiredAssessmentPendingCount}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="border-b border-slate-100 bg-white px-4 sm:px-6">
                        <div className="flex gap-0 overflow-x-auto">
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-black transition-colors",
                                        activeTab === tab.id
                                            ? "border-emerald-600 text-emerald-700"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {tab.badge ? (
                                        <span className={cn(
                                            "rounded-full px-1.5 py-0.5 text-[10px] font-black",
                                            activeTab === tab.id
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-400"
                                        )}>
                                            {tab.badge}
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 px-4 py-5 sm:px-6">
                        {activeTab === "content" && (
                            <div className="space-y-5">
                                <LessonContentPanel
                                    content={content}
                                    selectedTopicId={selectedTopicId}
                                />
                                {currentTopicProgressStatus?.hasAcknowledgementRequirement && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <Button
                                            type="button"
                                            variant={currentTopicProgressStatus.acknowledged ? "outline" : "default"}
                                            disabled={
                                                currentTopicProgressStatus.acknowledged ||
                                                acknowledgingTopicId === currentTopicId
                                            }
                                            onClick={() => void acknowledgeTopic(currentTopicId)}
                                            className={cn(
                                                "w-full sm:w-auto",
                                                currentTopicProgressStatus.acknowledged &&
                                                    "border-emerald-200 text-emerald-700"
                                            )}
                                        >
                                            {acknowledgingTopicId === currentTopicId
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <CheckCircle2 className="h-4 w-4" />}
                                            {currentTopicProgressStatus.acknowledged
                                                ? t("lessonTopicAcknowledged")
                                                : t("lessonTopicAcknowledgeAction")}
                                        </Button>
                                        {acknowledgementError && (
                                            <p className="mt-2 text-sm font-bold text-rose-600">
                                                {acknowledgementError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === "objectives" && <LessonObjectivesPanel objectives={content.objectives} />}
                        {activeTab === "docs" && <LessonDocumentsPanel documents={content.documents} />}
                        {activeTab === "assessment" && activeTopicAssessment?.questionSetId && selectedTopicId && (
                            <StudentLessonAssessmentPanel
                                key={selectedTopicId}
                                code={code}
                                lessonId={lessonId}
                                topicId={selectedTopicId}
                                onAttemptSubmitted={() => {
                                    void loadAssignment()
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* RIGHT: curriculum sidebar (desktop only) */}
                {curriculumLessons.length > 0 && (
                    <div className="hidden w-72 shrink-0 border-l border-slate-100 lg:flex lg:flex-col" style={{ maxHeight: "calc(100vh - 44px)", position: "sticky", top: "44px" }}>
                        <CurriculumSidebar
                            lessons={curriculumLessons}
                            currentLessonId={lessonId}
                            studentCode={code}
                            courseId={courseId}
                            selectedTopicId={selectedTopicId}
                            watchMap={topicVideoStatusMap}
                            onScrollToTopic={handleScrollToTopic}
                        />
                    </div>
                )}
            </div>

            {/* ── Mobile sidebar drawer ────────────────────────────────────── */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
                        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200" />
                        <CurriculumSidebar
                            lessons={curriculumLessons}
                            currentLessonId={lessonId}
                            studentCode={code}
                            courseId={courseId}
                            selectedTopicId={selectedTopicId}
                            watchMap={topicVideoStatusMap}
                            onClose={() => setMobileSidebarOpen(false)}
                            onScrollToTopic={handleScrollToTopic}
                        />
                    </div>
                </div>
            )}

            {/* ── Sticky bottom status bar ─────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:right-72">
                <div className="flex items-center gap-3">
                    {completed ? (
                        <div className="flex flex-1 items-center gap-2 text-sm font-black text-emerald-700">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                            เรียนจบบทนี้แล้ว 🎉
                        </div>
                    ) : (
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                                {completing ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-500" />
                                ) : (
                                    <PlayCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                )}
                                {totalTopics > 0
                                    ? `ครบแล้ว ${completedTopics}/${totalTopics} หัวข้อ`
                                    : "เรียนเนื้อหาให้ครบทุกหัวข้อ"}
                            </div>
                            {totalTopics > 0 && (
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${overallProgressPercent}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {completed && nextLessonHref && (
                        <Button
                            asChild
                            className="shrink-0 rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                        >
                            <Link href={nextLessonHref}>
                                บทถัดไป
                                <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
                {completeError && (
                    <p className="mt-1.5 text-center text-xs font-bold text-rose-500">
                        {completeError}
                    </p>
                )}
            </div>
        </div>
    )
}
