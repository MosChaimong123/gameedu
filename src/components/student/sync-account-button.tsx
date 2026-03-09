"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { joinClassroom } from "@/app/student/student-actions";
import { useToast } from "@/components/ui/use-toast";

interface SyncAccountButtonProps {
    loginCode: string;
    className?: string;
}

export function SyncAccountButton({ loginCode, className }: SyncAccountButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSync = async () => {
        setIsLoading(true);
        try {
            const result = await joinClassroom(loginCode);
            if (result.error) {
                toast({
                    title: "ไม่สามารถเชื่อมโยงบัญชีได้",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "เชื่อมโยงบัญชีสำเร็จ! ✨",
                    description: `บัญชีของคุณถูกเชื่อมโยงกับห้องเรียน ${result.className} แล้ว คุณสามารถเข้าถึงห้องนี้ได้จากแดชบอร์ดหลักของคุณในครั้งถัดไป`,
                });
            }
        } catch (error) {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "โปรดลองอีกครั้งภายหลัง",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button 
            onClick={handleSync}
            disabled={isLoading}
            variant="outline"
            className={`bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm rounded-2xl h-10 px-4 font-bold flex items-center gap-2 transition-all ${className}`}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {isLoading ? "กำลังเชื่อมโยง..." : "เชื่อมโยงกับบัญชีของฉัน"}
        </Button>
    );
}
