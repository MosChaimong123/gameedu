"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Key, Printer } from "lucide-react";
import { Student } from "@prisma/client";
import { useEffect, useState } from "react";

export function StudentLoginsDialog({ students, classId }: { students: any[], classId: string }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (!isMounted) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden print:hidden md:flex">
                    <Key className="w-4 h-4 mr-2" />
                    Logins
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader className="print:hidden">
                    <DialogTitle>Student Access Codes</DialogTitle>
                    <DialogDescription>
                        Give these unique 6-character codes to your students so they can log into their portals. You can print this page for easy distribution.
                    </DialogDescription>
                </DialogHeader>
                
                {/* Printable Area - In a real app we'd use a separate hidden print stylesheet, but this works for demonstration */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 print-area">
                    {students.map((student) => (
                        <div key={student.id} className="border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center bg-white shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 mb-2 truncate w-full">{student.name}</h3>
                            <div className="bg-slate-50 p-3 rounded-lg w-full mb-3 border border-slate-100">
                                <span className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider">Access Code</span>
                                <span className="font-mono text-2xl tracking-widest font-bold text-indigo-600">
                                    {student.loginCode || 'N/A'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400">Join at: http://localhost:3000/student</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end print:hidden">
                    <Button onClick={handlePrint} className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        Print Cards
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
