"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";

interface ClassroomDuplicateButtonProps {
  classId: string;
  className?: string;
  name: string;
}

export function ClassroomDuplicateButton({
  classId,
  className,
  name,
}: ClassroomDuplicateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();

      toast({
        title: t("classroomDuplicateSuccessTitle"),
        description: t("classroomDuplicateSuccessDesc", {
          fromName: name,
          toName: data.classroom.name,
        }),
      });

      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Duplicate error:", error);
      toast({
        title: t("classroomDuplicateFailTitle"),
        description: t("classroomDuplicateFailDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 hover:bg-green-100 ${className}`}
        title={t("classroomDuplicateButtonTitle")}
      >
        <Copy className="h-4 w-4 text-green-600" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("classroomDuplicateConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("classroomDuplicateConfirmDesc", { name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDuplicate();
              }}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? t("classroomDuplicatePending") : t("classroomDuplicateAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
