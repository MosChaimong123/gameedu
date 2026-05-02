"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import {
    Plus, X, Star, Eye, EyeOff, Edit, Trash2, GripVertical,
    Settings2, CheckSquare, BookOpen, Save, XCircle
} from "lucide-react";
import { Assignment } from "@prisma/client";
import {
    assignmentTypeBadgeClassName,
    dbAssignmentTypeToFormType,
    type AssignmentFormType,
} from "@/lib/assignment-type";
import { useLanguage } from "@/components/providers/language-provider";
import { assignmentFormTypeLabel } from "@/lib/assignment-form-type-label";
import {
    formatDeadlineDisplayTh,
    fromDatetimeLocalToIso,
    isAssignmentDeadlinePast,
    toDatetimeLocalValue,
} from "@/lib/datetime-local";
import { cn } from "@/lib/utils";
import { getThemeBgStyle, getThemeHorizontalBgClass } from "@/lib/classroom-utils";
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
    /** Classroom theme gradient (preset Tailwind stops or custom:hex,hex). */
    theme?: string | null;
    /** Classroom default quiz review (shown on "follow classroom" option). */
    classroomQuizReviewMode?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdded: (assignments: Assignment[]) => void;
    assignments: Assignment[];
}

type ChecklistValue = { text: string; points: number };

type QuestionSetOption = { id: string; title: string; questions: unknown };

function questionCount(questions: unknown): number {
    return Array.isArray(questions) ? questions.length : 0;
}

