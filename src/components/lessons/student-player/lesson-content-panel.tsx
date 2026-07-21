import { BookOpen, FileText, PlayCircle, Target } from "lucide-react"

import { TeachingMediaReferenceList } from "@/components/media/teaching-media-reference-list"
import type { LessonMediaBlock } from "@/lib/lessons/lesson-content"
import type { TeachingMediaReference } from "@/lib/teaching-media-reference"

import type { RenderLessonContent } from "./student-lesson-player.types"

function getYoutubeEmbedUrl(url: string) {
    try {
        const parsed = new URL(url)
        const host = parsed.hostname.replace(/^www\./, "")
        if (host === "youtu.be") return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`
        if (host === "youtube.com" || host === "m.youtube.com") {
            const id = parsed.searchParams.get("v")
            return id ? `https://www.youtube.com/embed/${id}` : null
        }
        return null
    } catch {
        return null
    }
}

function MediaBlock({ item }: { item: LessonMediaBlock }) {
    const youtubeEmbedUrl = item.type === "video" ? getYoutubeEmbedUrl(item.url) : null
    return (
        <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.title ?? "lesson image"} className="max-h-80 w-full object-cover" />
            ) : youtubeEmbedUrl ? (
                <iframe
                    src={youtubeEmbedUrl}
                    title={item.title ?? "lesson video"}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <video controls src={item.url} className="aspect-video w-full bg-black" />
            )}
            {(item.title || item.caption) && (
                <figcaption className="flex gap-2 p-3 text-xs text-slate-500">
                    <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                        {item.title && <span className="font-black text-slate-700">{item.title}</span>}
                        {item.caption && <span className="block">{item.caption}</span>}
                    </span>
                </figcaption>
            )}
        </figure>
    )
}

export function LessonContentPanel({
    content,
    selectedTopicId,
}: {
    content: RenderLessonContent
    selectedTopicId?: string | null
}) {
    const activeTopic = content.topics.find((topic) => topic.id === selectedTopicId) ?? content.topics[0]

    if (!activeTopic) {
        return (
            <div className="py-12 text-center text-slate-400">
                <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="font-bold">ยังไม่มีเนื้อหาในบทเรียนนี้</p>
            </div>
        )
    }

    const heroExcludeIds = new Set<string>([
        ...(content.heroMediaId ? [content.heroMediaId] : []),
        ...(activeTopic.media?.map((media) => media.id) ?? []),
        ...activeTopic.sections.flatMap(
            (section) => section.media?.filter((media) => media.type === "video").map((media) => media.id) ?? []
        ),
    ])

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-black leading-snug text-slate-900">{activeTopic.title}</h2>
                {activeTopic.description && <p className="mt-1 text-sm text-slate-500">{activeTopic.description}</p>}
            </div>

            {activeTopic.sections.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-8 text-center text-slate-400">
                    <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="font-bold">ยังไม่มีเนื้อหาในหัวข้อนี้</p>
                </div>
            ) : (
                activeTopic.sections.map((section) => (
                    <div key={section.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 font-black text-slate-900">{section.heading}</h3>
                        <div className="prose prose-sm max-w-none text-slate-700 [&>p]:mb-3 [&>p]:leading-relaxed">
                            {section.content.split("\n\n").map((paragraph, index) => (
                                <p key={index}>{paragraph.replace(/\n/g, " ")}</p>
                            ))}
                        </div>
                        {section.media && section.media.some((media) => !heroExcludeIds.has(media.id)) && (
                            <div className="mt-4 grid gap-3">
                                {section.media
                                    .filter((media) => !heroExcludeIds.has(media.id))
                                    .map((media) => <MediaBlock key={media.id} item={media} />)}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    )
}

export function LessonObjectivesPanel({ objectives }: { objectives: string[] }) {
    if (objectives.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400">
                <Target className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="font-bold">ยังไม่มีวัตถุประสงค์การเรียนรู้</p>
            </div>
        )
    }
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-slate-900">วัตถุประสงค์การเรียนรู้</h3>
            </div>
            <ul className="space-y-2">
                {objectives.map((objective, index) => (
                    <li key={index} className="flex gap-2.5 text-sm text-slate-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                            {index + 1}
                        </span>
                        {objective}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function LessonDocumentsPanel({ documents }: { documents: TeachingMediaReference[] }) {
    if (documents.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="font-bold">ไม่มีเอกสารประกอบบทเรียนนี้</p>
            </div>
        )
    }
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <TeachingMediaReferenceList references={documents} />
        </div>
    )
}
