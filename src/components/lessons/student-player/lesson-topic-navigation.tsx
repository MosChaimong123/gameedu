import { cn } from "@/lib/utils"

import type { CurriculumTopic, VideoWatchStatus } from "./student-lesson-player.types"

export function LessonTopicNavigation({
    active,
    index,
    onSelect,
    topic,
    watchStatus,
}: {
    active: boolean
    index: number
    onSelect: () => void
    topic: CurriculumTopic
    watchStatus?: VideoWatchStatus
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex w-full items-center gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-emerald-50",
                active && "bg-emerald-50"
            )}
        >
            <span
                className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                    active
                        ? "bg-emerald-500 text-white"
                        : watchStatus?.completed
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-blue-50 text-blue-600"
                )}
            >
                {watchStatus?.completed ? "✓" : index + 1}
            </span>
            <span className="min-w-0 flex-1 text-xs font-bold leading-snug text-slate-700">{topic.title}</span>
            {topic.hasAssessment ? (
                <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-700">
                    Quiz
                </span>
            ) : watchStatus && !watchStatus.completed && watchStatus.percent > 0 ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                    {watchStatus.percent}%
                </span>
            ) : watchStatus?.completed ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                    ดูแล้ว
                </span>
            ) : topic.sectionCount > 0 ? (
                <span className="shrink-0 text-[10px] text-slate-400">{topic.sectionCount} ส่วน</span>
            ) : null}
        </button>
    )
}