const QUIZ_SET_NONE = "__none__";

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
    const { t } = useLanguage();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: a.id });

    const formType = dbAssignmentTypeToFormType(a.type);
    const deadlineStr = formatDeadlineDisplayTh(a.deadline);
    const deadlinePast = isAssignmentDeadlinePast(a.deadline);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border gap-3 md:gap-4 transition-all hover:border-slate-300 hover:shadow-md group ${
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
                className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white ${
                    formType === "score"
                        ? "bg-[#3b82f6]"
                        : formType === "checklist"
                          ? "bg-[#10b981]"
                          : formType === "quiz"
                            ? "bg-[#ca8a04]"
                            : "bg-[#eab308]"
                }`}
            >
                {formType === "score" ? (
                    <Star className="w-6 h-6 fill-current" />
                ) : formType === "checklist" ? (
                    <CheckSquare className="w-6 h-6" />
                ) : (
                    <BookOpen className="w-6 h-6" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-base md:text-lg truncate">{a.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        {t("maxScore", { score: a.maxScore })}
                    </span>
                    <span
                        className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                            assignmentTypeBadgeClassName(formType)
                        )}
                    >
                        {assignmentFormTypeLabel(t, formType)}
                    </span>
                    {deadlineStr ? (
                        <span
                            className={cn(
                                "text-[10px] font-bold",
                                deadlinePast ? "text-red-600" : "text-amber-700"
                            )}
                        >
                            {t("classroomTableDuePrefix")} {deadlineStr}
                        </span>
                    ) : null}
                </div>
                {a.description?.trim() ? (
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-slate-500">
                        {a.description.trim()}
                    </p>
                ) : null}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-slate-400 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    title={a.visible ? t("assignmentHideFromStudents") : t("assignmentShowToStudents")}
                    className={`h-10 min-h-[44px] w-10 min-w-[44px] touch-manipulation sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0 ${a.visible ? "hover:text-orange-500 hover:bg-orange-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
                    onClick={() => onToggleVisible(a.id, !a.visible)}
                    disabled={visibilityLoading === a.id}
                >
                    {a.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title={t("assignmentEditTooltip")}
                    className="h-10 min-h-[44px] w-10 min-w-[44px] touch-manipulation hover:bg-amber-50 hover:text-amber-600 sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0"
                    onClick={() => onEdit(a)}
                >
                    <Edit className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title={t("assignmentDeleteTooltip")}
                    className="h-10 min-h-[44px] w-10 min-w-[44px] touch-manipulation hover:bg-red-50 hover:text-red-600 sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0"
                    onClick={() => onDelete(a.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

// --- Main Dialog Component ---
const QUIZ_REVIEW_INHERIT = "inherit";

export function AddAssignmentDialog({
    classId,
    theme = "",
    classroomQuizReviewMode,
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

    useEffect(() => {
        if (!open) return;
        setLocalAssignments(initialAssignments);
    }, [open, initialAssignments]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/sets");
                if (!res.ok) return;
                const data = (await res.json()) as unknown;
                if (cancelled) return;
                setQuestionSets(Array.isArray(data) ? (data as QuestionSetOption[]) : []);
            } catch {
                if (!cancelled) setQuestionSets([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open]);

    // Form State
    const [editId, setEditId] = useState<string | null>(null); // null = create mode
    const [name, setName] = useState("");
    const [type, setType] = useState<AssignmentFormType>("score");
    const [maxScore, setMaxScore] = useState(10);
    const [passScore, setPassScore] = useState("");
    const [checklists, setChecklists] = useState<{ text: string, points: number }[]>([{ text: "", points: 1 }]);
    const [description, setDescription] = useState("");
    const [deadlineLocal, setDeadlineLocal] = useState("");
    const [quizSetId, setQuizSetId] = useState("");
    const [quizReviewPolicy, setQuizReviewPolicy] = useState<string>(QUIZ_REVIEW_INHERIT);
    const [questionSets, setQuestionSets] = useState<QuestionSetOption[]>([]);

    const resetForm = useCallback(() => {
        setEditId(null);
        setName("");
        setType("score");
        setMaxScore(10);
        setPassScore("");
        setChecklists([{ text: "", points: 1 }]);
        setDescription("");
        setDeadlineLocal("");
        setQuizSetId("");
        setQuizReviewPolicy(QUIZ_REVIEW_INHERIT);
    }, []);

    /** Reset form when modal closes so checklist mode does not stick. */
    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open, resetForm]);

    const startEdit = (a: Assignment) => {
        setEditId(a.id);
        setName(a.name);
        const formType = dbAssignmentTypeToFormType(a.type);
        setType(formType);
        setMaxScore(a.maxScore);
        setPassScore(a.passScore?.toString() ?? "");

        const rawChecklists = a.checklists as unknown;
        if (formType === "checklist" && Array.isArray(rawChecklists)) {
            if (rawChecklists.length > 0 && typeof rawChecklists[0] === "object") {
                setChecklists(rawChecklists as ChecklistValue[]);
            } else {
                setChecklists(rawChecklists.map((text) => ({ text: String(text), points: 1 })));
            }
        } else {
            setChecklists([{ text: "", points: 1 }]);
        }

        setDescription(a.description?.trim() ? a.description : "");
        setDeadlineLocal(toDatetimeLocalValue(a.deadline));
        setQuizSetId(a.quizSetId ?? "");
        const arm = a.quizReviewMode;
        if (arm === "never" || arm === "end_only") {
            setQuizReviewPolicy(arm);
        } else {
            setQuizReviewPolicy(QUIZ_REVIEW_INHERIT);
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
            toast({
                title: t("toastAssignmentIncompleteTitle"),
                description: t("toastAssignmentNameRequiredDesc"),
                variant: "destructive",
            });
            return;
        }
        const validChecklists = checklists.filter((c) => c.text.trim().length > 0);
        if (type === "checklist" && validChecklists.length === 0) {
            toast({
                title: t("toastAssignmentIncompleteTitle"),
                description: t("toastAssignmentChecklistRequiredDesc"),
                variant: "destructive",
            });
            return;
        }

        let calculatedMaxScore =
            type === "checklist"
                ? validChecklists.reduce((sum, item) => sum + (item.points || 0), 0)
                : maxScore;

        if (type === "quiz") {
            const sel = questionSets.find((s) => s.id === quizSetId);
            const n = questionCount(sel?.questions);
            if (!quizSetId || n === 0) {
                toast({
                    title: t("toastAssignmentIncompleteTitle"),
                    description: t("toastAssignmentQuizSetRequiredDesc"),
                    variant: "destructive",
                });
                return;
            }
            calculatedMaxScore = n;
        }

        const deadlineIso = fromDatetimeLocalToIso(deadlineLocal);

        setLoading(true);
        try {
            const payload: Record<string, unknown> = {
                name,
                type,
                maxScore: calculatedMaxScore,
                passScore: type === "quiz" ? null : passScore ? parseInt(passScore, 10) : null,
                checklists: type === "checklist" ? validChecklists : [],
                description: description.trim() ? description.trim() : null,
                deadline: deadlineIso,
            };
            if (type === "quiz") {
                payload.quizSetId = quizSetId;
                payload.quizReviewMode =
                    quizReviewPolicy === QUIZ_REVIEW_INHERIT ? null : quizReviewPolicy;
            }

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

            if (!res.ok) throw new Error();

            const savedAssignment = await res.json() as Assignment;
            const nextAssignments = editId
                ? localAssignments.map((assignment) =>
                    assignment.id === savedAssignment.id ? savedAssignment : assignment
                )
                : [...localAssignments, savedAssignment];

            setLocalAssignments(nextAssignments);

            toast({
                title: editId ? t("toastAssignmentSaveSuccessUpdate") : t("toastAssignmentSaveSuccessCreate"),
                description: editId ? t("toastAssignmentSaveDescUpdate") : t("toastAssignmentSaveDescCreate"),
            });

            resetForm();
            onAdded(nextAssignments);
        } catch {
            toast({
                title: t("toastAssignmentSaveFailTitle"),
                description: editId
                    ? t("toastAssignmentSaveFailUpdateDesc")
                    : t("toastAssignmentSaveFailCreateDesc"),
                variant: "destructive",
            });
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
            toast({
                title: visible ? t("toastAssignmentVisibleShownTitle") : t("toastAssignmentVisibleHiddenTitle"),
                description: visible ? t("toastAssignmentVisibleShownDesc") : t("toastAssignmentVisibleHiddenDesc"),
            });
            onAdded(
                localAssignments.map((assignment) =>
                    assignment.id === id ? { ...assignment, visible } : assignment
                )
            );
        } catch {
            // revert
            setLocalAssignments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, visible: !visible } : a))
            );
            toast({
                title: t("toastAssignmentVisibleFailTitle"),
                description: t("toastAssignmentVisibleFailDesc"),
                variant: "destructive",
            });
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
            if (!res.ok) throw new Error();
            toast({
                title: t("toastAssignmentDeleteSuccessTitle"),
                description: t("toastAssignmentDeleteSuccessDesc"),
            });
            const nextAssignments = localAssignments.filter((assignment) => assignment.id !== deleteId);
            setLocalAssignments(nextAssignments);
            onAdded(nextAssignments);
            setDeleteId(null);
            if (editId === deleteId) resetForm();
        } catch {
            toast({
                title: t("toastAssignmentDeleteFailTitle"),
                description: t("toastAssignmentDeleteFailDesc"),
                variant: "destructive",
            });
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
            onAdded(reordered.map((assignment, index) => ({ ...assignment, order: index })));
        } catch {
            setLocalAssignments(localAssignments); // revert
            toast({
                title: t("toastAssignmentReorderFailTitle"),
                description: t("toastAssignmentReorderFailDesc"),
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex h-[min(92dvh,52rem)] w-[min(96vw,88rem)] max-w-[min(96vw,88rem)] flex-col overflow-hidden rounded-none border-2 border-slate-200/80 bg-white p-0 shadow-2xl sm:h-[90vh] sm:max-w-[min(96vw,88rem)] sm:rounded-2xl md:rounded-3xl max-sm:fixed max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:border-x-0 max-sm:border-b-0"
            >
                {/* Header */}
                <DialogHeader
                    className={`sticky top-0 z-20 flex shrink-0 flex-row items-center justify-between border-b border-white/10 px-4 py-3 text-white shadow-sm backdrop-blur-sm sm:px-8 sm:py-5 ${getThemeHorizontalBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogTitle className="flex min-w-0 items-center gap-2 pr-10 text-lg font-black tracking-tight text-white drop-shadow-sm sm:gap-3 sm:text-2xl">
                        <div className="rounded-xl border border-white/30 bg-white/20 p-2 shadow-inner">
                            <Settings2 className="h-5 w-5 rotate-45 sm:h-6 sm:w-6" />
                        </div>
                        <span className="leading-snug break-words">
                            {t("assignmentDialogTitle")} (ASSIGNMENTS)
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {/* Main Content — stack on tablet/small; side-by-side from lg */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#eef2f8] lg:flex-row">
                    {/* Left Column - Assignment List */}
                    <div className="min-h-[26dvh] flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-300 sm:p-6 lg:min-h-0">
                        <div className="flex h-full min-h-[10rem] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                            <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 bg-slate-50/90 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                    <span className="text-lg" aria-hidden>📄</span>{" "}
                                    {t("assignmentListHeading", { count: localAssignments.length })}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                                    <GripVertical className="h-3 w-3 shrink-0" />{" "}
                                    <span className="hidden sm:inline">{t("assignmentDragReorderHint")}</span>
                                    <span className="sm:hidden">{t("assignmentDragReorderHintShort")}</span>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f4f6fb] p-3 sm:p-4">
                                {localAssignments.length === 0 ? (
                                    <div className="flex h-full min-h-[8rem] items-center justify-center px-4 text-center text-base font-medium text-slate-600">
                                        {t("assignmentEmptyList")}
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
                    <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-white max-lg:max-h-[min(52dvh,24rem)] lg:max-h-none lg:min-w-[380px] lg:w-[min(440px,32vw)] xl:min-w-[420px] xl:w-[min(480px,28vw)] lg:border-l lg:border-t-0">
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            <div className="p-6 pb-2 shrink-0">
                                <div
                                    className={`flex items-center gap-3 rounded-t-xl p-4 text-lg font-bold text-white shadow-md ${getThemeHorizontalBgClass(theme)}`}
                                    style={getThemeBgStyle(theme)}
                                >
                                    {editId ? (
                                        <><Edit className="h-6 w-6 shrink-0 text-white/90" /> {t("assignmentFormEditTitle")}</>
                                    ) : (
                                        <><Plus className="h-6 w-6 shrink-0 stroke-[3] text-white/90" /> {t("assignmentFormCreateTitle")}</>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                                {/* Type Selector */}
                                <RadioGroup
                                    key={editId ?? "new-assignment"}
                                    value={type}
                                    onValueChange={(v) => {
                                        const next = v as AssignmentFormType;
                                        setType(next);
                                        if (next !== "quiz") setQuizSetId("");
                                    }}
                                    className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
                                >
                                    <Label
                                        htmlFor="scoreType"
                                        className={`flex min-h-[88px] min-w-[calc(33.333%-0.35rem)] shrink-0 snap-center flex-col items-center justify-center rounded-xl border-2 p-3 cursor-pointer transition-all sm:min-h-0 sm:min-w-0 ${
                                            type === "score"
                                                ? "border-[#3b82f6] bg-blue-50 text-[#3b82f6]"
                                                : "border-slate-100 bg-white text-slate-400 hover:border-blue-200"
                                        }`}
                                    >
                                        <RadioGroupItem value="score" id="scoreType" className="sr-only" />
                                        <Star className={`w-8 h-8 mb-2 ${type === "score" ? "fill-[#3b82f6] text-[#3b82f6]" : ""}`} />
                                        <span className="font-bold text-xs">{t("assignmentFormTypeScore")}</span>
                                    </Label>
                                    <Label
                                        htmlFor="checklistType"
                                        className={`flex min-h-[88px] min-w-[calc(33.333%-0.35rem)] shrink-0 snap-center flex-col items-center justify-center rounded-xl border-2 p-3 cursor-pointer transition-all sm:min-h-0 sm:min-w-0 ${
                                            type === "checklist"
                                                ? "border-[#10b981] bg-emerald-50 text-[#10b981]"
                                                : "border-slate-100 bg-white text-slate-400 hover:border-emerald-200"
                                        }`}
                                    >
                                        <RadioGroupItem value="checklist" id="checklistType" className="sr-only" />
                                        <CheckSquare className="w-8 h-8 mb-2" />
                                        <span className="font-bold text-xs">{t("assignmentFormTypeChecklist")}</span>
                                    </Label>
                                    <Label
                                        htmlFor="quizType"
                                        className={`flex min-h-[88px] min-w-[calc(33.333%-0.35rem)] shrink-0 snap-center flex-col items-center justify-center rounded-xl border-2 p-3 cursor-pointer transition-all sm:min-h-0 sm:min-w-0 ${
                                            type === "quiz"
                                                ? "border-[#eab308] bg-yellow-50 text-[#eab308]"
                                                : "border-slate-100 bg-white text-slate-400 hover:border-yellow-200"
                                        }`}
                                    >
                                        <RadioGroupItem value="quiz" id="quizType" className="sr-only" />
                                        <BookOpen className="w-8 h-8 mb-2" />
                                        <span className="font-bold text-xs">{t("assignmentFormTypeQuiz")}</span>
                                    </Label>
                                </RadioGroup>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold text-sm">{t("assignmentNameLabel")}</Label>
                                    <Input
                                        placeholder={t("assignmentNamePlaceholder")}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-12 border-slate-200 text-base font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold text-sm">{t("assignmentDescriptionLabel")}</Label>
                                    <Textarea
                                        placeholder={t("assignmentDescriptionPlaceholder")}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="min-h-[4.5rem] resize-y border-slate-200 text-base focus-visible:ring-2 focus-visible:ring-slate-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold text-sm">{t("assignmentDeadlineLabel")}</Label>
                                    <Input
                                        type="datetime-local"
                                        value={deadlineLocal}
                                        onChange={(e) => setDeadlineLocal(e.target.value)}
                                        className="h-12 border-slate-200 font-medium focus-visible:ring-2 focus-visible:ring-slate-400"
                                    />
                                    <p className="text-[11px] text-slate-500">{t("assignmentDeadlineHint")}</p>
                                </div>

                                {type === "score" && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t("assignmentMaxScoreLabel")}</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={maxScore}
                                                onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
                                                className="h-12 border-slate-200 text-center text-xl font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t("assignmentPassScoreLabel")}</Label>
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
                                        <Label className="text-slate-700 font-bold text-sm">
                                            {t("assignmentChecklistTitle", { count: checklists.length })}
                                        </Label>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                            {checklists.map((item, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">
                                                        {index + 1}
                                                    </div>
                                                    <Input
                                                        placeholder={t("assignmentChecklistItemPlaceholder")}
                                                        value={item.text}
                                                        onChange={(e) => handleChecklistChange(index, 'text', e.target.value)}
                                                        className="flex-1 h-10 focus-visible:ring-emerald-500 border-slate-200"
                                                    />
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder={t("assignmentChecklistPointsPlaceholder")}
                                                            value={item.points}
                                                            onChange={(e) => handleChecklistChange(index, 'points', parseInt(e.target.value) || 0)}
                                                            className="w-16 h-10 text-center font-bold text-emerald-600 border-emerald-100 bg-emerald-50/30"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                                                            {t("assignmentChecklistPointsUnit")}
                                                        </span>
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
                                            <span className="text-slate-500 font-medium">{t("assignmentChecklistTotalLabel")}</span>
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
                                            <Plus className="w-4 h-4 mr-2" /> {t("assignmentChecklistAddRow")}
                                        </Button>
                                    </div>
                                )}

                                {type === "quiz" && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-yellow-200 bg-yellow-50/90 p-4">
                                        <Label className="text-sm font-bold text-yellow-900">{t("assignmentQuestionSetLabel")}</Label>
                                        <Select
                                            value={quizSetId || QUIZ_SET_NONE}
                                            onValueChange={(v) =>
                                                setQuizSetId(v === QUIZ_SET_NONE ? "" : v)
                                            }
                                        >
                                            <SelectTrigger className="h-12 w-full max-w-full border-yellow-200 bg-white text-left font-medium shadow-sm">
                                                <SelectValue placeholder={t("assignmentSelectSetPlaceholder")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={QUIZ_SET_NONE}>{t("assignmentSelectSetNone")}</SelectItem>
                                                {questionSets.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {t("assignmentSetOptionLabel", {
                                                            title: s.title,
                                                            count: questionCount(s.questions),
                                                        })}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {questionSets.length === 0 ? (
                                            <p className="text-xs font-medium text-amber-800">{t("assignmentNoSetsHint")}</p>
                                        ) : (
                                            <p className="text-xs text-yellow-900/80">{t("assignmentQuizMaxHint")}</p>
                                        )}
                                        <div className="space-y-2 pt-2 border-t border-yellow-200/80">
                                            <Label className="text-sm font-bold text-yellow-900">
                                                {t("assignmentQuizReviewPolicyLabel")}
                                            </Label>
                                            <Select
                                                value={quizReviewPolicy}
                                                onValueChange={setQuizReviewPolicy}
                                            >
                                                <SelectTrigger className="h-11 w-full border-yellow-200 bg-white text-left text-sm font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={QUIZ_REVIEW_INHERIT}>
                                                        {t("assignmentQuizReviewFollowClassroom")}
                                                        {classroomQuizReviewMode === "never"
                                                            ? t("assignmentClassPolicySuffixNever")
                                                            : classroomQuizReviewMode === "end_only"
                                                              ? t("assignmentClassPolicySuffixEndOnly")
                                                              : t("assignmentClassPolicySuffixInherit")}
                                                    </SelectItem>
                                                    <SelectItem value="end_only">{t("quizReviewModeEndOnly")}</SelectItem>
                                                    <SelectItem value="never">{t("quizReviewModeScoreOnly")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[11px] text-yellow-900/75 leading-snug">
                                                {t("assignmentQuizReviewPerQuestionNote")}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto shrink-0 space-y-3">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    size="lg"
                                    className={cn(
                                        "h-14 w-full rounded-xl border-0 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90",
                                        getThemeHorizontalBgClass(theme)
                                    )}
                                    style={getThemeBgStyle(theme)}
                                >
                                    {editId ? (
                                        <><Save className="w-5 h-5 mr-2" />{t("assignmentSubmitSaveEdit")}</>
                                    ) : (
                                        <><Plus className="w-5 h-5 mr-2" />{t("assignmentSubmitSaveCreate")}</>
                                    )}
                                </Button>
                                {editId && (
                                    <Button
                                        type="button"
                                        onClick={resetForm}
                                        variant="outline"
                                        className="w-full h-11 font-bold rounded-xl border-2 border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> {t("assignmentCancelEdit")}
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
                        <AlertDialogTitle>{t("assignmentDeleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("assignmentDeleteConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmDelete(); }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t("assignmentDeleteAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
