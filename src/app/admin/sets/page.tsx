import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SetList } from "./set-list";
import { BookOpen, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function SetManagementPage() {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    if (!session?.user || role !== "ADMIN") {
        redirect("/dashboard");
    }

    const sets = await db.questionSet.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            creator: {
                select: { name: true, email: true }
            }
        }
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/admin" 
                            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-orange-600" />
                                <h1 className="text-2xl font-black text-slate-800">จัดการชุดคำถาม</h1>
                            </div>
                            <p className="text-slate-500 text-sm">ตรวจสอบและจัดการเนื้อหาคำถามทั้งหมดในแพลตฟอร์ม</p>
                        </div>
                    </div>
                </div>

                <SetList initialSets={sets} />
            </div>
        </div>
    );
}
