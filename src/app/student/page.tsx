"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Backpack } from "lucide-react";

export default function StudentLoginPage() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        
        setIsLoading(true);
        // Clean up the code and redirect
        const cleanCode = code.trim().toUpperCase();
        router.push(`/student/${cleanCode}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative z-10 animate-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                        <Backpack className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Login</h1>
                        <p className="text-slate-500">Enter your 6-character access code from your teacher.</p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-4 pt-4">
                        <div className="space-y-2">
                            <Input 
                                type="text" 
                                placeholder="e.g. A1B2C3" 
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="text-center text-2xl tracking-widest font-mono py-6 uppercase placeholder:normal-case placeholder:tracking-normal"
                                maxLength={6}
                                required
                            />
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full py-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
                            disabled={isLoading || code.length < 5}
                        >
                            {isLoading ? "Entering Portal..." : "Let's Go!"}
                        </Button>
                    </form>

                    <div className="pt-6 border-t border-slate-100 w-full text-sm text-slate-400">
                        <p>Ask your teacher for your unique code if you haven't received it.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
