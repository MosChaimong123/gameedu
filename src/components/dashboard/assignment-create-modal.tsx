"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Loader2, BookOpen, School, Target } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { getLocalizedErrorMessageFromResponse, tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages";

interface Classroom {
    id: string;
    name: string;
    emoji: string | null;
}

interface AssignmentCreateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setId: string;
    setTitle: string;
}

export function AssignmentCreateModal({
    open,
    onOpenChange,
    setId,
    setTitle,
}: AssignmentCreateModalProps) {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [fetchingClasses, setFetchingClasses] = useState(false);

    // Form state
    const [selectedClassId, setSelectedClassId] = useState("");
    const [name, setName] = useState(setTitle);
    const [description, setDescription] = useState("");
    const [deadline, setDeadline] = useState("");

    useEffect(() => {
        if (open) {
            fetchClassrooms();
            setName(setTitle);
        }
    }, [open, setTitle]);

    const fetchClassrooms = async () => {
        setFetchingClasses(true);
        try {
            const res = await fetch("/api/classrooms");
            if (res.ok) {
                const data = await res.json();
                setClassrooms(data);
                if (data.length > 0) setSelectedClassId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch classrooms", error);
        } finally {
            setFetchingClasses(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedClassId || !name.trim()) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${selectedClassId}/assignments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    type: "quiz",
                    quizSetId: setId,
                    deadline: deadline.trim() ? deadline : null,
                }),
            });

            if (res.ok) {
                toast({
                    title: t("assignmentCreated"),
                    description: t("assignmentCreatedDesc"),
                });
                onOpenChange(false);
            } else {
                const msg = await getLocalizedErrorMessageFromResponse(
                    res,
                    "failedToCreateAssignment",
                    t,
                    language
                );
                toast({
                    title: t("error"),
                    variant: "destructive",
                    description: msg,
                });
            }
        } catch (err) {
            const raw = err instanceof Error ? err.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            toast({
                title: t("error"),
                variant: "destructive",
                description: net ?? t("failedToCreateAssignment"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-0 shadow-2xl">
                <div className="bg-brand-pink p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3 text-white">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            {t("assignmentModalTitle")}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-5 bg-[#F8FAFC]">
                    {/* Class Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <School className="w-4 h-4 text-brand-pink" />
                            {t("assignmentSelectClassLabel")}
                        </Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                                <SelectValue placeholder={t("assignmentSelectClassPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {fetchingClasses ? (
                                    <div className="p-4 flex justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                    </div>
                                ) : classrooms.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-slate-500">
                                        {t("assignmentNoClassroomsHint")}
                                    </div>
                                ) : (
                                    classrooms.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{c.emoji || "🛡️"}</span>
                                                <span className="font-semibold">{c.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assignment Name */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Target className="w-4 h-4 text-brand-pink" />
                            {t("assignmentNameLabel")}
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("assignmentNamePlaceholder")}
                            className="h-12 rounded-xl border-slate-200 bg-white font-medium"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-600">{t("assignmentDescriptionLabel")}</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("assignmentDescriptionPlaceholder")}
                            className="rounded-xl border-slate-200 bg-white min-h-[100px]"
                        />
                    </div>

                    {/* Deadline */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-brand-pink" />
                            {t("assignmentDeadlineLabel")}
                        </Label>
                        <Input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 bg-white font-medium"
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t rounded-b-[2rem]">
                    <div className="flex w-full gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-12 rounded-xl text-slate-600 font-bold border-2"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={loading || !selectedClassId || !name.trim()}
                            className="flex-1 h-12 rounded-xl bg-brand-pink font-black text-white shadow-lg shadow-brand-pink/20 transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                t("assignmentConfirmButton")
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
