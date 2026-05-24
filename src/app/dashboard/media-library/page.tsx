import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { listTeachingMedia } from "@/lib/actions/teaching-media-actions";
import { AddTeachingMediaDialog } from "@/components/dashboard/add-teaching-media-dialog";
import { FileText, ImageIcon, Library, LinkIcon, PlaySquare, Youtube } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
    file: "ไฟล์",
    image: "รูปภาพ",
    video: "วิดีโอ",
    youtube: "YouTube",
    link: "ลิงก์",
};

function MediaIcon({ type }: { type: string }) {
    const className = "h-5 w-5";
    if (type === "image") return <ImageIcon className={className} />;
    if (type === "video") return <PlaySquare className={className} />;
    if (type === "youtube") return <Youtube className={className} />;
    if (type === "link") return <LinkIcon className={className} />;
    return <FileText className={className} />;
}

export default async function MediaLibraryPage() {
    const session = await auth();
    if (!session?.user?.id || !isTeacherOrAdmin(session.user.role)) {
        redirect("/dashboard");
    }

    const media = await listTeachingMedia({ limit: 100 });
    const counts = media.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-200">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                            <Library className="h-4 w-4" />
                            Teaching Media Library
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">คลังสื่อการสอน</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/80">
                            รวมไฟล์ รูป วิดีโอ YouTube และลิงก์ที่เคยใช้บนกระดานชั้นเรียน เพื่อดึงกลับไปใช้ซ้ำโดยไม่ต้องอัปโหลดใหม่ทีละห้อง
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <AddTeachingMediaDialog />
                        <Link
                            href="/dashboard/classrooms"
                            className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                        >
                            ไปใช้บนกระดาน
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
                {["file", "image", "video", "youtube", "link"].map((type) => (
                    <div key={type} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600">
                            <MediaIcon type={type} />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{counts[type] ?? 0}</p>
                        <p className="text-xs font-bold text-slate-400">{TYPE_LABEL[type]}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">สื่อล่าสุด</h2>
                        <p className="text-xs font-medium text-slate-400">
                            เพิ่มจากปุ่มด้านบน หรือบันทึกอัตโนมัติเมื่อแนบสื่อจากกระดาน
                        </p>
                    </div>
                    <AddTeachingMediaDialog variant="outline" />
                </div>

                {media.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm">
                            <Library className="h-8 w-8" />
                        </div>
                        <h3 className="font-black text-slate-700">ยังไม่มีสื่อในคลัง</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            กดปุ่มเพิ่มสื่อเพื่ออัปโหลดหรือบันทึกลิงก์ หรือแนบสื่อจากกระดานชั้นเรียน
                        </p>
                        <div className="mt-5 flex justify-center">
                            <AddTeachingMediaDialog variant="outline" />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {media.map((item) => (
                            <div
                                key={item.id}
                                className="group rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
                            >
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <MediaIcon type={item.type} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-black text-slate-900">{item.title}</h3>
                                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                                            {TYPE_LABEL[item.type] ?? item.type}
                                        </p>
                                    </div>
                                </div>
                                <p className="truncate text-xs text-slate-500">
                                    {item.name || item.linkUrl || item.url || item.youtubeId || "สื่อในคลัง"}
                                </p>
                                {item.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {item.tags.slice(0, 4).map((tag) => (
                                            <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
