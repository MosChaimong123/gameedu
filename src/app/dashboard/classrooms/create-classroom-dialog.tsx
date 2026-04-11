"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";

export function CreateClassroomDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [grade, setGrade] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/classrooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, grade })
            });

            if (!res.ok) throw new Error("Failed to create");

            await res.json();

            toast({
                title: t("classroomCreateSuccessTitle"),
                description: t("classroomCreateSuccessDesc"),
            });

            setOpen(false);
            router.refresh(); // Refresh server components
        } catch {
            toast({
                title: t("classroomCreateFailTitle"),
                description: t("classroomCreateFailDesc"),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("classroomDialogNewButton")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("classroomDialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("classroomDialogDesc")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                {t("classroomFieldName")}
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder={t("classroomNamePlaceholder")}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="grade" className="text-right">
                                {t("classroomFieldGrade")}
                            </Label>
                            <Input
                                id="grade"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="col-span-3"
                                placeholder={t("classroomGradePlaceholder")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? t("classroomCreating") : t("classroomCreateSubmit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
