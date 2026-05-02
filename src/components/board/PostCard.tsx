"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { 
    Heart, MessageCircle, Trash2, MoreVertical, ExternalLink, 
    BarChart3, ChevronRight, X,
    FileText, FileImage, FileAudio, FileVideo, FileArchive, FileSpreadsheet, File,
    Lock, Unlock, ChevronLeft
} from "lucide-react";
import Image from "next/image";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toggleBoardReaction, deleteBoardPost, addBoardComment, voteBoardPoll, togglePollStatus } from "@/lib/actions/board-actions";
import { formatBoardActionErrorMessage } from "@/lib/board-action-error-messages";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";

type BoardAuthor = {
    name: string | null;
    image?: string | null;
    avatar?: string | null;
    nickname?: string | null;
};

type BoardReaction = {
    authorStudentId: string | null;
    authorUserId: string | null;
};

type BoardVote = {
    optionId: string;
    authorStudentId: string | null;
    authorUserId: string | null;
};

type BoardComment = {
    id: string;
    content: string;
    authorStudent?: BoardAuthor | null;
    authorUser?: BoardAuthor | null;
};

type BoardPollOption = {
    id: string;
    text: string;
};

export type BoardPostCardData = {
    id: string;
    type?: string | null;
    title?: string | null;
    content: string;
    image?: string | null;
    color?: string | null;
    linkUrl?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    videoUrl?: string | null;
    youtubeId?: string | null;
    albumImages?: string[] | null;
    pollQuestion?: string | null;
    pollOptions?: BoardPollOption[] | null;
    pollClosed: boolean;
    createdAt: Date | string;
    authorStudentId?: string | null;
    authorUserId?: string | null;
    authorStudent?: BoardAuthor | null;
    authorUser?: BoardAuthor | null;
    comments: BoardComment[];
    reactions: BoardReaction[];
    pollVotes?: BoardVote[];
};

interface PostCardProps {
    post: BoardPostCardData;
    currentUserIdOrStudentId: string;
    isTeacher?: boolean;
    onUpdate?: () => void;
}

const COLOR_MAP: Record<string, string> = {
    yellow: "bg-yellow-50 border-yellow-100",
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    pink: "bg-pink-50 border-pink-100",
    purple: "bg-purple-50 border-purple-100",
    default: "bg-white border-slate-100",
};

