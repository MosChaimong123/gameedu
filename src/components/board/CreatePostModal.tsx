"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Send, X, Link as LinkIcon, FileText, Youtube, ListTodo, Plus as PlusIcon, Upload, Loader2, Video } from "lucide-react";
import { createBoardPost } from "@/lib/actions/board-actions";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

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
    videoUrl?: string;
    videoName?: string;
    youtubeId?: string;
    pollQuestion?: string;
    pollOptions?: Array<{ text: string; id: string }>;
    albumImages?: string[];
};

interface CreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardId: string;
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

export function CreatePostModal({
    open, onOpenChange, boardId, onPostCreated
}: CreatePostModalProps) {
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
    
    // Local file states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const albumInputRef = useRef<HTMLInputElement>(null);
    const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        return await res.json();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsSubmitting(true);
        try {
            const data: BoardPostInput = {
                boardId,
                type,
                title: title.trim(),
                content: content.trim(),
                color: selectedColor
            };

            if (type === "link") data.linkUrl = linkUrl.trim();
            if (type === "file") {
                if (selectedFile) {
                    const uploadRes = await uploadFile(selectedFile);
                    data.fileUrl = uploadRes.url;
                    data.fileName = uploadRes.fileName;
                } else {
                    data.fileUrl = fileUrl.trim();
                    data.fileName = "ไฟล์แนบ";
                }
                if (!data.fileUrl) throw new Error("กรุณาอัปโหลดไฟล์หรือใส่ลิงก์");
            }
            if (type === "video") {
                if (selectedVideo) {
                    const uploadRes = await uploadFile(selectedVideo);
                    data.videoUrl = uploadRes.url;
                    data.videoName = uploadRes.fileName;
                } else {
                    data.videoUrl = videoUrl.trim();
                    data.videoName = "วิดีโอ";
                }
                if (!data.videoUrl) throw new Error("กรุณาอัปโหลดวิดีโอหรือใส่ลิงก์");
            }
            if (type === "youtube") {
                const youtubeId = extractYoutubeId(youtubeUrl);
                if (youtubeId) {
                    data.youtubeId = youtubeId;
                }
            }
            if (type === "poll") {
                data.pollQuestion = pollQuestion.trim();
                data.pollOptions = pollOptions.filter(o => o.trim()).map((o, i) => ({ text: o.trim(), id: `opt-${i}` }));
            }
            if (type === "album") {
                const uploadedUrls = [...albumUrls.filter(u => u.trim())];
                if (selectedFiles.length > 0) {
                    for (const f of selectedFiles) {
                        const uploadRes = await uploadFile(f);
                        uploadedUrls.push(uploadRes.url);
                    }
                }
                data.albumImages = uploadedUrls;
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
            setSelectedFile(null);
            setSelectedFiles([]);
            setSelectedColor("default");
            onOpenChange(false);
            
            if (onPostCreated) onPostCreated(post);
            
            toast({
                title: "โพสต์สำเร็จ!",
                description: "โพสต์ของคุณถูกแชร์ลงกระดานแล้ว",
            });
        } catch {
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถสร้างโพสต์ได้ในขณะนี้",
            });
        } finally {
            setIsSubmitting(false);
        }
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
                    <DialogTitle className="text-xl font-black text-slate-800">✨ แชร์อะไรดีวันนี้?</DialogTitle>
                </DialogHeader>
                
                {/* Type Selection */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
                    {[
                        { id: 'file', icon: FileText, label: 'ไฟล์' },
                        { id: 'album', icon: ImageIcon, label: 'อัลบั้ม' },
                        { id: 'video', label: 'วิดีโอ', icon: Video, color: 'text-purple-500', bgColor: 'bg-purple-50' },
                        { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-50' },
                        { id: 'poll', icon: ListTodo, label: 'โพล' },
                        { id: 'link', icon: LinkIcon, label: 'ลิงก์' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setType(t.id as PostType)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                                type === t.id ? "bg-white shadow-sm text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-black">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2 custom-scrollbar">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-400">หัวข้อ (เลือกได้)</Label>
                        <Input 
                            id="title"
                            placeholder="ใส่หัวข้อที่นี่..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="rounded-xl border-slate-200 focus:ring-purple-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-slate-400">เนื้อหา / คำอธิบาย</Label>
                        <Textarea 
                            id="content"
                            placeholder="เขียนข้อความประกอบ..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="rounded-xl border-slate-200 focus:ring-purple-500 min-h-[80px] resize-none"
                        />
                    </div>

                    {/* Dynamic Fields */}
                    {type === "link" && (
                        <div className="space-y-2 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> ลิงก์ที่ต้องการแชร์
                            </Label>
                            <Input 
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    )}

                    {type === "file" && (
                        <div className="space-y-3 animate-in slide-in-from-left-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">เลือกไฟล์จากเครื่อง</Label>
                                <input 
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all",
                                        selectedFile ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                                    )}
                                >
                                    {selectedFile ? (
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <FileText className="w-5 h-5" />
                                            <span className="text-sm font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                                            <X 
                                                className="w-4 h-4 hover:text-red-500" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(null);
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-slate-300 mb-1" />
                                            <span className="text-xs text-slate-400 font-bold">คลิกที่นี่เพื่ออัปโหลดไฟล์</span>
                                        </>
                                    )}
                                </div>
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
                                        >ยกเลิก</Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-500">คลิกเพื่ออัปโหลดวิดีโอ</p>
                                            <p className="text-[10px] text-slate-400">MP4, MOV, WEBM (ขนาดไม่เกิน 50MB)</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {type === "youtube" && (
                        <div className="space-y-2 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Youtube className="w-3 h-3" /> ลิงก์ YouTube
                            </Label>
                            <Input 
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    )}

                    {type === "poll" && (
                        <div className="space-y-3 animate-in slide-in-from-left-2">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">คำถาม</Label>
                                <Input 
                                    placeholder="เลือกอะไรดี?"
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    className="rounded-xl border-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">ตัวเลือก</Label>
                                {pollOptions.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input 
                                            placeholder={`ตัวเลือกที่ ${i + 1}`}
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
                                    <PlusIcon className="w-3 h-3 mr-1" /> เพิ่มตัวเลือก
                                </Button>
                            </div>
                        </div>
                    )}

                    {type === "album" && (
                        <div className="space-y-3 animate-in slide-in-from-left-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> รวมรูปภาพจากเครื่อง
                            </Label>
                            
                            <input 
                                type="file"
                                ref={albumInputRef}
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setSelectedFiles([...selectedFiles, ...files]);
                                }}
                            />

                            <div className="grid grid-cols-4 gap-2">
                                {selectedFiles.map((file, i) => (
                                    <div key={i} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={URL.createObjectURL(file)} 
                                            alt="Preview" 
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
                                    <span className="text-[10px] font-bold">เพิ่มรูป</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">สีของการ์ด</Label>
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

                <DialogFooter className="gap-2 pt-4 border-t border-slate-100 bg-white z-10">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        ยกเลิก
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || (type === 'link' && !linkUrl.trim()) || (type === 'youtube' && !youtubeUrl.trim())}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl px-6 shadow-lg shadow-purple-200 hover:shadow-xl transition-all active:scale-95"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>กำลังส่ง...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>แชร์เลย!</span>
                                <Send className="w-4 h-4" />
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
