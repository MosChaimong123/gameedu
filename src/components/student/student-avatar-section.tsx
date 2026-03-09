"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Camera } from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { type RankEntry } from "@/lib/classroom-utils";

interface StudentAvatarSectionProps {
    studentId: string;
    classId: string;
    loginCode: string;
    initialAvatar: string;
    name: string;
    nickname?: string | null;
    points: number;
    behaviorPoints: number;
    rankEntry: RankEntry;
    totalPositive: number;
    totalNegative: number;
    themeClass: string;
    themeStyle: React.CSSProperties;
}

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar,
    name, nickname, points, behaviorPoints, rankEntry,
    totalPositive, totalNegative,
    themeClass, themeStyle
}: StudentAvatarSectionProps) {
    const [avatar, setAvatar] = useState(initialAvatar);
    const [showPicker, setShowPicker] = useState(false);

    return (
        <>
            <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
                {/* Avatar / Rank Card Hero */}
                <div className={`p-6 flex flex-col items-center relative gap-4 ${themeClass}`} style={themeStyle}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent)]" />

                    {/* Rank Card / Avatar Container */}
                    <div className="relative z-10 w-full flex justify-center">
                        {rankEntry.icon?.startsWith('data:image') || rankEntry.icon?.startsWith('http') ? (
                            <div className="relative group">
                                {/* The Rank Card */}
                                <div className="w-48 h-64 rounded-2xl border-4 border-white/40 shadow-2xl overflow-hidden bg-white/10 backdrop-blur-md relative transform group-hover:scale-[1.02] transition-transform duration-500">
                                    <img 
                                        src={rankEntry.icon} 
                                        alt={rankEntry.name} 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                </div>

                                {/* Student Avatar Overlay */}
                                <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-xl border-2 border-white shadow-lg overflow-hidden bg-white z-20">
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                        alt={name}
                                        width={64}
                                        height={64}
                                    />
                                    {/* Change avatar button */}
                                    <button
                                        onClick={() => setShowPicker(true)}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                    >
                                        <Camera className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Standard Large Avatar if no rank card */
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl border-4 border-white/30 shadow-xl overflow-hidden bg-white/10 backdrop-blur-sm transform group-hover:scale-[1.05] transition-transform duration-500">
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                        alt={name}
                                        width={128}
                                        height={128}
                                    />
                                </div>
                                {/* Change avatar button */}
                                <button
                                    onClick={() => setShowPicker(true)}
                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border border-indigo-200 flex items-center gap-1 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                                >
                                    <Camera className="w-3 h-3" /> เปลี่ยนชุด
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 pt-7 text-center space-y-4">
                    {/* Rank badge */}
                    <div 
                        className="inline-flex items-center gap-1.5 bg-white border rounded-full px-4 py-1.5 text-sm font-bold shadow-sm"
                        style={{ borderColor: rankEntry.color || "#eab308", color: rankEntry.color || "#a16207" }}
                    >
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {(rankEntry.icon?.startsWith('data:image') || rankEntry.icon?.startsWith('http')) ? (
                                <img src={rankEntry.icon} alt={rankEntry.name} className="w-full h-full object-contain" />
                            ) : (
                                <Star 
                                    className="w-4 h-4" 
                                    style={{ fill: rankEntry.color || "#facc15", color: rankEntry.color || "#facc15" }} 
                                />
                            )}
                        </div>
                        {rankEntry.name}
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-slate-800 leading-tight">{name}</h1>
                        {nickname && <p className="text-slate-400 text-sm mt-0.5">"{nickname}"</p>}
                    </div>

                    {/* Points Breakdown */}
                    <div className={`rounded-2xl p-4 text-white shadow-lg ${themeClass}`} style={themeStyle}>
                        <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest mb-1">คะแนนยศ (คะแนนเก็บ)</p>
                        <p className="text-5xl font-black mb-3">{points}</p>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/20">
                            <div className="text-center">
                                <p className="text-[10px] text-white/60 mb-0.5">คะแนนพฤติกรรม</p>
                                <p className="font-bold text-sm">{behaviorPoints}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-white/60 mb-0.5">คะแนนเก็บภารกิจ</p>
                                <p className="font-bold text-sm">{points}</p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-3 pt-2 text-[10px] text-white/70">
                            <span>✅ +{totalPositive}</span>
                            <span>❌ -{Math.abs(totalNegative)}</span>
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
