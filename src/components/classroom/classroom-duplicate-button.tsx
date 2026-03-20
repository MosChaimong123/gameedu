"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

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
  const { toast } = useToast();
  const router = useRouter();

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to duplicate");

      const data = await res.json();

      toast({
        title: "สำเร็จ",
        description: `${name} ถูกคัดลอกเป็น "${data.classroom.name}"`,
      });

      router.refresh();
    } catch (error) {
      console.error("Duplicate error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกห้องเรียนได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDuplicate}
      disabled={loading}
      size="sm"
      variant="ghost"
      className={`h-8 w-8 p-0 hover:bg-green-100 ${className}`}
      title="ทำซ้ำห้องเรียน"
    >
      <Copy className="w-4 h-4 text-green-600" />
    </Button>
  );
}
