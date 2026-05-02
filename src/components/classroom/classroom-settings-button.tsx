"use client";

import { useState } from "react";
import { Classroom } from "@prisma/client";
import { Settings } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { ClassroomSettingsDialog } from "./classroom-settings-dialog";

interface ClassroomSettingsButtonProps {
  classroom: Classroom;
  className?: string;
}

export function ClassroomSettingsButton({
  classroom,
  className,
}: ClassroomSettingsButtonProps) {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 hover:bg-blue-100 ${className}`}
        title={t("classroomSettings")}
      >
        <Settings className="h-4 w-4 text-blue-600" />
      </Button>

      <ClassroomSettingsDialog
        classroom={classroom}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
