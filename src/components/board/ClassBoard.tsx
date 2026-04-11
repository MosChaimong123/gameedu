"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Layout, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "./PostCard";
import type { BoardPostCardData } from "./PostCard";
import { CreatePostModal } from "./CreatePostModal";
import { getBoardWithPosts, ensureDefaultBoard } from "@/lib/actions/board-actions";
import { io, Socket } from "socket.io-client";

type BoardData = {
    id: string;
    posts?: BoardPostCardData[];
};

type CreatedPost = {
    id: string;
    title?: string | null;
    content?: string | null;
};

type BoardPost = BoardPostCardData;

type ClassroomSocketEvent = {
    type: string;
    data: unknown;
};

interface ClassBoardProps {
    classId: string;
    studentId?: string;
    userId?: string;
    isTeacher?: boolean;
}

let socket: Socket;

export function ClassBoard({ classId, studentId, userId, isTeacher }: ClassBoardProps) {
    const [board, setBoard] = useState<BoardData | null>(null);
    const [posts, setPosts] = useState<BoardPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const currentAuthorId = isTeacher ? (userId ?? "") : (studentId ?? "");

    const fetchBoard = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setIsRefreshing(true);
        
        try {
            const defaultBoard = await ensureDefaultBoard(classId);
            const boardData = await getBoardWithPosts(defaultBoard.id);
            setBoard(boardData);
            setPosts(boardData?.posts || []);
        } catch (error) {
            console.error("Failed to fetch board:", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [classId]);

    useEffect(() => {
        fetchBoard();

        // Initialize Socket.io
        socket = io(window.location.origin, {
            path: "/socket.io",
            addTrailingSlash: false
        });

        socket.emit("join-classroom", classId);

        socket.on("classroom-event", (event: ClassroomSocketEvent) => {
            if (event.type === "BOARD_UPDATE") {
                // To keep it simple and consistent, we just re-fetch the board data
                // This ensures we have the latest reactions and comments too
                fetchBoard(true);
            }
        });

        return () => {
            socket.emit("leave-classroom", classId);
            socket.disconnect();
        };
    }, [classId, fetchBoard]);

    const handlePostCreated = (newPost: CreatedPost) => {
        setPosts(prev => prev.some((post) => post.id === newPost.id) ? prev : prev);
        socket.emit("classroom-update", {
            classId,
            type: "BOARD_UPDATE",
            data: { postId: newPost.id }
        });
        fetchBoard(true);
    };

    const handleUpdate = () => {
        fetchBoard(true);
        // Notify others of reactions/comments/deletions
        socket.emit("classroom-update", {
            classId,
            type: "BOARD_UPDATE",
            data: { action: "interaction" }
        });
    };

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <p className="text-sm font-bold">กำลังโหลดกระดานไอเดีย...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Board Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 leading-tight">กระดานไอเดียของห้อง</h2>
                        <p className="text-xs text-slate-400">พื้นที่แลกเปลี่ยนและแชร์สิ่งดีๆ ร่วมกัน</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => fetchBoard(true)}
                        disabled={isRefreshing}
                        className="rounded-xl border-slate-200"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl px-4 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>เขียนไอเดีย</span>
                    </Button>
                </div>
            </div>

            {/* Posts Grid */}
            {posts.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layout className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-slate-600 font-bold mb-1">ยังไม่มีโพสต์ในขณะนี้</h3>
                    <p className="text-slate-400 text-sm mb-6">เริ่มเป็นคนแรกที่แชร์ไอเดียในห้องเรียนกันเลย!</p>
                    <Button 
                        onClick={() => setShowCreateModal(true)}
                        variant="outline"
                        className="rounded-xl border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50"
                    >
                        สร้างโพสต์แรก
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
                    {posts.map((post) => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            currentUserIdOrStudentId={currentAuthorId}
                            isTeacher={isTeacher}
                            onUpdate={handleUpdate}
                        />
                    ))}
                </div>
            )}

            {board?.id && (
                <CreatePostModal 
                    open={showCreateModal}
                    onOpenChange={setShowCreateModal}
                    boardId={board.id}
                    onPostCreated={handlePostCreated}
                />
            )}
        </div>
    );
}
