"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/components/providers/language-provider";
import { useToast } from "@/components/ui/use-toast";
import {
    Plus, X, Star, Eye, EyeOff, Edit, Trash2, GripVertical,
    Settings2, CheckSquare, BookOpen, Save, XCircle
} from "lucide-react";
import { Assignment } from "@prisma/client";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AddAssignmentDialogProps {
    classId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdded: () => void;
    assignments: Assignment[];
}

// --- Sortable Assignment List Item ---
function SortableItem({
    a,
    onEdit,
    onToggleVisible,
    onDelete,
    visibilityLoading,
}: {
    a: Assignment;
    onEdit: (a: Assignment) => void;
    onToggleVisible: (id: string, visible: boolean) => void;
    onDelete: (id: string) => void;
    visibilityLoading: string | null;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: a.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border gap-3 md:gap-4 transition-all hover:border-indigo-300 hover:shadow-md group ${
                !a.visible ? "opacity-60 border-dashed border-slate-200" : "border-slate-200"
            }`}
        >
            <div
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none shrink-0"
            >
                <GripVertical className="w-5 h-5" />
            </div>
            <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 ${
                    a.type === "score" ? "bg-[#3b82f6]" : a.type === "checklist" ? "bg-[#10b981]" : "bg-[#eab308]"
                }`}
            >
                {a.type === "score" ? (
                    <Star className="w-6 h-6 fill-current" />
                ) : a.type === "checklist" ? (
                    <CheckSquare className="w-6 h-6" />
                ) : (
                    <BookOpen className="w-6 h-6" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-base md:text-lg truncate">{a.name}</div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">
                        เต็ม {a.maxScore}
                    </span>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-slate-400 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    title={a.visible ? "ซ่อนภารกิจ" : "แสดงภารกิจ"}
                    className={`h-8 w-8 ${a.visible ? "hover:text-orange-500 hover:bg-orange-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
                    onClick={() => onToggleVisible(a.id, !a.visible)}
                    disabled={visibilityLoading === a.id}
                >
                    {a.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="แก้ไขภารกิจ"
                    className="h-8 w-8 hover:text-amber-600 hover:bg-amber-50"
                    onClick={() => onEdit(a)}
                >
                    <Edit className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="ลบภารกิจ"
                    className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onDelete(a.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

// --- Main Dialog Component ---
export function AddAssignmentDialog({
    classId,
    open,
    onOpenChange,
    onAdded,
    assignments: initialAssignments,
}: AddAssignmentDialogProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [visibilityLoading, setVisibilityLoading] = useState<string | null>(null);

    // Local list state (for drag-reorder optimistic UI)
    const [localAssignments, setLocalAssignments] = useState<Assignment[]>(initialAssignments);

    // Sync when props change
    if (initialAssignments !== localAssignments &&
        initialAssignments.length !== localAssignments.length) {
        setLocalAssignments(initialAssignments);
    }

    // Form State
    const [editId, setEditId] = useState<string | null>(null); // null = create mode
    const [name, setName] = useState("");
    const [type, setType] = useState<"score" | "checklist" | "quiz">("score");
    const [maxScore, setMaxScore] = useState(10);
    const [passScore, setPassScore] = useState("");
    const [checklists, setChecklists] = useState<{ text: string, points: number }[]>([{ text: "", points: 1 }]);

    const resetForm = () => {
        setEditId(null);
        setName("");
        setType("score");
        setMaxScore(10);
        setPassScore("");
        setChecklists([{ text: "", points: 1 }]);
    };

    const startEdit = (a: Assignment) => {
        setEditId(a.id);
        setName(a.name);
        setType(a.type as "score" | "checklist" | "quiz");
        setMaxScore(a.maxScore);
        setPassScore(a.passScore?.toString() ?? "");
        
        // Handle both old String[] and new Json structure
        const rawChecklists = a.checklists as any;
        if (Array.isArray(rawChecklists)) {
            if (rawChecklists.length > 0 && typeof rawChecklists[0] === 'object') {
                setChecklists(rawChecklists);
            } else {
                setChecklists(rawChecklists.map(text => ({ text, points: 1 })));
            }
        } else {
            setChecklists([{ text: "", points: 1 }]);
        }
    };

    const handleAddChecklist = () => setChecklists([...checklists, { text: "", points: 1 }]);
    const handleRemoveChecklist = (index: number) =>
        setChecklists(checklists.filter((_, i) => i !== index));
    const handleChecklistChange = (index: number, field: 'text' | 'points', value: string | number) => {
        const next = [...checklists];
        next[index] = { ...next[index], [field]: value };
        setChecklists(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ title: "Error", description: "Name is required", variant: "destructive" });
            return;
        }
        const validChecklists = checklists.filter((c) => c.text.trim().length > 0);
        if (type === "checklist" && validChecklists.length === 0) {
            toast({ title: "Error", description: "At least one checklist item is required", variant: "destructive" });
            return;
        }

        const calculatedMaxScore = type === "checklist" 
            ? validChecklists.reduce((sum, item) => sum + (item.points || 0), 0)
            : maxScore;

        setLoading(true);
        try {
            const payload = {
                name,
                type,
                maxScore: calculatedMaxScore,
                passScore: passScore ? parseInt(passScore) : null,
                checklists: type === "checklist" ? validChecklists : [],
            };

            let res: Response;
            if (editId) {
                res = await fetch(`/api/classrooms/${classId}/assignments/${editId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`/api/classrooms/${classId}/assignments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) throw new Error("Failed");

            toast({
                title: "สำเร็จ!",
                description: editId ? "แก้ไขภารกิจเรียบร้อย" : "สร้างภารกิจใหม่เรียบร้อย",
            });

            resetForm();
            onAdded();

            if (!editId) {
                onOpenChange(false);
            }
        } catch {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisible = async (id: string, visible: boolean) => {
        setVisibilityLoading(id);
        setLocalAssignments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, visible } : a))
        );
        try {
            const res = await fetch(`/api/classrooms/${classId}/assignments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visible }),
            });
            if (!res.ok) throw new Error();
            toast({ title: visible ? "แสดงภารกิจแล้ว" : "ซ่อนภารกิจแล้ว" });
            onAdded();
        } catch {
            // revert
            setLocalAssignments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, visible: !visible } : a))
            );
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setVisibilityLoading(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/assignments/${deleteId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast({ title: "ลบภารกิจแล้ว!" });
            setLocalAssignments((prev) => prev.filter((a) => a.id !== deleteId));
            onAdded();
            setDeleteId(null);
            if (editId === deleteId) resetForm();
        } catch {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Drag-to-reorder
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = localAssignments.findIndex((a) => a.id === active.id);
        const newIndex = localAssignments.findIndex((a) => a.id === over.id);
        const reordered = arrayMove(localAssignments, oldIndex, newIndex);
        setLocalAssignments(reordered);

        try {
            await fetch(`/api/classrooms/${classId}/assignments`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reordered.map((a, i) => ({ id: a.id, order: i }))),
            });
            onAdded();
        } catch {
            setLocalAssignments(localAssignments); // revert
            toast({ title: "ไม่สามารถบันทึกลำดับได้", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] overflow-y-auto max-h-[90vh] rounded-2xl">
                {/* Header */}
                <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between bg-white border-b sticky top-0 z-10 shrink-0">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-[#7B462C]">
                        <Settings2 className="w-6 h-6 rotate-45" />
                        จัดการภารกิจ (ASSIGNMENTS)
                    </DialogTitle>
                </DialogHeader>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* Left Column - Assignment List */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="p-4 border-b bg-white flex justify-between items-center shrink-0">
                                <div className="font-bold text-slate-600 flex items-center gap-2">
                                    <span className="text-lg">📄</span> ภารกิจทั้งหมด ({localAssignments.length})
                                </div>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <GripVertical className="w-3 h-3" /> ลากเพื่อเรียงลำดับ
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FE]">
                                {localAssignments.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 italic">
                                        ยังไม่มีภารกิจในห้องนี้
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={localAssignments.map((a) => a.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {localAssignments.map((a) => (
                                                <SortableItem
                                                    key={a.id}
                                                    a={a}
                                                    onEdit={startEdit}
                                                    onToggleVisible={handleToggleVisible}
                                                    onDelete={(id) => setDeleteId(id)}
                                                    visibilityLoading={visibilityLoading}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="w-[360px] lg:w-[400px] bg-white border-l border-slate-200 flex flex-col shrink-0">
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            <div className="p-6 pb-2 shrink-0">
                                <div
                                    className={`text-white p-4 font-bold text-lg flex items-center gap-3 rounded-t-xl shadow-md ${
                                        editId ? "bg-amber-600" : "bg-[#8B5E34]"
                                    }`}
                                >
                                    {editId ? (
                                        <><Edit className="w-6 h-6 text-yellow-200" /> แก้ไขภารกิจ</>
                                    ) : (
                                        <><Plus className="w-6 h-6 text-yellow-300 stroke-[3]" /> สร้างภารกิจใหม่</>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                                {/* Type Selector */}
                                <RadioGroup
                                    value={type}
                                    onValueChange={(v) => setType(v as "score" | "checklist" | "quiz")}
                                    className="grid grid-cols-3 gap-2"
                                >
                                    <Label
                                        htmlFor="scoreType"
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            type === "score"
                                                ? "border-[#3b82f6] bg-blue-50 text-[#3b82f6]"
                                                : "border-slate-100 bg-white text-slate-400 hover:border-blue-200"
                                        }`}
                                    >
                                        <RadioGroupItem value="score" id="scoreType" className="sr-only" />
                                        <Star className={`w-8 h-8 mb-2 ${type === "score" ? "fill-[#3b82f6] text-[#3b82f6]" : ""}`} />
                                        <span className="font-bold text-xs">คะแนน</span>
                                    </Label>
                                    <Label
                                        htmlFor="checklistType"
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            type === "checklist"
                                                ? "border-[#10b981] bg-emerald-50 text-[#10b981]"
                                                : "border-slate-100 bg-white text-slate-400 hover:border-emerald-200"
                                        }`}
                                    >
                                        <RadioGroupItem value="checklist" id="checklistType" className="sr-only" />
                                        <CheckSquare className="w-8 h-8 mb-2" />
                                        <span className="font-bold text-xs">เช็คลิสต์</span>
                                    </Label>
                                    <Label
                                        htmlFor="quizType"
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            type === "quiz"
                                                ? "border-[#eab308] bg-yellow-50 text-[#eab308]"
                                                : "border-slate-100 bg-white text-slate-400 hover:border-yellow-200"
                                        }`}
                                    >
                                        <RadioGroupItem value="quiz" id="quizType" className="sr-only" />
                                        <BookOpen className="w-8 h-8 mb-2" />
                                        <span className="font-bold text-xs">แบบทดสอบ</span>
                                    </Label>
                                </RadioGroup>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold text-sm">ชื่อภารกิจ</Label>
                                    <Input
                                        placeholder="พิมพ์ชื่อภารกิจ..."
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-12 text-base font-medium focus-visible:ring-[#3b82f6] border-slate-200 shadow-sm"
                                    />
                                </div>

                                {type === "score" && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">คะแนนเต็ม</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={maxScore}
                                                onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
                                                className="h-12 text-xl font-bold text-center border-slate-200 focus-visible:ring-[#3b82f6] shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">ผ่านขั้นต่ำ (ไม่บังคับ)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="-"
                                                value={passScore}
                                                onChange={(e) => setPassScore(e.target.value)}
                                                className="h-12 text-xl font-bold text-center border-emerald-200 focus-visible:ring-emerald-500 shadow-sm text-emerald-600 placeholder:text-emerald-200 bg-emerald-50/30"
                                            />
                                        </div>
                                    </div>
                                )}

                                {type === "checklist" && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <Label className="text-slate-700 font-bold text-sm">รายการที่ต้องเช็ค ({checklists.length} ข้อ)</Label>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                            {checklists.map((item, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">
                                                        {index + 1}
                                                    </div>
                                                    <Input
                                                        placeholder="ชื่อรายการ..."
                                                        value={item.text}
                                                        onChange={(e) => handleChecklistChange(index, 'text', e.target.value)}
                                                        className="flex-1 h-10 focus-visible:ring-emerald-500 border-slate-200"
                                                    />
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="คะแนน"
                                                            value={item.points}
                                                            onChange={(e) => handleChecklistChange(index, 'points', parseInt(e.target.value) || 0)}
                                                            className="w-16 h-10 text-center font-bold text-emerald-600 border-emerald-100 bg-emerald-50/30"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">แต้ม</span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveChecklist(index)}
                                                        className="text-slate-300 hover:text-red-500 h-9 w-9 shrink-0"
                                                        disabled={checklists.length === 1}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 border-t mt-2 flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">คะแนนเต็มรวม:</span>
                                            <span className="font-black text-emerald-600 text-lg">
                                                {checklists.reduce((sum, item) => sum + (item.points || 0), 0)}
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleAddChecklist}
                                            className="w-full h-10 border-dashed border-2 border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 font-bold bg-white"
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> เพิ่มรายการถัดไป
                                        </Button>
                                    </div>
                                )}

                                {type === "quiz" && (
                                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                                        🚀 ระบบสร้างแบบทดสอบกำลังอยู่ในช่วงพัฒนา...
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto shrink-0 space-y-3">
                                <Button
                                    type="submit"
                                    disabled={loading || type === "quiz"}
                                    className={`w-full h-14 text-white font-bold text-lg rounded-xl shadow-lg hover:-translate-y-0.5 transition-all ${
                                        editId
                                            ? "bg-amber-500 hover:bg-amber-600 shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]"
                                            : "bg-[#3b82f6] hover:bg-blue-600 shadow-[0_4px_14px_0_rgba(59,130,246,0.39)]"
                                    }`}
                                >
                                    {editId ? <><Save className="w-5 h-5 mr-2" />บันทึกการแก้ไข</> : <><Plus className="w-5 h-5 mr-2" />บันทึกภารกิจ</>}
                                </Button>
                                {editId && (
                                    <Button
                                        type="button"
                                        onClick={resetForm}
                                        variant="outline"
                                        className="w-full h-11 font-bold rounded-xl border-2 border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> ยกเลิกการแก้ไข
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบภารกิจ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การลบจะเป็นการนำภารกิจและคะแนนที่เกี่ยวข้องออกทั้งหมด ไม่สามารถกู้คืนได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmDelete(); }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            ลบภารกิจ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
