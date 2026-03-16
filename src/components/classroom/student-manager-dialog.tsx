"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GripVertical, Edit, Trash2, Users, Save, XCircle, UserCog } from "lucide-react";
import { Student } from "@prisma/client";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";

type StudentWithSubmissions = Student & { submissions: { score: number }[] };

interface StudentManagerDialogProps {
    classId: string;
    theme: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChanged: () => void;
    students: StudentWithSubmissions[];
}

// --- Sortable Row ---
function SortableStudentRow({
    student, index, onEdit, onDelete,
}: {
    student: StudentWithSubmissions;
    index: number;
    onEdit: (s: StudentWithSubmissions) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: student.id });

    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
            <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none shrink-0">
                <GripVertical className="w-5 h-5" />
            </div>
            {/* Number badge */}
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-500 shrink-0">
                {index + 1}
            </div>
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 shrink-0">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar || student.id}`} className="w-full h-full" alt="" />
            </div>
            {/* Name & Nickname */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-base leading-tight">{student.name}</p>
                {student.nickname && (
                    <p className="text-sm text-slate-400 mt-0.5">ชื่อเล่น: <span className="font-medium text-slate-500">{student.nickname}</span></p>
                )}
            </div>
            {/* Points */}
            <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">คะแนน</p>
                <p className="font-bold text-indigo-600 text-base">{student.points}</p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-amber-600 hover:bg-amber-50" onClick={() => onEdit(student)}>
                    <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(student.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

// --- Main Dialog ---
export function StudentManagerDialog({ classId, theme, open, onOpenChange, onChanged, students: initialStudents }: StudentManagerDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editStudent, setEditStudent] = useState<StudentWithSubmissions | null>(null);

    const [localStudents, setLocalStudents] = useState<StudentWithSubmissions[]>(initialStudents);
    if (initialStudents.length !== localStudents.length && initialStudents !== localStudents) {
        setLocalStudents([...initialStudents].sort((a, b) => a.order - b.order));
    }

    // Edit form
    const [editName, setEditName] = useState("");
    const [editNickname, setEditNickname] = useState("");

    const startEdit = (s: StudentWithSubmissions) => {
        setEditStudent(s);
        setEditName(s.name);
        setEditNickname(s.nickname ?? "");
    };

    const cancelEdit = () => { setEditStudent(null); setEditName(""); setEditNickname(""); };

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
            ));
            toast({ title: "บันทึกแล้ว!" });
            onChanged();
            cancelEdit();
        } catch {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/students/${deleteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setLocalStudents(prev => prev.filter(s => s.id !== deleteId));
            if (editStudent?.id === deleteId) cancelEdit();
            toast({ title: "ลบนักเรียนแล้ว" });
            onChanged();
            setDeleteId(null);
        } catch {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally { setLoading(false); }
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
            onChanged();
        } catch {
            setLocalStudents(localStudents);
            toast({ title: "ไม่สามารถบันทึกลำดับได้", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] w-[95vw] overflow-y-auto max-h-[90vh] flex flex-col p-0 bg-[#F4F6FB] gap-0 border-0 shadow-2xl rounded-2xl">
                {/* Header — themed gradient */}
                <DialogHeader 
                    className={`px-7 py-5 flex flex-row items-center shrink-0 ${getThemeBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                            <UserCog className="w-5 h-5" />
                        </div>
                        จัดการนักเรียน
                        <span className="ml-2 bg-white/20 text-white text-sm font-semibold px-3 py-1 rounded-full">{localStudents.length} คน</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* ===== LEFT: Student List ===== */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="px-5 py-4 border-b flex justify-between items-center shrink-0 bg-slate-50">
                                <div className="font-bold text-slate-700 flex items-center gap-2 text-base">
                                    <Users className="w-5 h-5 text-indigo-400" /> รายชื่อนักเรียน
                                </div>
                                <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                                    <GripVertical className="w-3 h-3" /> ลากเพื่อเรียงลำดับ
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8F9FE]">
                                {localStudents.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 italic">
                                        ยังไม่มีนักเรียนในห้องนี้
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

                    {/* ===== RIGHT: Edit Form ===== */}
                    <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0">
                        {editStudent ? (
                            <div className="flex flex-col h-full">
                                {/* Edit Header */}
                                <div className="p-5 border-b">
                                    <div 
                                        className={`text-white rounded-xl p-4 flex items-center gap-3 shadow ${getThemeBgClass(theme)}`}
                                        style={getThemeBgStyle(theme)}
                                    >
                                        <Edit className="w-5 h-5 text-white/80 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-base text-white">แก้ไขข้อมูลนักเรียน</p>
                                            <p className="text-white/80 text-xs truncate">{editStudent.name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Edit form body */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                    {/* Avatar preview */}
                                    <div className="flex justify-center">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-200 shadow-md bg-slate-50">
                                            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${editStudent.avatar || editStudent.id}`} className="w-full h-full" alt="" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-sm">ชื่อ-นามสกุล</Label>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="ชื่อนักเรียน..."
                                            className="h-11 text-base font-medium focus-visible:ring-amber-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-sm">ชื่อเล่น <span className="font-normal text-slate-400">(ไม่บังคับ)</span></Label>
                                        <Input
                                            value={editNickname}
                                            onChange={(e) => setEditNickname(e.target.value)}
                                            placeholder="ชื่อเล่น..."
                                            className="h-11 text-base focus-visible:ring-amber-400"
                                        />
                                    </div>

                                    {/* Stats read-only */}
                                    <div className="bg-slate-50 rounded-xl border p-4 space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ข้อมูล</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">คะแนน</span>
                                            <span className="font-bold text-indigo-600">{editStudent.points} แต้ม</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">รหัสเข้าระบบ</span>
                                            <span className="font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">{editStudent.loginCode}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Edit footer */}
                                <div className="p-5 border-t bg-slate-50 space-y-3">
                                    <Button
                                        onClick={handleSaveEdit}
                                        disabled={loading || !editName.trim()}
                                        className={`w-full h-12 text-white font-bold text-base rounded-xl shadow-md transition-opacity hover:opacity-90 ${getThemeBgClass(theme)}`}
                                        style={getThemeBgStyle(theme)}
                                    >
                                        <Save className="w-5 h-5 mr-2" /> บันทึก
                                    </Button>
                                    <Button
                                        onClick={cancelEdit}
                                        variant="outline"
                                        className="w-full h-10 font-bold rounded-xl border-2 border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> ยกเลิก
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // Empty state for right panel
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 p-8">
                                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Edit className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-600">เลือกนักเรียนเพื่อแก้ไข</p>
                                    <p className="text-sm mt-1">คลิกปุ่ม ✏️ บนนักเรียนในรายชื่อ</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบนักเรียน?</AlertDialogTitle>
                        <AlertDialogDescription>
                            คะแนนและประวัติทั้งหมดของนักเรียนจะถูกลบออกไปด้วย ไม่สามารถกู้คืนได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            ลบนักเรียน
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
