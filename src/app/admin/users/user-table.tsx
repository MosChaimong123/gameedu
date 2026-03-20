"use client"

import * as React from "react";
import { 
    Users, 
    Trash2, 
    ShieldCheck, 
    User as UserIcon, 
    GraduationCap, 
    MoreHorizontal,
    Search,
    Loader2
} from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { updateUserRole, deleteUser } from "../admin-actions";

interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: any;
}

export function UserTable({ initialUsers }: { initialUsers: User[] }) {
    const [users, setUsers] = React.useState(initialUsers);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isPending, setIsPending] = React.useState<string | null>(null);
    const { toast } = useToast();

    const filteredUsers = users.filter((user: any) => 
        (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        setIsPending(userId);
        const result = await updateUserRole(userId, newRole);
        setIsPending(null);
        
        if (result.success) {
            setUsers(prev => prev.map((u: any) => u.id === userId ? { ...u, role: newRole } : u));
            toast({ title: "บทบาทถูกเปลี่ยนแล้ว", description: `เปลี่ยนเป็น ${newRole} สำเร็จ` });
        } else {
            toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้คนนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
        
        setIsPending(userId);
        const result = await deleteUser(userId);
        setIsPending(null);

        if (result.success) {
            setUsers(prev => prev.filter((u: any) => u.id !== userId));
            toast({ title: "ลบผู้ใช้แล้ว", description: "ลบผู้ใช้สำเร็จ" });
        } else {
            toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "ADMIN": return <ShieldCheck className="w-4 h-4 text-red-600" />;
            case "TEACHER": return <UserIcon className="w-4 h-4 text-purple-600" />;
            case "STUDENT": return <GraduationCap className="w-4 h-4 text-blue-600" />;
            default: return <Users className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="ค้นหาชื่อหรืออีเมล..." 
                    className="pl-10 h-11 rounded-xl border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">ผู้ใช้</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">อีเมล</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">บทบาท</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">สมัครเมื่อ</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user: any) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                                            </div>
                                            <span className="font-bold text-slate-800">{user.name || "ไม่ระบุชื่อ"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">{user.email}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                        <div className="flex items-center gap-2">
                                            {getRoleIcon(user.role)}
                                            {user.role}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                        {new Date(user.createdAt).toLocaleDateString("th-TH")}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isPending === user.id}>
                                                    {isPending === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-xl border-slate-200">
                                                <DropdownMenuLabel className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1.5">Change Role</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "ADMIN")} className="gap-2 rounded-lg py-2 font-bold cursor-pointer">
                                                    <ShieldCheck className="w-4 h-4 text-red-600" />
                                                    Set as ADMIN
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "TEACHER")} className="gap-2 rounded-lg py-2 font-bold cursor-pointer">
                                                    <UserIcon className="w-4 h-4 text-purple-600" />
                                                    Set as TEACHER
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "STUDENT")} className="gap-2 rounded-lg py-2 font-bold cursor-pointer">
                                                    <GraduationCap className="w-4 h-4 text-blue-600" />
                                                    Set as STUDENT
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    onClick={() => handleDelete(user.id)}
                                                    className="gap-2 rounded-lg py-2 font-bold text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium">ไม่พบผู้ใช้ที่ค้นหา</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
