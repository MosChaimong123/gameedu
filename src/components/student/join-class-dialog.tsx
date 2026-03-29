"use client";

import { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { joinClassroom } from "@/app/student/student-actions";

export function JoinClassDialog() {
    const [code, setCode] = useState("");
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || code.length < 5) return;

        setIsLoading(true);
        try {
            const result = await joinClassroom(code);
            if (result.error) {
                toast({
                    title: "ไม่สามารถเข้าร่วมได้",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "เข้าร่วมสำเร็จ!",
                    description: `เข้าร่วมห้องเรียน ${result.className} เรียบร้อยแล้ว`,
                });
                setOpen(false);
                setCode("");
            }
        } catch {
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-bold transition-all shadow-md">
                    <Plus className="w-4 h-4" />
                    เข้าชั้นเรียนใหม่
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <form onSubmit={handleJoin}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800">เข้าชั้นเรียน</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            กรอกรหัสเข้าใช้งาน 6 หลักที่ได้รับจากครูผู้สอนเพื่อเริ่มใช้งาน
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Input
                            type="text"
                            placeholder="ตัวอย่าง: 1A2B3D"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="text-center text-3xl tracking-widest font-mono py-8 h-12 uppercase"
                            maxLength={6}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-black rounded-2xl shadow-lg transition-all active:scale-95"
                            disabled={isLoading || code.length < 5}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    กำลังตรวจสอบ...
                                </>
                            ) : (
                                "ยืนยันการเข้าร่วม"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
