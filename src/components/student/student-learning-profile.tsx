"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Camera, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { useLanguage } from "@/components/providers/language-provider";

type StudentLearningProfileProps = {
  studentId: string;
  classId: string;
  loginCode: string;
  initialAvatar: string;
  name: string;
  nickname?: string | null;
  academicPoints: number;
  behaviorPoints: number;
  totalPositive: number;
  totalNegative: number;
};

function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function StudentLearningProfile({
  studentId,
  classId,
  loginCode,
  initialAvatar,
  name,
  nickname,
  academicPoints,
  behaviorPoints,
  totalPositive,
  totalNegative,
}: StudentLearningProfileProps) {
  const { t } = useLanguage();
  const [avatar, setAvatar] = useState(initialAvatar);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center bg-slate-50 px-5 py-7 text-center">
        <div className="group relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
          <Image
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
            alt={name}
            fill
            sizes="128px"
            className="object-contain p-3"
            priority
          />
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="absolute inset-0 flex items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={t("avatarChangeButton")}
          >
            <Camera className="h-7 w-7 text-white" />
          </button>
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-900">{name}</h1>
        {nickname ? <p className="mt-1 text-sm font-semibold text-slate-500">{nickname}</p> : null}
      </div>

      <div className="space-y-3 border-t border-slate-100 p-4">
        <section className="rounded-[18px] border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-blue-900">
              <BookOpen className="h-4 w-4" />
              {t("avatarAcademicTitle")}
            </div>
            <span className="text-xl font-black tabular-nums text-blue-700">
              {formatScore(academicPoints)}
            </span>
          </div>
        </section>

        <section className="rounded-[18px] border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-amber-950">
              <Zap className="h-4 w-4" />
              {t("avatarBehaviorTitle")}
            </div>
            <span className="text-xl font-black tabular-nums text-amber-800">{behaviorPoints}</span>
          </div>
          {(totalPositive > 0 || totalNegative > 0) && (
            <div className="mt-3 flex flex-wrap gap-3 border-t border-amber-200/70 pt-3 text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" /> +{totalPositive}
              </span>
              <span className="inline-flex items-center gap-1 text-red-600">
                <TrendingDown className="h-3.5 w-3.5" /> -{totalNegative}
              </span>
            </div>
          )}
        </section>
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
    </div>
  );
}