export function PostCard({ post, currentUserIdOrStudentId, isTeacher, onUpdate }: PostCardProps) {
    const { t, language } = useLanguage();
    const dateLocale = language === "th" ? th : enUS;
    const [isReacting, setIsReacting] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [previewGallery, setPreviewGallery] = useState<string[] | null>(null);
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const author = post.authorStudent || post.authorUser;
    const authorName = author?.nickname || author?.name || t("boardPostUnknownAuthor");
    const authorImage = post.authorUser?.image || (post.authorStudent?.avatar ? `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorStudent.avatar}&backgroundColor=transparent` : null);
    
    const reactionCount = post.reactions.length;
    const hasReacted = post.reactions.some((reaction) => reaction.authorStudentId === currentUserIdOrStudentId || reaction.authorUserId === currentUserIdOrStudentId);

    const handleReaction = async () => {
        if (isReacting) return;
        setIsReacting(true);
        try {
            await toggleBoardReaction({
                postId: post.id,
                type: "HEART",
            });
            if (onUpdate) onUpdate();
        } catch {
        } finally {
            setIsReacting(false);
        }
    };

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteBoardPost(post.id);
            setIsDeleteDialogOpen(false);
            toast({ title: t("boardPostDeleteSuccessTitle"), description: t("boardPostDeleteSuccessDesc") });
            if (onUpdate) onUpdate();
        } catch {
            toast({ variant: "destructive", title: t("boardPostErrorShort"), description: t("boardPostDeleteFailDesc") });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isCommenting) return;
        
        setIsCommenting(true);
        try {
            await addBoardComment({
                postId: post.id,
                content: commentText.trim(),
            });
            setCommentText("");
            if (onUpdate) onUpdate();
        } catch {
             toast({ variant: "destructive", title: t("boardPostErrorShort"), description: t("boardPostCommentFailDesc") });
        } finally {
            setIsCommenting(false);
        }
    };

    const handleVote = async (optionId: string) => {
        if (isVoting || post.pollClosed) return;
        setIsVoting(true);
        try {
            await voteBoardPoll({
                postId: post.id,
                optionId,
            });
            if (onUpdate) onUpdate();
        } catch (error: unknown) {
            const raw = error instanceof Error ? error.message : "";
            const message = raw ? formatBoardActionErrorMessage(raw, t) : t("boardPostVoteFailDesc");
            toast({ variant: "destructive", title: t("boardPostErrorShort"), description: message });
        } finally {
            setIsVoting(false);
        }
    };

    const handleTogglePoll = async () => {
        try {
            await togglePollStatus(post.id);
            toast({
                title: post.pollClosed ? t("boardPostPollOpenedTitle") : t("boardPostPollClosedTitle"),
                description: post.pollClosed ? t("boardPostPollOpenedDesc") : t("boardPostPollClosedDesc"),
            });
            if (onUpdate) onUpdate();
        } catch {
            toast({ variant: "destructive", title: t("boardPostErrorShort"), description: t("boardPostPollToggleFail") });
        }
    };

    const pollVotes = post.pollVotes || [];
    const totalVotes = pollVotes.length;
    const myVote = pollVotes.find((vote) => vote.authorStudentId === currentUserIdOrStudentId || vote.authorUserId === currentUserIdOrStudentId);
    const imageUrl = post.image ?? null;
    const albumImages = post.albumImages ?? [];

    const openPreview = (gallery: string[], index: number) => {
        setPreviewGallery(gallery);
        setCurrentPreviewIndex(index);
    };

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!previewGallery) return;
        setCurrentPreviewIndex((prev) => (prev + 1) % previewGallery.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!previewGallery) return;
        setCurrentPreviewIndex((prev) => (prev - 1 + previewGallery.length) % previewGallery.length);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop();
        
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
        const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
        const sheetExts = ['xls', 'xlsx', 'csv'];
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
        const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
        const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

        if (imageExts.includes(ext!)) return { icon: FileImage, color: "bg-blue-100 text-blue-600" };
        if (docExts.includes(ext!)) return { icon: FileText, color: "bg-red-100 text-red-600" };
        if (sheetExts.includes(ext!)) return { icon: FileSpreadsheet, color: "bg-emerald-100 text-emerald-600" };
        if (videoExts.includes(ext!)) return { icon: FileVideo, color: "bg-purple-100 text-purple-600" };
        if (audioExts.includes(ext!)) return { icon: FileAudio, color: "bg-pink-100 text-pink-600" };
        if (archiveExts.includes(ext!)) return { icon: FileArchive, color: "bg-amber-100 text-amber-600" };
        
        return { icon: File, color: "bg-slate-100 text-slate-600" };
    };

    return (
        <div className={`rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md animate-in zoom-in-95 duration-300 ${COLOR_MAP[post.color || "default"]}`}>
            {/* Header */}
            <div className="p-4 pb-2 flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/50 border border-slate-200">
                        {authorImage ? (
                            <Image src={authorImage} alt={authorName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">👤</div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-800 leading-none">{authorName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: dateLocale })}
                        </p>
                    </div>
                </div>

                {(isTeacher || post.authorStudentId === currentUserIdOrStudentId || post.authorUserId === currentUserIdOrStudentId) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-500 font-bold" onClick={() => setIsDeleteDialogOpen(true)}>
                                <Trash2 className="w-4 h-4 mr-2" /> {t("boardPostDeletePost")}
                            </DropdownMenuItem>
                            {isTeacher && post.type === "poll" && (
                                <DropdownMenuItem onClick={handleTogglePoll}>
                                    {post.pollClosed ? (
                                        <>
                                            <Unlock className="w-4 h-4 mr-2" /> {t("boardPostOpenVoting")}
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4 mr-2" /> {t("boardPostCloseVoting")}
                                        </>
                                    )}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Content */}
            <div className="px-4 py-2 flex-grow">
                {post.title && <h3 className="font-black text-sm text-slate-900 mb-1">{post.title}</h3>}
                {post.content && <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-2">{post.content}</p>}
                
                {/* Text / Standard Image or Thumbnail */}
                {(post.type === "text" || (imageUrl && post.type !== "album")) && imageUrl && (
                    <div 
                        className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black/5 aspect-video relative cursor-zoom-in group"
                        onClick={() => openPreview([imageUrl], 0)}
                    >
                        <Image src={imageUrl} alt={t("boardPostImageAlt")} fill className="object-cover transition-transform group-hover:scale-105" unoptimized sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                )}

                {/* Link View */}
                {post.type === "link" && post.linkUrl && (
                    <a 
                        href={post.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mb-2 group"
                    >
                        <div className="bg-white/50 border border-black/5 rounded-xl p-3 flex items-center gap-3 transition-colors group-hover:bg-white/80">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <ExternalLink className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{post.linkUrl}</p>
                                <p className="text-[10px] text-slate-400">{t("boardPostLinkOpenHint")}</p>
                            </div>
                        </div>
                    </a>
                )}

                {/* YouTube View */}
                {post.type === "youtube" && post.youtubeId && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black/5 aspect-video relative shadow-sm">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${post.youtubeId}`}
                            title={t("boardYoutubePlayerTitle")}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0"
                        />
                    </div>
                )}

                {/* File View */}
                {post.type === "file" && post.fileUrl && (
                    <a 
                        href={post.fileUrl} 
                        target="_blank" 
                        download
                        className="block mb-2 group"
                    >
                        <div className="bg-white/50 border border-black/5 rounded-xl p-3 flex items-center gap-3 transition-colors group-hover:bg-white/80">
                            {(() => {
                                const { icon: Icon, color } = getFileIcon(post.fileName || post.fileUrl);
                                return (
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                );
                            })()}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{post.fileName || t("boardDefaultFileName")}</p>
                                <p className="text-[10px] text-slate-400">{t("boardPostDownloadHint")}</p>
                            </div>
                        </div>
                    </a>
                )}

                {/* Video View */}
                {post.type === "video" && post.videoUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black/5 relative group max-h-[500px] flex items-center justify-center">
                        <video 
                            src={post.videoUrl} 
                            controls 
                            className="w-full h-auto max-h-[500px]"
                            poster={post.image || undefined}
                        />
                    </div>
                )}

                {/* Album View */}
                {post.type === "album" && albumImages.length > 0 && (
                    <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                        {albumImages.slice(0, 4).map((imgUrl, idx) => (
                            <div 
                                key={idx} 
                                className={`relative bg-black/5 aspect-square cursor-zoom-in group ${albumImages.length === 1 ? 'col-span-2' : ''}`}
                                onClick={() => openPreview(albumImages, idx)}
                            >
                                <Image src={imgUrl} alt={t("boardAlbumImageAlt", { n: idx + 1 })} fill className="object-cover transition-transform group-hover:scale-105" unoptimized sizes="(max-width: 768px) 50vw, 25vw" />
                                {idx === 3 && albumImages.length > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-lg group-hover:bg-black/40 transition-colors">
                                        +{albumImages.length - 4}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Poll View */}
                {post.type === "poll" && post.pollOptions && Array.isArray(post.pollOptions) && (
                    <div className="mb-2 bg-white/40 border border-black/5 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-indigo-600" />
                                <p className="text-xs font-black text-slate-800">{post.pollQuestion || t("boardPostPollDefaultQuestion")}</p>
                            </div>
                            {post.pollClosed && (
                                <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Lock className="w-2 h-2" /> {t("boardPostPollClosedBadge")}
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {post.pollOptions.map((opt) => {
                                const optVotes = pollVotes.filter((vote) => vote.optionId === opt.id).length;
                                const percent = totalVotes > 0 ? (optVotes / totalVotes) * 100 : 0;
                                const isSelected = myVote?.optionId === opt.id;
                                
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleVote(opt.id)}
                                        disabled={isVoting || post.pollClosed}
                                        className={`w-full group relative h-9 rounded-lg overflow-hidden border text-left transition-all ${
                                            isSelected ? 'border-indigo-600 bg-indigo-50' : 
                                            post.pollClosed ? 'border-slate-100 bg-slate-50 cursor-not-allowed' :
                                            'border-slate-100 bg-white/60 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div 
                                            className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ${
                                                isSelected ? 'bg-indigo-100' : 'bg-slate-100'
                                            }`}
                                            style={{ width: `${percent}%` }}
                                        />
                                        <div className="relative h-full flex items-center justify-between px-3">
                                            <span className="text-xs font-bold text-slate-700 truncate mr-2">{opt.text}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400">{Math.round(percent)}%</span>
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[9px] text-slate-400 text-center font-bold">{t("boardPostTotalVotes", { count: totalVotes })}</p>
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="p-3 pt-1 flex items-center gap-4">
                <button 
                    onClick={handleReaction}
                    disabled={isReacting}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1.5 rounded-xl transition-all ${
                        hasReacted ? "text-pink-600 bg-pink-100" : "text-slate-500 hover:bg-black/5"
                    }`}
                >
                    <Heart className={`w-4 h-4 ${hasReacted ? "fill-pink-600" : ""}`} />
                    {reactionCount > 0 && reactionCount}
                </button>

                <button 
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-2 py-1.5 rounded-xl transition-all hover:bg-black/5"
                >
                    <MessageCircle className="w-4 h-4" />
                    {post.comments.length > 0 && post.comments.length}
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="px-4 pb-4 space-y-3 bg-black/5 pt-3 animate-in slide-in-from-top-2">
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {post.comments.length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center italic py-2">{t("boardPostNoComments")}</p>
                        )}
                        {post.comments.map((comment) => {
                            const cAuthor = comment.authorStudent || comment.authorUser;
                            const cName = cAuthor?.nickname || cAuthor?.name || t("boardPostUnknownAuthor");
                            return (
                                <div key={comment.id} className="text-xs bg-white p-2 rounded-xl shadow-sm border border-black/5">
                                    <span className="font-black text-slate-800 mr-1">{cName}:</span>
                                    <span className="text-slate-600">{comment.content}</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    <form onSubmit={handleAddComment} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder={t("boardCommentPlaceholder")}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="bg-white rounded-xl px-3 py-1.5 text-xs flex-1 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                        />
                        <button 
                            type="submit"
                            disabled={isCommenting || !commentText.trim()}
                            className="bg-purple-600 text-white rounded-xl px-3 py-1.5 text-[10px] font-bold disabled:opacity-50"
                        >
                            {t("boardPostSend")}
                        </button>
                    </form>
                </div>
            )}

            {/* Image Preview Dialog */}
            <Dialog open={!!previewGallery} onOpenChange={(open) => !open && setPreviewGallery(null)}>
                <DialogContent className="max-w-4xl border-none bg-transparent shadow-none p-0 flex items-center justify-center h-auto">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{t("boardImagePreviewSrTitle")}</DialogTitle>
                    </DialogHeader>
                    {previewGallery && (
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <Image
                                src={previewGallery[currentPreviewIndex]}
                                alt={t("boardImagePreviewAlt")}
                                width={1200}
                                height={900}
                                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                                unoptimized
                            />
                            
                            {/* Navigation Buttons */}
                            {previewGallery.length > 1 && (
                                <>
                                    <button 
                                        onClick={prevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button 
                                        onClick={nextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                    
                                    {/* Counter */}
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold backdrop-blur-sm">
                                        {currentPreviewIndex + 1} / {previewGallery.length}
                                    </div>
                                </>
                            )}

                            <button 
                                onClick={() => setPreviewGallery(null)}
                                className="absolute top-0 right-0 m-6 text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors backdrop-blur-sm"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("boardPostDeleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("boardPostDeleteConfirmDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                void handleDelete();
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t("boardPostDeleting") : t("boardPostDeletePost")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
