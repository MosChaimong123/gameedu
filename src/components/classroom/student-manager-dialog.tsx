"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GripVertical, Edit, Trash2, Users, Save, XCircle, UserCog } from "lucide-react";
import { Student } from "@prisma/client";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getThemeBgStyle, getThemeHorizontalBgClass } from "@/lib/classroom-utils";

type StudentWithSubmissions = Student & { submissions: { score: number }[] };

interface StudentManagerDialogProps {
    classId: string;
    theme: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChanged: (students: StudentWithSubmissions[]) => void;
    students: StudentWithSubmissions[];
}

function SortableStudentRow({
    student, index, onEdit, onDelete,
}: {
    student: StudentWithSubmissions;
    index: number;
    onEdit: (s: StudentWithSubmissions) => void;
    onDelete: (id: string) => void;
}) {
    const { t } = useLanguage();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: student.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-3 sm:px-4"
        >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <div {...listeners} {...attributes} className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing shrink-0">
                    <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-sm font-bold text-indigo-700">
                    {index + 1}
                </div>
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 sm:h-12 sm:w-12">
                    <Image
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar || student.id}`}
                        alt=""
                        fill
                        sizes="48px"
                        unoptimized
                        className="object-cover"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-base font-bold leading-tight text-slate-900">{student.name}</p>
                    {student.nickname && (
                        <p className="mt-0.5 text-sm text-slate-600">
                            {t("nicknameWithValue", { name: student.nickname ?? "" })}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 sm:w-auto sm:shrink-0 sm:border-t-0 sm:pt-0">
                <div className="text-left sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t("analyticsTableBehaviorColumn")}</p>
                    <p className="text-lg font-bold tabular-nums text-indigo-700">{student.behaviorPoints}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-90 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-amber-50 hover:text-amber-700" onClick={() => onEdit(student)} aria-label={t("ariaLabelEdit")}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(student.id)} aria-label={t("ariaLabelDelete")}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function StudentManagerDialog({ classId, theme, open, onOpenChange, onChanged, students: initialStudents }: StudentManagerDialogProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editStudent, setEditStudent] = useState<StudentWithSubmissions | null>(null);

    const [localStudents, setLocalStudents] = useState<StudentWithSubmissions[]>(initialStudents);
    if (initialStudents.length !== localStudents.length && initialStudents !== localStudents) {
        setLocalStudents([...initialStudents].sort((a, b) => a.order - b.order));
    }

    const [editName, setEditName] = useState("");
    const [editNickname, setEditNickname] = useState("");

    const startEdit = (s: StudentWithSubmissions) => {
        setEditStudent(s);
        setEditName(s.name);
        setEditNickname(s.nickname ?? "");
    };

    const cancelEdit = () => {
        setEditStudent(null);
        setEditName("");
        setEditNickname("");
    };

    const handleSaveEdit = async () => {
        if (!editStudent || !editName.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/students/${editStudent.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim(), nickname: editNickname.trim() || null }),
            });
            if (!res.ok) throw new Error();

            setLocalStudents(prev => prev.map(s => s.id === editStudent.id
                ? { ...s, name: editName.trim(), nickname: editNickname.trim() || null }
                : s
            ).sort((a, b) => a.order - b.order));

            const nextStudents = localStudents.map((student) =>
                student.id === editStudent.id
                    ? { ...student, name: editName.trim(), nickname: editNickname.trim() || null }
                    : student
            ).sort((a, b) => a.order - b.order);
            setLocalStudents(nextStudents);

            toast({
                title: t("toastStudentProfileSaveSuccessTitle"),
                description: t("toastStudentProfileSaveSuccessDesc"),
            });
            onChanged(nextStudents);
            cancelEdit();
        } catch {
            toast({
                title: t("toastStudentProfileSaveFailTitle"),
                description: t("toastStudentProfileSaveFailDesc"),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/students/${deleteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error();

            const nextStudents = localStudents.filter((student) => student.id !== deleteId);
            setLocalStudents(nextStudents);
            if (editStudent?.id === deleteId) cancelEdit();

            toast({
                title: t("toastStudentRemoveSuccessTitle"),
                description: t("toastStudentRemoveSuccessDesc"),
            });
            onChanged(nextStudents);
            setDeleteId(null);
        } catch {
            toast({
                title: t("toastStudentRemoveFailTitle"),
                description: t("toastStudentRemoveFailDesc"),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = localStudents.findIndex(s => s.id === active.id);
        const newIndex = localStudents.findIndex(s => s.id === over.id);
        const reordered = arrayMove(localStudents, oldIndex, newIndex);
        setLocalStudents(reordered);

        try {
            await fetch(`/api/classrooms/${classId}/students`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reordered.map((s, i) => ({ id: s.id, order: i }))),
            });
            onChanged(reordered.map((student, index) => ({ ...student, order: index })));
        } catch {
            setLocalStudents(localStudents);
            toast({
                title: t("toastStudentOrderFailTitle"),
                description: t("toastStudentOrderFailDesc"),
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[min(92dvh,40rem)] w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden rounded-2xl border-2 border-amber-200/50 bg-[#faf8f5] p-0 shadow-2xl sm:max-h-[90vh] lg:max-w-[56rem]">
                <DialogHeader
                    className={`shrink-0 px-5 py-4 text-white shadow-sm sm:px-7 sm:py-5 ${getThemeHorizontalBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogTitle className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-white drop-shadow-sm sm:gap-3 sm:text-2xl">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20 shadow-inner">
                            <UserCog className="h-5 w-5" />
                        </div>
                        <span>{t("studentManagerDialogTitle")}</span>
                        <span className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold text-white">
                            {t("studentsCount", { count: localStudents.length })}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="flex h-full min-h-[12rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                            <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                                <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                                    <Users className="h-5 w-5 shrink-0 text-indigo-600" /> {t("studentListHeading")}
                                </div>
                                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/80">
                                    <GripVertical className="h-3 w-3" />
                                    <span className="hidden sm:inline">{t("assignmentDragReorderHint")}</span>
                                    <span className="sm:hidden">{t("assignmentDragReorderHintShort")}</span>
                                </span>
                            </div>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden bg-[#f4f6fb] p-3 sm:p-4">
                                {localStudents.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 italic">
                                        {t("studentListEmpty")}
                                    </div>
                                ) : (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={localStudents.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                            {localStudents.map((s, i) => (
                                                <SortableStudentRow
                                                    key={s.id}
                                                    student={s}
                                                    index={i}
                                                    onEdit={startEdit}
                                                    onDelete={(id) => setDeleteId(id)}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex max-h-[45vh] w-full shrink-0 flex-col border-t border-amber-100/80 bg-white lg:max-h-none lg:w-[min(100%,420px)] lg:border-l lg:border-t-0">
                        {editStudent ? (
                            <div className="flex flex-col h-full">
                                <div className="p-5 border-b">
                                    <div
                                        className={`flex items-center gap-3 rounded-xl p-4 text-white shadow ${getThemeHorizontalBgClass(theme)}`}
                                        style={getThemeBgStyle(theme)}
                                    >
                                        <Edit className="w-5 h-5 text-white/80 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-base text-white">{t("studentEditFormTitle")}</p>
                                            <p className="text-white/80 text-xs truncate">{editStudent.name}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                    <div className="flex justify-center">
                                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-amber-200 shadow-md bg-slate-50">
                                            <Image
                                                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${editStudent.avatar || editStudent.id}`}
                                                alt=""
                                                fill
                                                sizes="96px"
                                                unoptimized
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-sm">{t("studentLegalNameLabel")}</Label>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder={t("studentLegalNamePlaceholder")}
                                            className="h-11 text-base font-medium focus-visible:ring-amber-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-sm">{t("studentNicknameFieldLabel")}</Label>
                                        <Input
                                            value={editNickname}
                                            onChange={(e) => setEditNickname(e.target.value)}
                                            placeholder={t("studentNicknameFieldPlaceholder")}
                                            className="h-11 text-base focus-visible:ring-amber-400"
                                        />
                                    </div>

                                    <div className="bg-slate-50 rounded-xl border p-4 space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("studentMetaSection")}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">{t("analyticsTableBehaviorColumn")}</span>
                                            <span className="font-bold text-indigo-600">{editStudent.behaviorPoints}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">{t("studentLoginCodeLabel")}</span>
                                            <span className="max-w-[16rem] break-all font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">{editStudent.loginCode?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 border-t bg-slate-50 space-y-3">
                                    <Button
                                        onClick={handleSaveEdit}
                                        disabled={loading || !editName.trim()}
                                        className={`h-12 w-full rounded-xl text-base font-bold text-white shadow-md transition-opacity hover:opacity-90 ${getThemeHorizontalBgClass(theme)}`}
                                        style={getThemeBgStyle(theme)}
                                    >
                                        <Save className="w-5 h-5 mr-2" /> {t("save")}
                                    </Button>
                                    <Button
                                        onClick={cancelEdit}
                                        variant="outline"
                                        className="w-full h-10 font-bold rounded-xl border-2 border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> {t("cancel")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-slate-600 sm:p-8">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-amber-50/80">
                                    <Edit className="h-8 w-8 text-indigo-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-base font-bold text-slate-800">{t("studentPickToEditTitle")}</p>
                                    <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-slate-600">{t("selectStudentToEditHint")}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteStudentConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteStudentBehaviorDataWarning")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t("deleteStudentConfirmAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
