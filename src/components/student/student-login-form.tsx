"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Backpack, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export function StudentLoginForm({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        
        setIsLoading(true);
        const cleanCode = code.trim().toUpperCase();
        router.push(`/student/${cleanCode}`);
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                    <Backpack className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Login</h1>
                    <p className="text-slate-500">ป้อนรหัส 6 หลักจากคุณครูเพื่อเข้าสู่ชั้นเรียน</p>
                </div>

                {isLoggedIn && (
                    <Link href="/student/home" 
                        className="w-full py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100 transition-all mb-2">
                        <LayoutDashboard className="w-5 h-5" />
                        ไปที่แดชบอร์ดของคุณ
                    </Link>
                )}

                <form onSubmit={handleLogin} className="w-full space-y-4 pt-4">
                    <div className="space-y-2">
                        <Input 
                            type="text" 
                            placeholder="รหัส 6 หลัก" 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="text-center text-2xl tracking-widest font-mono py-6 uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-sm"
                            maxLength={6}
                            required
                        />
                    </div>
                    <Button 
                        type="submit" 
                        className="w-full py-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all rounded-2xl"
                        disabled={isLoading || code.length < 5}
                    >
                        {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าเรียนเลย!"}
                    </Button>
                </form>

                <div className="pt-6 border-t border-slate-100 w-full text-xs text-slate-400">
                    <p>หากคุณใช้ Gmail ระบบจะจำห้องเรียนของคุณไว้อัตโนมัติเมื่อเข้าสู่ระบบ</p>
                </div>
            </div>
        </div>
    );
}
