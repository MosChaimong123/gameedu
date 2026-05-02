"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Layout, RefreshCw, MessageSquare } from "lucide-react";
import { io, Socket } from "socket.io-client";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { PostCard } from "./PostCard";
import type { BoardPostCardData } from "./PostCard";
import { CreatePostModal } from "./CreatePostModal";
import { getBoardWithPosts, ensureDefaultBoard } from "@/lib/actions/board-actions";

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
    const { t } = useLanguage();
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

        socket = io(window.location.origin, {
            path: "/socket.io",
            addTrailingSlash: false,
        });

        socket.emit("join-classroom", classId);

        socket.on("classroom-event", (event: ClassroomSocketEvent) => {
            if (event.type === "BOARD_UPDATE") {
                fetchBoard(true);
            }
        });

        return () => {
            socket.emit("leave-classroom", classId);
            socket.disconnect();
        };
    }, [classId, fetchBoard]);

    const handlePostCreated = (newPost: CreatedPost) => {
        setPosts((prev) => (prev.some((post) => post.id === newPost.id) ? prev : prev));
        socket.emit("classroom-update", {
            classId,
            type: "BOARD_UPDATE",
            data: { postId: newPost.id },
        });
        fetchBoard(true);
    };

    const handleUpdate = () => {
        fetchBoard(true);
        socket.emit("classroom-update", {
            classId,
            type: "BOARD_UPDATE",
            data: { action: "interaction" },
        });
    };

    if (loading) {
        return (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-sm font-bold">{t("boardLoading")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-200">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black leading-tight text-slate-800">{t("boardRoomTitle")}</h2>
                        <p className="text-xs text-slate-400">{t("boardRoomSubtitle")}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchBoard(true)}
                        disabled={isRefreshing}
                        className="rounded-xl border-slate-200"
                        aria-label={t("teacherCommandRefresh")}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 font-black text-white shadow-lg shadow-indigo-200 transition-all hover:shadow-xl active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        <span>{t("boardWriteIdea")}</span>
                    </Button>
                </div>
            </div>

            {posts.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                        <Layout className="h-10 w-10 text-slate-200" />
                    </div>
                    <h3 className="mb-1 font-bold text-slate-600">{t("boardEmptyTitle")}</h3>
                    <p className="mb-6 text-sm text-slate-400">{t("boardEmptyDesc")}</p>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        variant="outline"
                        className="rounded-xl border-indigo-200 font-bold text-indigo-600 hover:bg-indigo-50"
                    >
                        {t("boardCreateFirstPost")}
                    </Button>
                </div>
            ) : (
                <div className="grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
