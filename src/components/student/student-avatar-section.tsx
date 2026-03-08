"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Camera } from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";

interface StudentAvatarSectionProps {
    studentId: string;
    classId: string;
    loginCode: string;
    initialAvatar: string;
    name: string;
    nickname?: string | null;
    points: number;
    rank: string;
    totalPositive: number;
    totalNegative: number;
    themeClass: string;
    themeStyle: React.CSSProperties;
}

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar,
    name, nickname, points, rank,
    totalPositive, totalNegative,
    themeClass, themeStyle
}: StudentAvatarSectionProps) {
    const [avatar, setAvatar] = useState(initialAvatar);
    const [showPicker, setShowPicker] = useState(false);

    return (
        <>
            <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
                {/* Avatar Hero */}
                <div className={`p-8 flex justify-center relative ${themeClass}`} style={themeStyle}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent)]" />

                    <div className="relative z-10">
                        <div className="w-32 h-32 rounded-2xl border-4 border-white/30 shadow-xl overflow-hidden bg-white/10 backdrop-blur-sm">
                            <Image
                                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                alt={name}
                                width={128}
                                height={128}
                                className="hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                        {/* Change avatar button */}
                        <button
                            onClick={() => setShowPicker(true)}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-indigo-600 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-indigo-200 flex items-center gap-1 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                        >
                            <Camera className="w-3 h-3" /> เปลี่ยน
                        </button>
                    </div>
                </div>

                <div className="p-5 pt-7 text-center space-y-4">
                    {/* Rank badge */}
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {rank}
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-slate-800 leading-tight">{name}</h1>
                        {nickname && <p className="text-slate-400 text-sm mt-0.5">"{nickname}"</p>}
                    </div>

                    {/* Points */}
                    <div className={`rounded-2xl p-4 text-white ${themeClass}`} style={themeStyle}>
                        <p className="text-white/70 text-xs uppercase tracking-wide">คะแนนรวม</p>
                        <p className="text-4xl font-black">{points}</p>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-white/80">
                            <span>✅ ได้รับ {totalPositive}</span>
                            <span>❌ หัก {totalNegative}</span>
                        </div>
                    </div>
                </div>
            </div>

            <AvatarPickerModal
                open={showPicker}
                onOpenChange={setShowPicker}
                classId={classId}
                studentId={studentId}
                loginCode={loginCode}
                currentAvatar={avatar}
                onSaved={setAvatar}
            />
        </>
    );
}
