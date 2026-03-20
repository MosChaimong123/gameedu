"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, BookOpen, Clock, Loader2, MoreVertical, Search, Trash2, ArrowLeft, Image as ImageIcon, ClipboardList } from "lucide-react"
import { AssignmentCreateModal } from "@/components/dashboard/assignment-create-modal"

type QuestionSet = {
    id: string
    title: string
    description: string | null
    isPublic: boolean
    coverImage: string | null
    createdAt: string
    updatedAt: string
    questions: { id: string }[]
    folderId: string | null
}

type Folder = {
    id: string
    name: string
    parentFolderId: string | null
    createdAt: string
}

import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/providers/language-provider"
import { Folder as FolderIcon, MoreHorizontal, FolderPlus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function MySetsPage() {
    const router = useRouter()
    const [sets, setSets] = useState<QuestionSet[]>([])
    const [folders, setFolders] = useState<Folder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [setToDelete, setSetToDelete] = useState<string | null>(null)
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
    const [assignSetId, setAssignSetId] = useState<string | null>(null)
    const [assignSetTitle, setAssignSetTitle] = useState("")
    const [activeFolderDropId, setActiveFolderDropId] = useState<string | null>(null)

    const handleDragStart = (e: React.DragEvent, setId: string) => {
        e.dataTransfer.setData("setId", setId)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent, folderId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        setActiveFolderDropId(folderId)
    }

    const handleDragLeave = () => {
        setActiveFolderDropId(null)
    }

    const handleDrop = async (e: React.DragEvent, folderId: string) => {
        e.preventDefault()
        setActiveFolderDropId(null)
        const setId = e.dataTransfer.getData("setId")
        if (setId) {
            handleMoveToFolder(setId, folderId)
        }
    }
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")

    const { t } = useLanguage()

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [setsRes, foldersRes] = await Promise.all([
                fetch("/api/sets"),
                fetch("/api/folders")
            ])
            
            if (setsRes.ok) {
                const setsData = await setsRes.json()
                setSets(setsData)
            }
            if (foldersRes.ok) {
                const foldersData = await foldersRes.json()
                setFolders(foldersData)
            }
        } catch (error) {
            console.error("Failed to fetch data", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return

        try {
            const response = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: newFolderName,
                    parentFolderId: currentFolderId 
                })
            })

            if (response.ok) {
                const folder = await response.json()
                setFolders([folder, ...folders])
                setIsCreateFolderOpen(false)
                setNewFolderName("")
            }
        } catch (error) {
            console.error("Failed to create folder", error)
        }
    }

    const handleDeleteSet = async () => {
        if (!setToDelete) return

        try {
            const response = await fetch(`/api/sets/${setToDelete}`, {
                method: "DELETE",
            })

            if (response.ok) {
                setSets(sets.filter((s: any) => s.id !== setToDelete))
            }
        } catch (error) {
            console.error("Failed to delete set", error)
        } finally {
            setSetToDelete(null)
        }
    }

    const handleMoveToFolder = async (setId: string, folderId: string | null) => {
        try {
            const response = await fetch(`/api/sets/${setId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderId })
            })

            if (response.ok) {
                setSets(sets.map((s: any) => s.id === setId ? { ...s, folderId } : s))
            }
        } catch (error) {
            console.error("Failed to move set", error)
        }
    }

    const handleDeleteFolder = async () => {
        if (!folderToDelete) return

        try {
            const response = await fetch(`/api/folders/${folderToDelete}`, {
                method: "DELETE",
            })

            if (response.ok) {
                setFolders(folders.filter((f: any) => f.id !== folderToDelete))
                // If we are currently inside the deleted folder, go back
                if (currentFolderId === folderToDelete) {
                    setCurrentFolderId(null)
                }
            }
        } catch (error) {
            console.error("Failed to delete folder", error)
        } finally {
            setFolderToDelete(null)
        }
    }

    const filteredSets = sets.filter((set: any) =>
        set.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Folder Creation Dialog */}
            <AlertDialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("createFolder") || "Create New Folder"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("enterFolderName") || "Please enter a name for your new folder."}
                        </AlertDialogDescription>
                        <div className="py-4">
                            <Input 
                                placeholder={t("folderName") || "Folder Name"}
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateFolder()
                                }}
                            />
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setNewFolderName("")
                            setIsCreateFolderOpen(false)
                        }}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleCreateFolder}
                            disabled={!newFolderName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {t("create") || "Create"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Folder Deletion Dialog */}
            <AlertDialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteFolderWarning") || "Are you sure you want to delete this folder? All sets inside will be moved to the main library."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFolder} className="bg-red-600 hover:bg-red-700">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={`h-10 w-10 border-slate-200 transition-all ${activeFolderDropId === 'main' ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110' : ''}`}
                        onClick={() => currentFolderId ? setCurrentFolderId(null) : router.push("/dashboard")}
                        onDragOver={(e) => handleDragOver(e, 'main')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, null as any)}
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            {currentFolderId ? folders.find((f: any) => f.id === currentFolderId)?.name : t("mySets")}
                        </h1>
                        <p className="text-slate-500">{t("manageSetsDesc")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline"
                        className="border-slate-200 text-slate-600"
                        onClick={() => setIsCreateFolderOpen(true)}
                    >
                        <FolderPlus className="mr-2 h-4 w-4" />
                        {t("createFolder") || "Create Folder"}
                    </Button>
                    <Link href="/dashboard/create-set">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("createSet")}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    placeholder={t("searchSetsPlaceholder") || "Search your sets..."}
                    className="pl-10 max-w-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            ) : (filteredSets.length === 0 && folders.filter((f: any) => f.parentFolderId === currentFolderId).length === 0) ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{searchQuery ? t("noSearchResults") : t("noSetsTitle")}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                        {searchQuery ? t("tryDifferentSearch") : t("noSetsDesc")}
                    </p>
                    {!searchQuery && (
                        <div className="flex items-center gap-2">
                             <Button onClick={() => setIsCreateFolderOpen(true)} variant="outline">
                                {t("createFolder") || "Create Folder"}
                            </Button>
                            <Link href="/dashboard/create-set">
                                <Button>{t("createFirstSet")}</Button>
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Folders */}
                    <AnimatePresence mode="popLayout">
                        {folders
                            .filter((f: any) => f.parentFolderId === currentFolderId)
                            .filter((f: any) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((folder: any) => (
                                <motion.div
                                    key={folder.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                                        activeFolderDropId === folder.id 
                                        ? "border-indigo-500 bg-indigo-50 shadow-2xl scale-105 ring-4 ring-indigo-500/20" 
                                        : "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-xl"
                                    }`}
                                    onClick={() => setCurrentFolderId(folder.id)}
                                    onDragOver={(e) => handleDragOver(e, folder.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                >
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="text-red-600" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFolderToDelete(folder.id);
                                                }}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {t("delete")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full scale-150 transform transition-transform group-hover:scale-[2]" />
                                        <FolderIcon className="w-16 h-16 text-indigo-500 relative z-10 fill-indigo-500/10 transition-transform group-hover:scale-110" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 text-center line-clamp-1">{folder.name}</h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {sets.filter((s: any) => s.folderId === folder.id).length} {t("items") || "Items"}
                                    </p>
                                </motion.div>
                            ))}
                    </AnimatePresence>

                    {/* Sets */}
                    {filteredSets
                        .filter((s: any) => s.folderId === currentFolderId)
                        .map((set: any) => (
                        <Card 
                            key={set.id} 
                            className="group hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col border-slate-200 cursor-grab active:cursor-grabbing"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, set.id)}
                        >
                            <div className="relative w-full aspect-video bg-slate-100 group-hover:bg-slate-200 transition-colors overflow-hidden">
                                {set.coverImage ? (
                                    <img
                                        src={set.coverImage}
                                        alt={set.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            <CardHeader className="p-4 pb-2 flex-grow space-y-2">
                                <div className="flex justify-between items-start">
                                    <Link href={`/dashboard/edit-set/${set.id}`} className="flex-grow">
                                        <CardTitle className="line-clamp-1 text-xl font-bold text-slate-800 hover:text-purple-600 transition-colors" title={set.title}>{set.title}</CardTitle>
                                    </Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mr-2 text-slate-400 hover:text-slate-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>{t("actions") || "Actions"}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {folders.length > 0 && (
                                                <>
                                                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold">{t("moveToFolder") || "Move to Folder"}</DropdownMenuLabel>
                                                    {set.folderId && (
                                                        <DropdownMenuItem onClick={() => handleMoveToFolder(set.id, null)}>
                                                            <ArrowLeft className="mr-2 h-4 w-4 text-slate-400" />
                                                            <span>{t("moveToMain") || "Move to Main Library"}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {folders.filter((f: any) => f.id !== set.folderId).map((folder: any) => (
                                                        <DropdownMenuItem key={folder.id} onClick={() => handleMoveToFolder(set.id, folder.id)}>
                                                            <FolderIcon className="mr-2 h-4 w-4 text-indigo-400" />
                                                            <span>{folder.name}</span>
                                                        </DropdownMenuItem>
                                                    ))}
                                                    <DropdownMenuSeparator />
                                                </>
                                            )}
                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-set/${set.id}`)}>
                                                <ImageIcon className="mr-2 h-4 w-4" />
                                                <span>{t("edit")}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => setSetToDelete(set.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>{t("delete")}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription className="line-clamp-2 min-h-[2.5em] text-slate-500 text-sm leading-relaxed">
                                    {set.description || <span className="italic text-slate-400">{t("noDescription")}</span>}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center text-xs font-medium text-slate-400 space-x-4">
                                    <div className="flex items-center bg-slate-100 px-2 py-1 rounded-md">
                                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                        {set.questions.length} {t("questionsCount")}
                                    </div>
                                    <div className="flex items-center bg-slate-100 px-2 py-1 rounded-md">
                                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                                        {new Date(set.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="p-4 pt-0 mt-auto">
                                <div className="flex w-full items-center gap-2">
                                    <Link href={`/host/${set.id}`} className="flex-[1.5]">
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all hover:-translate-y-0.5" size="sm">
                                            {t("host")}
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={() => {
                                            setAssignSetId(set.id);
                                            setAssignSetTitle(set.title);
                                        }}
                                        className="flex-[1.5] bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm transition-all hover:-translate-y-0.5"
                                        size="sm"
                                    >
                                        <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                                        Assign
                                    </Button>
                                    <Link href={`/dashboard/edit-set/${set.id}`} className="flex-[1.5]">
                                        <Button variant="outline" className="w-full border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-600 font-bold transition-all" size="sm">
                                            {t("edit")}
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSetToDelete(set.id);
                                        }}
                                        title={t("delete")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={!!setToDelete} onOpenChange={(open) => !open && setSetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteSetWarning")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSet} className="bg-red-600 hover:bg-red-700">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AssignmentCreateModal
                open={!!assignSetId}
                onOpenChange={(open) => !open && setAssignSetId(null)}
                setId={assignSetId || ""}
                setTitle={assignSetTitle}
            />
        </div>
    )
}
