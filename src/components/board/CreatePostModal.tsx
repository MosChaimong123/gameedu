"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Image as ImageIcon, Send, X, Link as LinkIcon, FileText, Youtube, ListTodo, Plus as PlusIcon, Upload, Loader2, Video, Library, Search } from "lucide-react";
import { createBoardPost } from "@/lib/actions/board-actions";
import {
    createTeachingMedia,
    listTeachingMedia,
    type TeachingMediaItem,
} from "@/lib/actions/teaching-media-actions";
import { createTeachingMediaReference, type TeachingMediaReference } from "@/lib/teaching-media-reference";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages";
import { formatBoardActionErrorMessage } from "@/lib/board-action-error-messages";
import {
    MAX_BOARD_ALBUM_IMAGES,
    uploadBoardFilesParallel,
    type BoardUploadProgress,
} from "@/lib/board-upload-client";
import type { AppErrorCode } from "@/lib/api-error";

type CreatedPost = {
    id: string;
    title?: string | null;
    content?: string | null;
};

type BoardPostInput = {
    boardId: string;
    type: PostType;
    title: string;
    content: string;
    color: string;
    linkUrl?: string;
    fileUrl?: string;
    fileName?: string;
    attachedFiles?: Array<{ url: string; name: string }>;
    videoUrl?: string;
    videoName?: string;
    youtubeId?: string;
    mediaReferences?: TeachingMediaReference[];
    pollQuestion?: string;
    pollOptions?: Array<{ text: string; id: string }>;
    albumImages?: string[];
};

interface CreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardId: string;
    classId?: string;
    canUseMediaLibrary?: boolean;
    onPostCreated?: (post: CreatedPost) => void;
}

const COLORS = [
    { name: "default", class: "bg-white", text: "text-slate-800" },
    { name: "yellow", class: "bg-yellow-100", text: "text-yellow-900" },
    { name: "blue", class: "bg-blue-100", text: "text-blue-900" },
    { name: "green", class: "bg-green-100", text: "text-green-900" },
    { name: "pink", class: "bg-pink-100", text: "text-pink-900" },
    { name: "purple", class: "bg-purple-100", text: "text-purple-900" },
];

type PostType = "link" | "file" | "video" | "youtube" | "poll" | "album";

const LIBRARY_TYPES_FOR_POST: Record<PostType, string[]> = {
    file: ["file"],
    album: ["image"],
    video: ["video"],
    youtube: ["youtube"],
    link: ["link"],
    poll: [],
};

const POST_TAB_FOR_LIBRARY_TYPE: Record<string, PostType> = {
    file: "file",
    image: "album",
    video: "video",
    youtube: "youtube",
    link: "link",
};

const LIBRARY_TYPE_LABEL: Record<string, string> = {
    file: "ไฟล์",
    image: "รูปภาพ",
    video: "วิดีโอ",
    youtube: "YouTube",
    link: "ลิงก์",
};

const BOARD_UPLOAD_ERR_KEYS: Partial<Record<AppErrorCode, string>> = {
    AUTH_REQUIRED: "boardUploadErrAuth",
    NO_FILE: "boardUploadErrNoFile",
    UNSUPPORTED_FILE_TYPE: "boardUploadErrUnsupported",
    FILE_TOO_LARGE: "boardUploadErrTooLarge",
};

