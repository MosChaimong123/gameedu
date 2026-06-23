import { BookOpen, Clock, Layers3 } from "lucide-react"
import { getCourseFallbackTheme } from "@/lib/courses/course-catalog"

type CourseCoverArtProps = {
    title: string
    subject?: string | null
    gradeLevel?: string | null
    estimatedMinutes?: number
    lessonCount?: number
}

export function CourseCoverArt({
    title,
    subject,
    gradeLevel,
    estimatedMinutes,
    lessonCount,
}: CourseCoverArtProps) {
    const theme = getCourseFallbackTheme({ title, subject, gradeLevel })

    return (
        <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${theme}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_28%)]" />
            <div className="relative flex h-full flex-col justify-between p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-white/15 p-2 backdrop-blur-sm">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 text-[10px] font-black uppercase tracking-wide">
                        {subject ? <span className="rounded-full bg-white/15 px-2 py-1">{subject}</span> : null}
                        {gradeLevel ? <span className="rounded-full bg-white/15 px-2 py-1">{gradeLevel}</span> : null}
                    </div>
                </div>
                <div>
                    <p className="line-clamp-2 text-lg font-black leading-tight">{title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-white/90">
                        {typeof lessonCount === "number" ? (
                            <span className="flex items-center gap-1">
                                <Layers3 className="h-3.5 w-3.5" />
                                {lessonCount} lessons
                            </span>
                        ) : null}
                        {typeof estimatedMinutes === "number" && estimatedMinutes > 0 ? (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {estimatedMinutes} min
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
