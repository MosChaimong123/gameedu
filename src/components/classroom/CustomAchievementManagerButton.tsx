"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomAchievementManager } from "./CustomAchievementManager";

interface Props {
  classId: string;
  students: { id: string; name: string }[];
}

export function CustomAchievementManagerButton({ classId, students }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-9 bg-amber-500/80 hover:bg-amber-500 text-white border-0 font-semibold shadow backdrop-blur-sm flex items-center gap-1.5"
        >
          <Award className="w-4 h-4" />
          รางวัลพิเศษ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-3xl shadow-2xl border-0 overflow-hidden bg-[#F8FAFC]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black text-slate-800">
            <Award className="w-5 h-5 text-amber-500" />
            จัดการรางวัลพิเศษ (Achievement)
          </DialogTitle>
        </DialogHeader>
        <CustomAchievementManager classId={classId} students={students} />
      </DialogContent>
    </Dialog>
  );
}