export function CreatePostModal({
    open, onOpenChange, boardId, classId, canUseMediaLibrary = false, onPostCreated
}: CreatePostModalProps) {
    const { t, language } = useLanguage();
    const [type, setType] = useState<PostType>("file");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedColor, setSelectedColor] = useState("default");
    
    // Type specific states
    const [linkUrl, setLinkUrl] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
    const [albumUrls, setAlbumUrls] = useState<string[]>([""]);
    const [selectedLibraryFiles, setSelectedLibraryFiles] = useState<Array<{ url: string; name: string }>>([]);
    const [mediaReferences, setMediaReferences] = useState<TeachingMediaReference[]>([]);
    
    // Local file states
    const [selectedBoardFiles, setSelectedBoardFiles] = useState<File[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const albumInputRef = useRef<HTMLInputElement>(null);
    const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadPhase, setUploadPhase] = useState<BoardUploadProgress | null>(null);
    const [albumPreviewUrls, setAlbumPreviewUrls] = useState<string[]>([]);
    const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
    const [allMediaItems, setAllMediaItems] = useState<TeachingMediaItem[]>([]);
    const [mediaQuery, setMediaQuery] = useState("");
    const [mediaLoading, setMediaLoading] = useState(false);
    const uploadAbortRef = useRef<AbortController | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const urls = selectedFiles.map((file) => URL.createObjectURL(file));
        setAlbumPreviewUrls(urls);
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [selectedFiles]);

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const uploadFile = async (file: File, signal?: AbortSignal) => {
        const formData = new FormData();
        formData.append("file", file);
        if (classId) {
            formData.append("classId", classId);
        }
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            signal,
        });
        if (!res.ok) {
            const message = await getLocalizedErrorMessageFromResponse(
                res,
                "boardUploadFail",
                t,
                language,
                { overrideTranslationKeys: BOARD_UPLOAD_ERR_KEYS }
            );
            throw new Error(message);
        }
        return await res.json();
    };

    const uploadMany = async (files: File[]) => {
        return uploadBoardFilesParallel(files, {
            classId,
            signal: uploadAbortRef.current?.signal,
            onProgress: setUploadPhase,
            upload: (file, signal) => uploadFile(file, signal),
        });
    };

    const compatibleMediaItems = useMemo(
        () =>
            allMediaItems.filter((item) =>
                LIBRARY_TYPES_FOR_POST[type].includes(item.type)
            ),
        [allMediaItems, type]
    );

    const otherMediaItems = useMemo(
        () =>
            allMediaItems.filter(
                (item) => !LIBRARY_TYPES_FOR_POST[type].includes(item.type)
            ),
        [allMediaItems, type]
    );

    const otherMediaTabHints = useMemo(() => {
        const tabs = new Set<PostType>();
        for (const item of otherMediaItems) {
            const tab = POST_TAB_FOR_LIBRARY_TYPE[item.type];
            if (tab) tabs.add(tab);
        }
        return [...tabs];
    }, [otherMediaItems]);

    const loadMediaLibrary = async () => {
        if (!canUseMediaLibrary) return;
        setMediaLoading(true);
        try {
            const items = await listTeachingMedia({
                query: mediaQuery,
                limit: 80,
            });
            setAllMediaItems(items);
        } catch {
            toast({ variant: "destructive", title: t("error"), description: "โหลดคลังสื่อไม่สำเร็จ" });
        } finally {
            setMediaLoading(false);
        }
    };

    useEffect(() => {
        if (mediaLibraryOpen) {
            void loadMediaLibrary();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaLibraryOpen, type]);

    const rememberMedia = async (media: {
        type: string;
        title: string;
        url?: string;
        name?: string;
        mimeType?: string;
        size?: number;
        youtubeId?: string;
        linkUrl?: string;
    }) => {
        if (!canUseMediaLibrary) return;
        try {
            await createTeachingMedia({ ...media, source: "board" });
        } catch {
            // Posting should never fail just because saving to the reusable library failed.
        }
    };

    const applyLibraryItem = (item: TeachingMediaItem) => {
        const reference = createTeachingMediaReference(item);
        setMediaReferences((prev) =>
            prev.some((entry) => entry.mediaId === reference.mediaId) ? prev : [...prev, reference]
        );

        if (item.type === "file" && item.url) {
            setSelectedLibraryFiles((prev) => [
                ...prev,
                { url: item.url!, name: item.name || item.title || t("boardDefaultFileName") },
            ]);
            setSelectedBoardFiles([]);
            setType("file");
        } else if (item.type === "image" && item.url) {
            setAlbumUrls((prev) => [...prev.filter((url) => url.trim()), item.url!]);
            setType("album");
        } else if (item.type === "video" && item.url) {
            setVideoUrl(item.url);
            setSelectedVideo(null);
            setType("video");
        } else if (item.type === "youtube" && item.youtubeId) {
            setYoutubeUrl(`https://youtu.be/${item.youtubeId}`);
            setType("youtube");
        } else if (item.type === "link" && item.linkUrl) {
            setLinkUrl(item.linkUrl);
            setType("link");
        }
        setMediaLibraryOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (type === "file" && selectedBoardFiles.length === 0 && !fileUrl.trim()) {
            if (selectedLibraryFiles.length === 0) {
                toast({ variant: "destructive", title: t("error"), description: t("boardNeedFileOrLink") });
                return;
            }
        }
        if (type === "video" && !selectedVideo && !videoUrl.trim()) {
            toast({ variant: "destructive", title: t("error"), description: t("boardNeedVideoOrLink") });
            return;
        }
        if (type === "album" && selectedFiles.length === 0 && albumUrls.every((u) => !u.trim())) {
            toast({ variant: "destructive", title: t("error"), description: t("boardNeedAlbumPhoto") });
            return;
        }

        uploadAbortRef.current = new AbortController();
        setIsSubmitting(true);
        setUploadPhase(null);
        try {
            const data: BoardPostInput = {
                boardId,
                type,
                title: title.trim(),
                content: content.trim(),
                color: selectedColor,
                mediaReferences,
            };

            if (type === "link") data.linkUrl = linkUrl.trim();
            if (type === "file") {
                const attachedFiles: Array<{ url: string; name: string }> = [...selectedLibraryFiles];
                if (selectedBoardFiles.length > 0) {
                    const uploads = await uploadMany(selectedBoardFiles);
                    for (let i = 0; i < uploads.length; i += 1) {
                        const uploadRes = uploads[i]!;
                        const file = selectedBoardFiles[i]!;
                        attachedFiles.push({
                            url: uploadRes.url,
                            name: uploadRes.originalFileName ?? uploadRes.fileName ?? file.name,
                        });
                        await rememberMedia({
                            type: uploadRes.type?.startsWith("image/") ? "image" : "file",
                            title: uploadRes.originalFileName ?? uploadRes.fileName ?? file.name,
                            url: uploadRes.url,
                            name: uploadRes.originalFileName ?? uploadRes.fileName ?? file.name,
                            mimeType: uploadRes.type,
                            size: uploadRes.size,
                        });
                    }
                } else if (fileUrl.trim()) {
                    attachedFiles.push({
                        url: fileUrl.trim(),
                        name: t("boardDefaultFileName"),
                    });
                    await rememberMedia({
                        type: "file",
                        title: title.trim() || t("boardDefaultFileName"),
                        url: fileUrl.trim(),
                        name: t("boardDefaultFileName"),
                    });
                }
                if (attachedFiles.length === 0) {
                    throw new Error(t("boardNeedFileOrLink"));
                }
                data.attachedFiles = attachedFiles;
            }
            if (type === "video") {
                if (selectedVideo) {
                    const uploadRes = await uploadFile(selectedVideo);
                    data.videoUrl = uploadRes.url;
                    data.videoName = uploadRes.originalFileName ?? uploadRes.fileName;
                    await rememberMedia({
                        type: "video",
                        title: uploadRes.originalFileName ?? uploadRes.fileName ?? selectedVideo.name,
                        url: uploadRes.url,
                        name: uploadRes.originalFileName ?? uploadRes.fileName ?? selectedVideo.name,
                        mimeType: uploadRes.type,
                        size: uploadRes.size,
                    });
                } else {
                    data.videoUrl = videoUrl.trim();
                    data.videoName = t("boardDefaultVideoName");
                    await rememberMedia({
                        type: "video",
                        title: title.trim() || t("boardDefaultVideoName"),
                        url: videoUrl.trim(),
                        name: t("boardDefaultVideoName"),
                    });
                }
                if (!data.videoUrl) throw new Error(t("boardNeedVideoOrLink"));
            }
            if (type === "youtube") {
                const youtubeId = extractYoutubeId(youtubeUrl);
                if (youtubeId) {
                    data.youtubeId = youtubeId;
                    await rememberMedia({
                        type: "youtube",
                        title: title.trim() || "YouTube",
                        youtubeId,
                    });
                }
            }
            if (type === "poll") {
                data.pollQuestion = pollQuestion.trim();
                data.pollOptions = pollOptions.filter(o => o.trim()).map((o, i) => ({ text: o.trim(), id: `opt-${i}` }));
            }
            if (type === "album") {
                const uploadedUrls = [...albumUrls.filter((u) => u.trim())];
                if (selectedFiles.length > 0) {
                    const uploads = await uploadMany(selectedFiles);
                    uploadedUrls.push(...uploads.map((uploadRes) => uploadRes.url));
                    for (let i = 0; i < uploads.length; i += 1) {
                        const uploadRes = uploads[i]!;
                        const file = selectedFiles[i]!;
                        await rememberMedia({
                            type: "image",
                            title: uploadRes.originalFileName ?? uploadRes.fileName ?? file.name,
                            url: uploadRes.url,
                            name: uploadRes.originalFileName ?? uploadRes.fileName ?? file.name,
                            mimeType: uploadRes.type,
                            size: uploadRes.size,
                        });
                    }
                }
                data.albumImages = uploadedUrls;
            }
            if (type === "link" && data.linkUrl) {
                await rememberMedia({
                    type: "link",
                    title: title.trim() || data.linkUrl,
                    linkUrl: data.linkUrl,
                });
            }

            const post = await createBoardPost(data);

            // Reset states
            setType("file");
            setTitle("");
            setContent("");
            setLinkUrl("");
            setFileUrl("");
            setVideoUrl("");
            setSelectedVideo(null);
            setYoutubeUrl("");
            setPollQuestion("");
            setPollOptions(["", ""]);
            setAlbumUrls([""]);
            setSelectedBoardFiles([]);
            setSelectedFiles([]);
            setSelectedLibraryFiles([]);
            setMediaReferences([]);
            setSelectedColor("default");
            onOpenChange(false);
            
            if (onPostCreated) onPostCreated(post);
            
            toast({
                title: t("boardPostSuccessTitle"),
                description: t("boardPostSuccessDesc"),
            });
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === "AbortError") {
                toast({ title: t("boardUploadCancelled") });
            } else {
                const raw = error instanceof Error ? error.message.trim() : "";
                let description = t("boardPostCreateFail");
                if (raw) {
                    const mapped = formatBoardActionErrorMessage(raw, t);
                    description = mapped !== raw ? mapped : raw;
                }
                toast({
                    variant: "destructive",
                    title: t("error"),
                    description,
                });
            }
        } finally {
            uploadAbortRef.current = null;
            setUploadPhase(null);
            setIsSubmitting(false);
        }
    };

    const handleCancelUpload = () => {
        uploadAbortRef.current?.abort();
    };

    const addPollOption = () => setPollOptions([...pollOptions, ""]);
    const removePollOption = (index: number) => setPollOptions(pollOptions.filter((_, i) => i !== index));
    const updatePollOption = (index: number, val: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = val;
        setPollOptions(newOptions);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-800">{t("boardCreateTitle")}</DialogTitle>
                </DialogHeader>
                
                {/* Type Selection */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
                    {[
                        { id: "file" as const, icon: FileText, labelKey: "boardPostTypeFile" },
                        { id: "album" as const, icon: ImageIcon, labelKey: "boardPostTypeAlbum" },
                        { id: "video" as const, labelKey: "boardPostTypeVideo", icon: Video, color: "text-purple-500", bgColor: "bg-purple-50" },
                        { id: "youtube" as const, labelKey: "boardPostTypeYoutube", icon: Youtube, color: "text-red-500", bgColor: "bg-red-50" },
                        { id: "poll" as const, icon: ListTodo, labelKey: "boardPostTypePoll" },
                        { id: "link" as const, icon: LinkIcon, labelKey: "boardPostTypeLink" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setType(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                                type === tab.id ? "bg-white shadow-sm text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[10px] font-black">{t(tab.labelKey)}</span>
                        </button>
                    ))}
                </div>

                {canUseMediaLibrary && type !== "poll" && (
                    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <div className="rounded-xl bg-white p-2 text-indigo-600 shadow-sm">
                                    <Library className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">คลังสื่อการสอน</p>
                                    <p className="text-[10px] font-medium text-slate-500">ดึงสื่อเดิมมาใช้ซ้ำได้ทันที</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setMediaLibraryOpen((value) => !value)}
                                className="rounded-xl border-indigo-200 bg-white font-bold text-indigo-700 hover:bg-indigo-50"
                            >
                                <Library className="mr-1.5 h-4 w-4" />
                                {mediaLibraryOpen ? "ซ่อนคลัง" : "เลือกจากคลัง"}
                            </Button>
                        </div>

                        {mediaLibraryOpen && (
                            <div className="mt-3 space-y-3">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={mediaQuery}
                                            onChange={(event) => setMediaQuery(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    void loadMediaLibrary();
                                                }
                                            }}
                                            placeholder="ค้นหาชื่อสื่อหรือแท็ก..."
                                            className="rounded-xl border-indigo-100 bg-white pl-9"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void loadMediaLibrary()}
                                        className="rounded-xl bg-white"
                                        disabled={mediaLoading}
                                    >
                                        {mediaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ค้นหา"}
                                    </Button>
                                </div>

                                {compatibleMediaItems.length > 0 &&
                                    allMediaItems.length > compatibleMediaItems.length && (
                                        <p className="text-[10px] font-medium text-indigo-600/90">
                                            แสดง {compatibleMediaItems.length} รายการที่ใช้กับแท็บนี้ (จาก{" "}
                                            {allMediaItems.length} ในคลัง)
                                        </p>
                                    )}

                                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                    {mediaLoading ? (
                                        <div className="rounded-xl bg-white/70 p-4 text-center text-xs font-bold text-slate-500">
                                            กำลังโหลดคลังสื่อ...
                                        </div>
                                    ) : compatibleMediaItems.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-indigo-100 bg-white/70 p-4 text-center">
                                            <p className="text-xs font-black text-slate-600">
                                                {allMediaItems.length === 0
                                                    ? "ยังไม่มีสื่อในคลัง"
                                                    : `ยังไม่มีสื่อสำหรับแท็บ「${t(
                                                          type === "album"
                                                              ? "boardPostTypeAlbum"
                                                              : type === "file"
                                                                ? "boardPostTypeFile"
                                                                : type === "video"
                                                                  ? "boardPostTypeVideo"
                                                                  : type === "youtube"
                                                                    ? "boardPostTypeYoutube"
                                                                    : "boardPostTypeLink"
                                                      )}」`}
                                            </p>
                                            {otherMediaItems.length > 0 ? (
                                                <>
                                                    <p className="mt-1 text-[10px] text-slate-500">
                                                        ในคลังมี {otherMediaItems.length} รายการประเภทอื่น (
                                                        {otherMediaItems
                                                            .map((item) => LIBRARY_TYPE_LABEL[item.type] ?? item.type)
                                                            .filter((label, index, labels) => labels.indexOf(label) === index)
                                                            .join(", ")}
                                                        )
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                                                        {otherMediaTabHints.map((tab) => (
                                                            <button
                                                                key={tab}
                                                                type="button"
                                                                onClick={() => setType(tab)}
                                                                className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-200"
                                                            >
                                                                ไปแท็บ{" "}
                                                                {t(
                                                                    tab === "album"
                                                                        ? "boardPostTypeAlbum"
                                                                        : tab === "file"
                                                                          ? "boardPostTypeFile"
                                                                          : tab === "video"
                                                                            ? "boardPostTypeVideo"
                                                                            : tab === "youtube"
                                                                              ? "boardPostTypeYoutube"
                                                                              : "boardPostTypeLink"
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="mt-1 text-[10px] text-slate-400">
                                                    อัปโหลดจากคลังสื่อการสอน หรือโพสต์ครั้งนี้แล้วระบบจะบันทึกไว้ให้
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        compatibleMediaItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => applyLibraryItem(item)}
                                                className="flex w-full items-center gap-3 rounded-xl border border-white bg-white/90 p-3 text-left shadow-sm transition hover:border-indigo-200 hover:bg-white"
                                            >
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                                    {item.type === "youtube" ? (
                                                        <Youtube className="h-5 w-5" />
                                                    ) : item.type === "link" ? (
                                                        <LinkIcon className="h-5 w-5" />
                                                    ) : item.type === "video" ? (
                                                        <Video className="h-5 w-5" />
                                                    ) : item.type === "image" ? (
                                                        <ImageIcon className="h-5 w-5" />
                                                    ) : (
                                                        <FileText className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-black text-slate-800">{item.title}</p>
                                                    <p className="truncate text-[10px] text-slate-400">
                                                        {item.name || item.linkUrl || item.url || item.youtubeId || "สื่อในคลัง"}
                                                    </p>
                                                </div>
                                                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600">
                                                    ใช้
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2 custom-scrollbar">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("boardFieldTitleOptional")}</Label>
                        <Input 
                            id="title"
                            placeholder={t("boardTitlePlaceholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="rounded-xl border-slate-200 focus:ring-purple-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("boardFieldContent")}</Label>
                        <Textarea 
                            id="content"
                            placeholder={t("boardContentPlaceholder")}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="rounded-xl border-slate-200 focus:ring-purple-500 min-h-[80px] resize-none"
                        />
                    </div>

                    {/* Dynamic Fields */}
                    {type === "link" && (
                        <div className="space-y-2 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> {t("boardLinkShareLabel")}
                            </Label>
                            <Input 
                                placeholder={t("boardLinkPlaceholder")}
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    )}

                    {type === "file" && (
                        <div className="space-y-3 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {t("boardPickFileLabel")}
                            </Label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                        setSelectedBoardFiles((prev) => [...prev, ...files]);
                                    }
                                    e.target.value = "";
                                }}
                            />
                            <div className="space-y-2">
                                {selectedLibraryFiles.map((file, index) => (
                                    <div
                                        key={`${file.url}-${index}`}
                                        className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-purple-700"
                                    >
                                        <Library className="h-5 w-5 shrink-0" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-bold">{file.name}</span>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-purple-500">
                                            คลัง
                                        </span>
                                        <button
                                            type="button"
                                            className="rounded-lg p-1 text-purple-400 hover:bg-purple-100 hover:text-red-500"
                                            onClick={() =>
                                                setSelectedLibraryFiles((prev) =>
                                                    prev.filter((_, fileIndex) => fileIndex !== index)
                                                )
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {selectedBoardFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${file.size}-${index}`}
                                        className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-indigo-700"
                                    >
                                        <FileText className="h-5 w-5 shrink-0" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-bold">{file.name}</span>
                                        <button
                                            type="button"
                                            className="rounded-lg p-1 text-indigo-400 hover:bg-indigo-100 hover:text-red-500"
                                            onClick={() =>
                                                setSelectedBoardFiles((prev) =>
                                                    prev.filter((_, fileIndex) => fileIndex !== index)
                                                )
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all",
                                        selectedBoardFiles.length > 0
                                            ? "border-indigo-200 bg-white hover:border-indigo-300"
                                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    {selectedBoardFiles.length > 0 ? (
                                        <>
                                            <PlusIcon className="mb-1 h-5 w-5 text-indigo-500" />
                                            <span className="text-xs font-bold text-indigo-600">
                                                {t("boardAddMoreFiles")}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mb-1 h-6 w-6 text-slate-300" />
                                            <span className="text-xs font-bold text-slate-400">
                                                {t("boardUploadFileHint")}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {type === "video" && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            <div 
                                onClick={() => videoInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                                    selectedVideo ? "border-purple-400 bg-purple-50" : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                                )}
                            >
                                <input 
                                    type="file" 
                                    ref={videoInputRef} 
                                    className="hidden" 
                                    accept="video/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setSelectedVideo(file);
                                    }}
                                />
                                {selectedVideo ? (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                            <Video className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{selectedVideo.name}</p>
                                            <p className="text-[10px] text-slate-400">{(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-400 hover:text-red-500 h-7 text-[10px]"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedVideo(null);
                                            }}
                                            >{t("cancel")}</Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-500">{t("boardVideoUploadTitle")}</p>
                                            <p className="text-[10px] text-slate-400">{t("boardVideoUploadHint")}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {type === "youtube" && (
                        <div className="space-y-2 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Youtube className="w-3 h-3" /> {t("boardYoutubeLinkLabel")}
                            </Label>
                            <Input 
                                placeholder={t("boardYoutubePlaceholder")}
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    )}

                    {type === "poll" && (
                        <div className="space-y-3 animate-in slide-in-from-left-2">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("boardPollQuestionLabel")}</Label>
                                <Input 
                                    placeholder={t("boardPollQuestionPlaceholder")}
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    className="rounded-xl border-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("boardPollOptionsLabel")}</Label>
                                {pollOptions.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input 
                                            placeholder={t("boardPollOptionPlaceholder", { n: i + 1 })}
                                            value={opt}
                                            onChange={(e) => updatePollOption(i, e.target.value)}
                                            className="rounded-xl border-slate-200"
                                        />
                                        {pollOptions.length > 2 && (
                                            <Button variant="ghost" size="icon" onClick={() => removePollOption(i)} className="rounded-xl text-red-400">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={addPollOption}
                                    className="w-full rounded-xl border-dashed border-slate-300 text-slate-500 text-xs py-1 h-8"
                                >
                                    <PlusIcon className="w-3 h-3 mr-1" /> {t("boardPollAddOption")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {type === "album" && (
                        <div className="space-y-3 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> {t("boardAlbumFromDevice")}
                            </Label>
                            
                            <input 
                                type="file"
                                ref={albumInputRef}
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setSelectedFiles((prev) => {
                                        const merged = [...prev, ...files];
                                        if (merged.length > MAX_BOARD_ALBUM_IMAGES) {
                                            toast({
                                                variant: "destructive",
                                                title: t("error"),
                                                description: t("boardAlbumMax", { max: MAX_BOARD_ALBUM_IMAGES }),
                                            });
                                            return merged.slice(0, MAX_BOARD_ALBUM_IMAGES);
                                        }
                                        return merged;
                                    });
                                    e.target.value = "";
                                }}
                            />

                            <div className="grid grid-cols-4 gap-2">
                                {selectedFiles.map((file, i) => (
                                    <div key={`${file.name}-${file.size}-${i}`} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={albumPreviewUrls[i] ?? ""} 
                                            alt={t("boardImagePreviewAlt")} 
                                            className="w-full h-full object-cover"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    onClick={() => albumInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all bg-slate-50"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span className="text-[10px] font-bold">{t("boardAddPhoto")}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("boardCardColorLabel")}</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => setSelectedColor(color.name)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${color.class} ${
                                        selectedColor === color.name ? "border-purple-600 scale-110 shadow-md" : "border-transparent"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                </div>

                {uploadPhase && (
                    <div className="space-y-2 px-1 pb-2">
                        <p className="text-xs font-bold text-slate-600">
                            {t("boardUploadProgress", {
                                current: uploadPhase.current,
                                total: uploadPhase.total,
                                fileName: uploadPhase.fileName,
                            })}
                        </p>
                        <Progress value={(uploadPhase.current / uploadPhase.total) * 100} className="h-2" />
                    </div>
                )}

                <DialogFooter className="gap-2 pt-4 border-t border-slate-100 bg-white z-10">
                    {isSubmitting && uploadPhase && (
                        <Button type="button" variant="outline" onClick={handleCancelUpload} className="rounded-xl">
                            {t("cancel")}
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                        disabled={isSubmitting}
                    >
                        {t("cancel")}
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || (type === 'link' && !linkUrl.trim()) || (type === 'youtube' && !youtubeUrl.trim())}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl px-6 shadow-lg shadow-purple-200 hover:shadow-xl transition-all active:scale-95"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>
                                    {uploadPhase
                                        ? t("boardUploadProgressShort", {
                                              current: uploadPhase.current,
                                              total: uploadPhase.total,
                                          })
                                        : t("boardSubmitting")}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>{t("boardSubmitShare")}</span>
                                <Send className="w-4 h-4" />
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
