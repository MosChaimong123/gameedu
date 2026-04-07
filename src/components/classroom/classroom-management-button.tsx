"use client";

import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";

interface ClassroomManagementButtonProps {
  classId: string;
  className?: string;
  name: string;
  theme?: string | null;
}

export function ClassroomManagementButton({
  classId,
  className,
  name,
}: ClassroomManagementButtonProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast({
        title: t("classroomDeleteSuccessTitle"),
        description: t("classroomDeleteSuccessDesc", { name }),
      });

      setOpen(false);
      setShowDeleteConfirm(false);
      router.refresh();
      router.push("/dashboard/classrooms");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: t("classroomDeleteFailTitle"),
        description: t("classroomDeleteFailDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 hover:bg-slate-100 ${className}`}
          >
            <MoreVertical className="w-4 h-4 text-slate-600" />
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl shadow-2xl border-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("classroomManageTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1">
              {name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="border-t border-slate-200 my-2" />

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-sm text-red-600">{t("classroomDeleteRowTitle")}</p>
                <p className="text-xs text-slate-500">{t("classroomDeleteRowHint")}</p>
              </div>
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">
                  {t("classroomDeleteConfirmQuestion", { name })}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {t("classroomDeleteConfirmWarning")}
                </p>
              </div>

              <DialogFooter className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {t("classroomDeleteButton")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
