import { redirect } from "next/navigation";
import {
    Archive,
    Database,
    FileText,
    HardDrive,
    ImageIcon,
    Library,
    LinkIcon,
    PlaySquare,
    Youtube,
} from "lucide-react";
import { auth } from "@/auth";
import { AddTeachingMediaDialog } from "@/components/dashboard/add-teaching-media-dialog";
import { MediaLibraryGrid } from "@/components/dashboard/media-library-grid";
import {
    getTeachingMediaStorageSummary,
    getTeachingMediaTagSuggestions,
    getTeachingMediaTypeCounts,
    listTeachingMediaPage,
    type TeachingMediaSort,
} from "@/lib/actions/teaching-media-actions";
import { isTeacherOrAdmin } from "@/lib/role-guards";

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

type MediaLibraryPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readStringParam(value: string | string[] | undefined) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeTypeParam(value: string) {
    return ["file", "image", "video", "youtube", "link"].includes(value) ? value : "";
}

function normalizeArchivedParam(value: string) {
    return value === "archived" || value === "all" ? value : "active";
}

function normalizeSortParam(value: string): TeachingMediaSort {
    if (value === "oldest" || value === "name_asc" || value === "size_desc") return value;
    return "newest";
}

function normalizePageParam(value: string) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeFavoriteParam(value: string) {
    return value === "1";
}

function formatBytes(bytes: number) {
    if (bytes <= 0) return "0 MB";
    const mb = bytes / 1024 / 1024;
    if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
}

function buildEmptyTitle(input: { type: string; archived: string; favoriteOnly: boolean }) {
    const typeLabel = TYPE_LABEL[input.type] ?? "สื่อ";

    if (input.favoriteOnly) {
        return `ไม่พบ${typeLabel}ในรายการโปรด`;
    }

    if (input.archived === "archived") {
        return `ไม่พบ${typeLabel}ในสถานะเก็บถาวร`;
    }

    if (input.archived === "all") {
        return `ไม่พบ${typeLabel}ในรายการทั้งหมด`;
    }

    return `ไม่พบ${typeLabel}ที่ใช้งานอยู่`;
}

function buildEmptyDescription(input: { query: string; favoriteOnly: boolean }) {
    if (input.query) {
        return "ลองเปลี่ยนคำค้นหา หรือปรับประเภทและสถานะของสื่อ";
    }

    if (input.favoriteOnly) {
        return "ลองปิดตัวกรองรายการโปรด หรือเลือกประเภทสื่ออื่นเพื่อดูรายการที่มีอยู่";
    }

    return "รายการด้านล่างจะแสดงตามตัวกรองที่เลือก ไม่ใช่ภาพรวมทั้งหมดของคลัง";
}

export default async function MediaLibraryPage({ searchParams }: MediaLibraryPageProps) {
    const session = await auth();
    if (!session?.user?.id || !isTeacherOrAdmin(session.user.role)) {
        redirect("/dashboard");
    }

    const params = (await searchParams) ?? {};
    const query = readStringParam(params.q);
    const type = normalizeTypeParam(readStringParam(params.type));
    const archived = normalizeArchivedParam(readStringParam(params.archived));
    const sort = normalizeSortParam(readStringParam(params.sort));
    const page = normalizePageParam(readStringParam(params.page));
    const favoriteOnly = normalizeFavoriteParam(readStringParam(params.favorite));

    const [{ items: media, total, pageSize }, counts, tagSuggestions, storageSummary] = await Promise.all([
        listTeachingMediaPage({
            limit: 24,
            archived,
            sort,
            query: query || undefined,
            type: type || undefined,
            page,
            favorite: favoriteOnly,
        }),
        getTeachingMediaTypeCounts(),
        getTeachingMediaTagSuggestions(),
        getTeachingMediaStorageSummary(),
    ]);

    const isWholeLibraryEmpty = storageSummary.totalCount === 0;
    const hasActiveFilter =
        Boolean(query) ||
        Boolean(type) ||
        favoriteOnly ||
        archived !== "active" ||
        sort !== "newest" ||
        page > 1;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-200">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                            <Library className="h-4 w-4" />
                            คลังสื่อการสอน
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">คลังสื่อการสอน</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/80">
                            รวมไฟล์ รูปภาพ วิดีโอ YouTube และลิงก์ที่เคยใช้บนกระดานชั้นเรียน
                            เพื่อดึงกลับไปใช้ซ้ำได้ทันทีโดยไม่ต้องอัปโหลดใหม่ทุกครั้ง
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <AddTeachingMediaDialog tagSuggestions={tagSuggestions} />
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
                {["file", "image", "video", "youtube", "link"].map((typeKey) => (
                    <div key={typeKey} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600">
                            <MediaIcon type={typeKey} />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{counts[typeKey as keyof typeof counts] ?? 0}</p>
                        <p className="text-xs font-bold text-slate-400">{TYPE_LABEL[typeKey]}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 inline-flex rounded-xl bg-sky-50 p-2 text-sky-600">
                        <HardDrive className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{formatBytes(storageSummary.totalBytes)}</p>
                    <p className="text-xs font-bold text-slate-400">พื้นที่รวมในคลัง</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 inline-flex rounded-xl bg-emerald-50 p-2 text-emerald-600">
                        <Database className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{storageSummary.activeCount.toLocaleString("th-TH")}</p>
                    <p className="text-xs font-bold text-slate-400">รายการที่ใช้งานอยู่</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 inline-flex rounded-xl bg-amber-50 p-2 text-amber-600">
                        <Archive className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{storageSummary.archivedCount.toLocaleString("th-TH")}</p>
                    <p className="text-xs font-bold text-slate-400">
                        เก็บถาวรแล้ว {formatBytes(storageSummary.archivedBytes)}
                    </p>
                </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">ผลลัพธ์สื่อที่กรองอยู่</h2>
                        <p className="text-xs font-medium text-slate-400">
                            ตัวเลขสรุปด้านบนคือภาพรวมทั้งคลัง ส่วนรายการด้านล่างจะแสดงเฉพาะตามตัวกรองที่เลือก
                        </p>
                    </div>
                </div>

                {isWholeLibraryEmpty && !hasActiveFilter ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm">
                            <Library className="h-8 w-8" />
                        </div>
                        <h3 className="font-black text-slate-700">{buildEmptyTitle({ type, archived, favoriteOnly })}</h3>
                        <p className="mt-1 text-sm text-slate-400">{buildEmptyDescription({ query, favoriteOnly })}</p>
                        <div className="mt-5 flex justify-center">
                            <AddTeachingMediaDialog variant="outline" tagSuggestions={tagSuggestions} />
                        </div>
                    </div>
                ) : (
                    <MediaLibraryGrid
                        initialItems={media}
                        total={total}
                        page={page}
                        pageSize={pageSize}
                        currentQuery={query}
                        currentType={type}
                        currentArchived={archived}
                        currentSort={sort}
                        favoriteOnly={favoriteOnly}
                        tagSuggestions={tagSuggestions}
                    />
                )}
            </div>
        </div>
    );
}
