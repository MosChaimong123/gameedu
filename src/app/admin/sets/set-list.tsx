"use client"

import * as React from "react";
import { 
    BookOpen, 
    Trash2, 
    Search, 
    ExternalLink,
    Clock,
    User as UserIcon,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { deleteSet } from "../admin-actions";
import Link from "next/link";

interface QuestionSet {
    id: string;
    title: string;
    description: string | null;
    creator: {
        name: string | null;
        email: string | null;
    };
    createdAt: any;
}

export function SetList({ initialSets }: { initialSets: any[] }) {
    const [sets, setSets] = React.useState(initialSets);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
    const { toast } = useToast();

    const filteredSets = sets.filter((set: any) => 
        set.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        set.creator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.creator.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (setId: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบชุดคำถามนี้? การกระทำนี้ไม่สามารถย้อนกลับได้ และอาจส่งผลกระทบต่อเกมหรือการบ้านที่ใช้อยู่")) return;
        
        setIsDeleting(setId);
        const result = await deleteSet(setId);
        setIsDeleting(null);

        if (result.success) {
            setSets(prev => prev.filter((s: any) => s.id !== setId));
            toast({ title: "ลบชุดคำถามแล้ว", description: "ลบชุดคำถามสำเร็จ" });
        } else {
            toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="ค้นหาชื่อชุดคำถาม หรือผู้สร้าง..." 
                    className="pl-10 h-11 rounded-xl border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSets.map((set: any) => (
                    <div key={set.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title="View Set">
                                    <Link href={`/dashboard/my-sets/preview/${set.id}`}>
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                    </Link>
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => handleDelete(set.id)}
                                    disabled={isDeleting === set.id}
                                    title="Delete Set"
                                >
                                    {isDeleting === set.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 line-clamp-1">{set.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{set.description || "ไม่มีคำอธิบาย"}</p>
                        </div>

                        <div className="pt-2 flex flex-wrap gap-3 border-t border-slate-50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Clock className="w-3 h-3" />
                                {new Date(set.createdAt).toLocaleDateString("th-TH")}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <UserIcon className="w-3 h-3" />
                                {set.creator.name || set.creator.email?.split("@")[0]}
                            </div>
                        </div>
                    </div>
                ))}
                
                {filteredSets.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">ไม่พบชุดคำถามที่ค้นหา</p>
                    </div>
                )}
            </div>
        </div>
    );
}
