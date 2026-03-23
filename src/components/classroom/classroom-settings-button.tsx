"use client";

import { useState } from "react";
import { Classroom } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { ClassroomSettingsDialog } from "./classroom-settings-dialog";

interface ClassroomSettingsButtonProps {
  classroom: Classroom;
  className?: string;
}

export function ClassroomSettingsButton({
  classroom,
  className,
}: ClassroomSettingsButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 hover:bg-blue-100 ${className}`}
        title="ตั้งค่าห้องเรียน"
      >
        <Settings className="w-4 h-4 text-blue-600" />
      </Button>
      
      <ClassroomSettingsDialog
        classroom={classroom}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
