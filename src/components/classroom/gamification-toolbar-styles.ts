import { cn } from "@/lib/utils";

/**
 * ปุ่มแถว Gamification ใน classroom toolbar (ยศ / Event / Negamon)
 * — โทนเดียวกับปุ่ม CTA หัวเว็บ GameEdu: purple-500 → violet-600 (#a855f7 → #7c3aed)
 */
export const gamificationToolbarButtonClassName = cn(
    "h-9 min-h-[44px] rounded-full border-0",
    "!bg-gradient-to-r from-purple-500 to-violet-600 !text-white",
    "px-3 text-sm font-semibold leading-normal",
    "shadow-md shadow-purple-500/35",
    "transition-all hover:brightness-110 hover:shadow-lg hover:shadow-purple-500/45",
    "active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100",
    "data-[state=open]:brightness-110 data-[state=open]:shadow-lg data-[state=open]:ring-2 data-[state=open]:ring-white/45",
    "touch-manipulation lg:h-8 lg:min-h-0"
);

/**
 * Radix TabsTrigger แบบแท็บที่เลือกแล้ว — gradient เดียวกับแบรนด์ GameEdu
 */
export const brandPurpleTabActiveCn = cn(
    "data-[state=active]:!bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600",
    "data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/35",
    "data-[state=active]:border-transparent data-[state=active]:font-bold"
);
