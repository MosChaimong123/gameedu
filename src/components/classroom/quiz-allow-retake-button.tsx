"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";

type QuizAllowRetakeButtonProps = {
    classId: string;
    assignmentId: string;
    studentId: string;
    onRetakeGranted?: () => void;
    className?: string;
};

export function QuizAllowRetakeButton({
    classId,
    assignmentId,
    studentId,
    onRetakeGranted,
    className,
}: QuizAllowRetakeButtonProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleRetake() {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/classrooms/${classId}/assignments/${assignmentId}/submissions/reset`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ studentId }),
                }
            );
            if (!res.ok) {
                throw new Error(t("classroomQuizRetakeFailed"));
            }
            toast({ title: t("classroomQuizRetakeSuccess") });
            onRetakeGranted?.();
        } catch (error) {
            toast({
                variant: "destructive",
                title: t("classroomQuizRetakeFailed"),
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void handleRetake()}
            className={className}
        >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t("classroomQuizAllowRetake")}
        </Button>
    );
}
