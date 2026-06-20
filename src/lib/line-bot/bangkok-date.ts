/**
 * Bangkok UTC+7 date helpers shared across the LINE reminder pipeline.
 *
 * Used by:
 *   - auto-reminders.ts   (real cron dispatch)
 *   - dry-run.ts          (candidate computation / test-run)
 *   - delivery-contract.ts (next-run calculation)
 */

export function getBangkokDateParts(date: Date): { year: number; month: number; day: number } {
    const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return { year: bkk.getUTCFullYear(), month: bkk.getUTCMonth() + 1, day: bkk.getUTCDate() };
}

export function bangkokDateKey(date: Date): string {
    const p = getBangkokDateParts(date);
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function bangkokWeekKey(date: Date): string {
    const p = getBangkokDateParts(date);
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
    // Shift to nearest Thursday so the week belongs to the correct ISO year
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isBangkokMonday(date: Date): boolean {
    const p = getBangkokDateParts(date);
    return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() === 1;
}

export function diffBangkokCalendarDays(target: Date, base: Date): number {
    const tp = getBangkokDateParts(target);
    const bp = getBangkokDateParts(base);
    const tDay = Date.UTC(tp.year, tp.month - 1, tp.day);
    const bDay = Date.UTC(bp.year, bp.month - 1, bp.day);
    return Math.round((tDay - bDay) / (24 * 60 * 60 * 1000));
}

/**
 * Returns the estimated next cron fire time in Bangkok time.
 *
 * Reads LINE_REMINDER_CRON_HOUR (Bangkok hour, default 8) from env.
 * If the cron hour today (Bangkok) has already passed, returns tomorrow.
 */
export function getNextCronRunAt(now: Date): Date {
    const cronHour = Math.min(
        Math.max(Number(process.env.LINE_REMINDER_CRON_HOUR ?? "8"), 0),
        23
    );
    const p = getBangkokDateParts(now);
    // Cron fire time today in Bangkok
    const todayFire = new Date(
        Date.UTC(p.year, p.month - 1, p.day, cronHour - 7, 0, 0, 0) // subtract 7 to get UTC
    );
    // If we're already past it, return tomorrow's fire
    if (now >= todayFire) {
        return new Date(todayFire.getTime() + 24 * 60 * 60 * 1000);
    }
    return todayFire;
}
