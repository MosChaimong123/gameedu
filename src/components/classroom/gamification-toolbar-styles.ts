import { cn } from "@/lib/utils";

/**
 * ปุ่มแถว Gamification ใน classroom toolbar (ยศ / Event / Negamon)
 * — โทน candy: brand-pink ทึบ
 */
export const gamificationToolbarButtonClassName = cn(
    "h-9 min-h-[44px] rounded-full border-0",
    "!bg-brand-pink !text-white",
    "px-3 text-sm font-semibold leading-normal",
    "shadow-md shadow-brand-pink/30",
    "transition-all hover:brightness-110 hover:shadow-lg hover:shadow-brand-cyan/35",
    "active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100",
    "data-[state=open]:brightness-110 data-[state=open]:shadow-lg data-[state=open]:ring-2 data-[state=open]:ring-white/45",
    "touch-manipulation lg:h-8 lg:min-h-0"
);

/**
 * Radix TabsTrigger แบบแท็บที่เลือกแล้ว — brand-pink ทึบ
 */
export const brandPurpleTabActiveCn = cn(
    "data-[state=active]:!bg-brand-pink",
    "data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-brand-pink/30",
    "data-[state=active]:border-transparent data-[state=active]:font-bold"
);
