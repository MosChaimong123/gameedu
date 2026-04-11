"use client";

import { Ear, EarOff, Volume2, VolumeX, Waves, WavesLadder } from "lucide-react";

import { useAccessibility } from "@/components/providers/accessibility-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSound } from "@/hooks/use-sound";

type AccessibilityControlPanelProps = {
  className?: string;
};

export function AccessibilityControlPanel({
  className,
}: AccessibilityControlPanelProps) {
  const { reducedMotion, reducedSound, toggleReducedMotion, toggleReducedSound } =
    useAccessibility();
  const { isMuted, toggleMute } = useSound();

  return (
    <Card
      className={[
        "overflow-hidden rounded-[2rem] border-white/60 bg-white/65 shadow-xl backdrop-blur-xl",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="rounded-full border-none bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Accessibility
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white/80 text-[10px] font-bold text-slate-500"
              >
                ทั้งระบบ
              </Badge>
            </div>
            <h3 className="text-lg font-black text-slate-800">การแสดงผลและเสียงแบบสบายตา</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              ปรับ motion และเสียงของระบบ RPG ได้จากที่เดียว ค่านี้จะถูกจดจำไว้กับโปรไฟล์ผู้ใช้ด้วย
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={toggleReducedMotion}
              className="h-auto min-w-[170px] justify-start gap-3 rounded-2xl border-slate-200 bg-white/85 px-4 py-3 text-left shadow-sm hover:bg-white"
              aria-pressed={reducedMotion}
              suppressHydrationWarning
            >
              {reducedMotion ? (
                <WavesLadder className="h-4 w-4 text-amber-600" />
              ) : (
                <Waves className="h-4 w-4 text-sky-600" />
              )}
              <div>
                <div className="text-xs font-black text-slate-800">
                  {reducedMotion ? "Motion ต่ำ" : "Motion ปกติ"}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {reducedMotion ? "ลดการเคลื่อนไหวทั่วระบบ" : "แสดงแอนิเมชันตามปกติ"}
                </div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={toggleReducedSound}
              className="h-auto min-w-[170px] justify-start gap-3 rounded-2xl border-slate-200 bg-white/85 px-4 py-3 text-left shadow-sm hover:bg-white"
              aria-pressed={reducedSound}
              suppressHydrationWarning
            >
              {reducedSound ? (
                <EarOff className="h-4 w-4 text-rose-600" />
              ) : (
                <Ear className="h-4 w-4 text-emerald-600" />
              )}
              <div>
                <div className="text-xs font-black text-slate-800">
                  {reducedSound ? "Sound เบา" : "Sound ปกติ"}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {reducedSound ? "ลดระดับเสียงและความถี่เอฟเฟกต์" : "เปิดเอฟเฟกต์เสียงตามปกติ"}
                </div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={toggleMute}
              className="h-auto min-w-[170px] justify-start gap-3 rounded-2xl border-slate-200 bg-white/85 px-4 py-3 text-left shadow-sm hover:bg-white"
              aria-pressed={isMuted}
              suppressHydrationWarning
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-slate-600" />
              ) : (
                <Volume2 className="h-4 w-4 text-violet-600" />
              )}
              <div>
                <div className="text-xs font-black text-slate-800">
                  {isMuted ? "ปิดเสียงทั้งหมด" : "เสียงหลักเปิดอยู่"}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {isMuted ? "mute ทุกเสียงทันที" : "ใช้เป็นตัวควบคุมหลักของทั้งแอป"}
                </div>
              </div>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
