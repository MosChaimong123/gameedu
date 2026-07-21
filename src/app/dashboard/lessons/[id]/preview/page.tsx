"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { BookOpen, FileText, Loader2, PlayCircle, Target, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TeachingMediaReferenceList } from "@/components/media/teaching-media-reference-list"
import { isLessonContentV2, type LessonContentV2, type LessonMediaBlock } from "@/lib/lessons/lesson-content"

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

function VideoBlock({ block }: { block: LessonMediaBlock }) {
    const embed = getYoutubeEmbedUrl(block.url)
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                {embed ? (
                    <iframe
                        src={embed}
                        title={block.title ?? "วิดีโอบทเรียน"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full"
                    />
                ) : (
                    <video src={block.url} controls className="absolute inset-0 h-full w-full" />
                )}
            </div>
            {block.title ? <p className="px-3 py-2 text-xs font-bold text-white">{block.title}</p> : null}
        </div>
    )
}

export default function LessonPreviewPage() {
    const { id } = useParams<{ id: string }>()
    const [content, setContent] = useState<LessonContentV2 | null>(null)
    const [title, setTitle] = useState("")
    const [loading, setLoading] = useState(true)
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        fetch(`/api/lessons/${id}`)
            .then((response) => response.json())
            .then((data) => {
                if (!active) return
                setTitle(typeof data?.title === "string" ? data.title : "")
                if (isLessonContentV2(data?.content)) setContent(data.content)
            })
            .catch(() => undefined)
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [id])

    const topics = useMemo(
        () => (content ? [...content.topics].sort((a, b) => a.order - b.order) : []),
        [content]
    )
    const selectedTopic = useMemo(
        () => topics.find((topic) => topic.id === selectedTopicId) ?? topics[0] ?? null,
        [topics, selectedTopicId]
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังโหลดบทเรียน...
            </div>
        )
    }

    if (!content || topics.length === 0) {
        return (
            <div className="mx-auto max-w-3xl py-16 text-center text-slate-500">
                <p className="font-black text-slate-700">ยังไม่มีเนื้อหาให้แสดง</p>
                <p className="mt-1 text-sm text-slate-400">บทเรียนนี้ยังไม่มีหัวข้อหรือเนื้อหา</p>
                <Button asChild variant="outline" className="mt-4 rounded-xl font-bold">
                    <Link href={`/dashboard/lessons/${id}/edit`}>กลับไปแก้ไขบทเรียน</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    <Users className="h-4 w-4" />
                    มุมมองนักเรียน
                </div>
                <Button asChild variant="outline" className="rounded-xl font-bold">
                    <Link href={`/dashboard/lessons/${id}/edit`}>กลับไปแก้ไข</Link>
                </Button>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400">
                    <BookOpen className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-wide">บทเรียน</span>
                </div>
                <h1 className="mt-2 text-2xl font-black text-slate-950">{title}</h1>
                {content.outline.gradeLevel || content.outline.subject ? (
                    <p className="mt-1 text-sm font-bold text-slate-500">
                        {[content.outline.subject, content.outline.gradeLevel].filter(Boolean).join(" · ")}
                    </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                    {topics.map((topic, index) => {
                        const isSelected = topic.id === selectedTopic?.id
                        return (
                            <button
                                key={topic.id}
                                type="button"
                                onClick={() => setSelectedTopicId(topic.id)}
                                className={
                                    isSelected
                                        ? "flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-black text-white"
                                        : "flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white"
                                }
                            >
                                <span
                                    className={
                                        isSelected
                                            ? "grid h-5 w-5 place-items-center rounded-full bg-white/25 text-xs"
                                            : "grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-xs text-slate-600"
                                    }
                                >
                                    {index + 1}
                                </span>
                                <span className="max-w-[160px] truncate">{topic.title}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {selectedTopic ? (
                <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">{selectedTopic.title}</h2>
                        {selectedTopic.description ? (
                            <p className="mt-2 text-sm leading-7 text-slate-600">{selectedTopic.description}</p>
                        ) : null}
                    </div>

                    {selectedTopic.objectives.length > 0 ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <Target className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-black text-slate-800">วัตถุประสงค์การเรียนรู้</h3>
                            </div>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {selectedTopic.objectives.map((objective, index) => (
                                    <li key={index}>{objective}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {(selectedTopic.media ?? []).length > 0 ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <PlayCircle className="h-5 w-5 text-rose-600" />
                                <h3 className="font-black text-slate-800">วิดีโอประกอบหัวข้อ</h3>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {(selectedTopic.media ?? []).map((block) => (
                                    <VideoBlock key={block.id} block={block} />
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {selectedTopic.sections.map((section) => (
                        <div key={section.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900">{section.heading}</h3>
                            {section.content ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{section.content}</p>
                            ) : null}
                            {(section.media ?? []).length > 0 ? (
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    {(section.media ?? []).map((block) => (
                                        <VideoBlock key={block.id} block={block} />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ))}

                    {(selectedTopic.documents ?? []).length > 0 ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-black text-slate-800">เอกสารการเรียนรู้</h3>
                            </div>
                            <TeachingMediaReferenceList references={selectedTopic.documents ?? []} />
                        </div>
                    ) : null}

                    {selectedTopic.assessment ? (
                        <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50/60 p-6">
                            <h3 className="font-black text-violet-800">แบบทดสอบ: {selectedTopic.assessment.title}</h3>
                            <p className="mt-1 text-sm font-bold text-violet-700">
                                นักเรียนจะทำแบบทดสอบของหัวข้อนี้หลังเรียนจบ
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}
