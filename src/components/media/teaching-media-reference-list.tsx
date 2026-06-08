import { ExternalLink, FileText, ImageIcon, Link as LinkIcon, PlayCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    describeTeachingMediaReference,
    normalizeTeachingMediaReferences,
    type TeachingMediaReference,
} from "@/lib/teaching-media-reference";
import { cn } from "@/lib/utils";

const typeIcon = {
    file: FileText,
    image: ImageIcon,
    video: Video,
    youtube: PlayCircle,
    link: LinkIcon,
} as const;

function getReferenceHref(reference: TeachingMediaReference) {
    if (reference.linkUrl) return reference.linkUrl;
    if (reference.url) return reference.url;
    if (reference.youtubeId) return `https://www.youtube.com/watch?v=${reference.youtubeId}`;
    return null;
}

export function TeachingMediaReferenceList({
    references,
    compact = false,
    className,
}: {
    references: unknown;
    compact?: boolean;
    className?: string;
}) {
    const items = normalizeTeachingMediaReferences(references);
    if (items.length === 0) return null;

    return (
        <div
            className={cn(
                "rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm",
                compact ? "space-y-2" : "space-y-3",
                className
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">สื่อประกอบ</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                    {items.length} รายการ
                </span>
            </div>
            <div className={cn("grid gap-2", compact ? "" : "sm:grid-cols-2")}>
                {items.map((item, index) => {
                    const Icon = typeIcon[item.type as keyof typeof typeIcon] ?? FileText;
                    const href = getReferenceHref(item);
                    return (
                        <div
                            key={`${item.mediaId ?? item.title}-${index}`}
                            className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-slate-800">{item.title}</p>
                                <p className="truncate text-[10px] font-bold text-slate-400">
                                    {describeTeachingMediaReference(item)}
                                </p>
                            </div>
                            {href ? (
                                <Button
                                    asChild
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:text-indigo-600"
                                >
                                    <a href={href} target="_blank" rel="noreferrer" aria-label={`เปิด ${item.title}`}>
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
