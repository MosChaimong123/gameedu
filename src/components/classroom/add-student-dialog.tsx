"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AddStudentDialogProps {
    classId: string;
    onStudentAdded?: () => void;
}

export function AddStudentDialog({ classId, onStudentAdded }: AddStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [names, setNames] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Split by new line, filter empty
            const studentList = names.split("\n").map(n => n.trim()).filter(n => n.length > 0);

            if (studentList.length === 0) {
                toast({ title: "Error", description: "Please enter at least one name.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const res = await fetch(`/api/classrooms/${classId}/students`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    students: studentList.map(name => ({ name }))
                })
            });

            if (!res.ok) throw new Error("Failed to add students");

            const data = await res.json();

            toast({
                title: "Success",
                description: `Added ${data.count} students!`, // count might be undefined depending on DB provider
            });

            setOpen(false);
            setNames("");
            router.refresh();
            if (onStudentAdded) onStudentAdded();
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong.",
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
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Students
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Students</DialogTitle>
                    <DialogDescription>
                        Enter student names, one per line.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="names">Student Names</Label>
                        <Textarea
                            id="names"
                            value={names}
                            onChange={(e) => setNames(e.target.value)}
                            placeholder={"John Doe\nJane Smith\n..."}
                            className="h-32"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Adding..." : "Add Students"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
